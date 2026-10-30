import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import yaml from 'js-yaml';
import { assertMaishiftTrackCoverage, MAISHIFT_CATALOG_DRIFT } from './maishift-catalog-fallback.mjs';
import { refreshMaishiftRecords } from './refresh-maishift-records.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const drift = () => Object.assign(new Error('Catalog is behind the public track set.'), { code: MAISHIFT_CATALOG_DRIFT });
const quiet = () => {};

test('coverage mismatch remains a hard, typed failure rather than dropping new charts', () => {
	assert.doesNotThrow(() => assertMaishiftTrackCoverage(6084, 6084));
	assert.throws(() => assertMaishiftTrackCoverage(6060, 6084), {
		code: MAISHIFT_CATALOG_DRIFT,
		message: 'Maishift track coverage mismatch: 6060 !== 6084',
	});
	assert.match(read('./sync-maishift-records.mjs'), /assertMaishiftTrackCoverage\(mappedTracks.length, recordsData.tracks.length\)/);
});

test('ordinary record refresh imports once without contacting catalog sources', async () => {
	const calls = [];
	const result = await refreshMaishiftRecords({
		importRecords: async () => { calls.push('records'); },
		rebuildCatalog: () => assert.fail('Catalog should not refresh.'),
		retryImport: () => assert.fail('Records should not retry.'),
		log: quiet,
	});
	assert.deepEqual(calls, ['records']);
	assert.deepEqual(result, { catalogRefreshed: false });
});

test('catalog drift rebuilds through the existing pipeline before exactly one fresh import', async () => {
	const calls = [];
	const result = await refreshMaishiftRecords({
		importRecords: async () => { calls.push('records'); throw drift(); },
		rebuildCatalog: async () => { calls.push('catalog'); },
		retryImport: async () => { calls.push('retry'); },
		log: quiet,
	});
	assert.deepEqual(calls, ['records', 'catalog', 'retry']);
	assert.deepEqual(result, { catalogRefreshed: true });
});

test('network, access, serialization and ambiguous-mapping errors do not trigger catalog recovery', async () => {
	for (const message of ['Request failed: 503', 'Past records are not public.', 'Unsupported Maishift serialization type: 25', 'Could not resolve 2 Maishift tracks']) {
		const failure = new Error(message);
		await assert.rejects(refreshMaishiftRecords({
			importRecords: async () => { throw failure; },
			rebuildCatalog: () => assert.fail('Unrelated errors must not rebuild the catalog.'),
			retryImport: () => assert.fail('Unrelated errors must not retry.'),
			log: quiet,
		}), (error) => error === failure);
	}
});

test('failed catalog validation prevents a second import and preserves the failure', async () => {
	const failure = new Error('Candidate catalog validation failed.');
	await assert.rejects(refreshMaishiftRecords({
		importRecords: async () => { throw drift(); },
		rebuildCatalog: async () => { throw failure; },
		retryImport: () => assert.fail('An invalid catalog must not be used.'),
		log: quiet,
	}), (error) => error === failure);
});

test('a second coverage failure does not loop or report success', async () => {
	let rebuilds = 0;
	let retries = 0;
	const failure = drift();
	await assert.rejects(refreshMaishiftRecords({
		importRecords: async () => { throw drift(); },
		rebuildCatalog: async () => { rebuilds += 1; },
		retryImport: async () => { retries += 1; throw failure; },
		log: quiet,
	}), (error) => error === failure);
	assert.equal(rebuilds, 1);
	assert.equal(retries, 1);
});

test('only normal record refresh uses recovery; catalog pinning cannot recursively invoke it', () => {
	const scripts = JSON.parse(read('../package.json')).scripts;
	assert.equal(scripts['sync:records'], 'node scripts/refresh-maishift-records.mjs');
	for (const name of ['pin:circle-plus', 'pin:circle-plus:candidate']) {
		assert.match(scripts[name], /^node scripts\/sync-maishift-records.mjs /);
	}
	const runner = read('./refresh-maishift-records.mjs');
	assert.match(runner, /\['run', 'refresh:catalog'\]/);
	assert.match(runner, /runNode\(fileURLToPath\(new URL\('\.\/sync-maishift-records.mjs'/);
	assert.doesNotMatch(runner, /shell: true|service_role|setInterval/);
});

test('refresh workflow validates before committing and includes recovered catalog and jacket files', () => {
	const workflow = yaml.load(read('../.github/workflows/refresh-records.yml'));
	const steps = workflow.jobs.refresh.steps;
	const names = steps.map((step) => step.name);
	const detect = steps.find((step) => step.id === 'data');
	const commit = steps.find((step) => step.id === 'commit');
	assert.equal(steps.find((step) => step.name === 'Import Maishift records').run, 'npm run sync:records');
	for (const path of ['src/data/circle-plus.generated.json', 'src/data/maimai.generated.json', 'src/data/maishift.generated.json', 'src/data/jackets.generated.json', 'public/assets/maimai/jackets']) {
		assert.ok(detect.run.includes(path), `Detect missing ${path}`);
		assert.ok(commit.run.includes(path), `Commit missing ${path}`);
	}
	assert.ok(names.indexOf('Test') < names.indexOf('Build'));
	assert.ok(names.indexOf('Build') < names.indexOf('Commit refreshed records'));
	assert.equal(commit.if, "steps.data.outputs.changed == 'true'");
	assert.match(detect.run, /changed=false/);
	assert.match(commit.run, /changed=true/);
	assert.match(workflow.jobs.deploy.if, /records_changed == 'true'/);
	assert.equal(workflow.on.schedule, undefined);
});
