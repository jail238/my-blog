import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAISHIFT_CATALOG_DRIFT } from './maishift-catalog-fallback.mjs';

function runNode(script, args = []) {
	const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`Record sync recovery failed (${result.status ?? result.signal}).`);
}

function refreshCatalog() {
	if (!process.env.npm_execpath) throw new Error('Run record sync with npm run sync:records.');
	runNode(process.env.npm_execpath, ['run', 'refresh:catalog']);
}

function retryRecords() {
	// A failed module import is cached; retry against the new catalog in a fresh process.
	runNode(fileURLToPath(new URL('./sync-maishift-records.mjs', import.meta.url)));
}

export async function refreshMaishiftRecords({
	importRecords = () => import('./sync-maishift-records.mjs'),
	rebuildCatalog = refreshCatalog,
	retryImport = retryRecords,
	log = console.log,
} = {}) {
	try {
		await importRecords();
		return { catalogRefreshed: false };
	} catch (error) {
		if (error?.code !== MAISHIFT_CATALOG_DRIFT) throw error;
	}

	log('Maishift chart coverage changed. Refreshing and validating the catalog before one retry.');
	await rebuildCatalog();
	await retryImport();
	return { catalogRefreshed: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		await refreshMaishiftRecords();
	} catch (error) {
		console.error(error);
		process.exitCode = 1;
	}
}
