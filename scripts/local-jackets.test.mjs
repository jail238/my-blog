import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { isJacketFile, withLocalJackets } from '../src/utils/local-jackets.js';
import { syncSongJackets } from './sync-song-jackets.mjs';
import { checkSongJackets } from './check-song-jackets.mjs';

const sourceUrl = 'https://images.example/jacket.png';
const hash = 'a'.repeat(64);
const entry = { sourceUrl, file: `aa/${hash}.webp` };
const song = { id: 'one', title: 'Example', artist: 'Artist', artworkUrl: sourceUrl };

async function fixture(songs = [song]) {
	const root = await mkdtemp(resolve(tmpdir(), 'msk-jackets-'));
	await mkdir(resolve(root, 'src/data'), { recursive: true });
	await writeFile(resolve(root, 'src/data/maimai.generated.json'), JSON.stringify({ songs }));
	const png = await sharp({ create: { width: 48, height: 64, channels: 4, background: { r: 100, g: 170, b: 220, alpha: 0.7 } } }).png().toBuffer();
	const options = { root, requestIntervalMs: 0, fetchImpl: async () => new Response(png, { headers: { 'content-type': 'image/png' } }) };
	return { root, png, options, manifest: async () => JSON.parse(await readFile(resolve(root, 'src/data/jackets.generated.json'), 'utf8')) };
}

test('all song artwork uses same-origin paths and preserves catalog identities and fields', () => {
	const manifest = { version: 1, jackets: { one: entry } };
	assert.deepEqual(withLocalJackets([song], manifest), [{ ...song, artworkUrl: `/assets/maimai/jackets/${entry.file}` }]);
	assert.equal(withLocalJackets([song], manifest, '/archive/')[0].artworkUrl, `/archive/assets/maimai/jackets/${entry.file}`);
	assert.equal(song.artworkUrl, sourceUrl);
});

test('missing, stale and unsafe jacket entries cannot silently fall back to external hosts', () => {
	assert.throws(() => withLocalJackets([song], { version: 1, jackets: {} }), /Missing or outdated/);
	assert.throws(() => withLocalJackets([song], { version: 1, jackets: { one: { ...entry, sourceUrl: 'https://other.example/a.png' } } }), /Missing or outdated/);
	for (const file of ['../outside.webp', 'https://external.example/a.webp', `bb/${hash}.webp`, 'a.webp']) {
		assert.equal(isJacketFile(file), false);
		assert.throws(() => withLocalJackets([song], { version: 1, jackets: { one: { ...entry, file } } }), /Missing or outdated/);
	}
});

test('downloaded jackets retain every pixel and original dimensions in content-addressed WebP', async () => {
	const f = await fixture();
	assert.deepEqual(await syncSongJackets(f.options), { total: 1, downloaded: 1, reused: 0 });
	const manifest = await f.manifest();
	const jacket = manifest.jackets.one;
	assert.equal(jacket.width, 48);
	assert.equal(jacket.height, 64);
	const bytes = await readFile(resolve(f.root, 'public/assets/maimai/jackets', jacket.file));
	assert.equal(createHash('sha256').update(bytes).digest('hex'), jacket.sha256);
	assert.deepEqual(await sharp(bytes).raw().toBuffer(), await sharp(f.png).raw().toBuffer());
	assert.deepEqual(await checkSongJackets(f.root), { songs: 1, files: 1, bytes: bytes.length });
});

test('multiple songs sharing an upstream jacket make only one download', async () => {
	const f = await fixture([song, { ...song, id: 'two' }]);
	let requests = 0;
	const result = await syncSongJackets({ ...f.options, fetchImpl: async (...args) => { requests += 1; return f.options.fetchImpl(...args); } });
	assert.equal(requests, 1);
	assert.equal(result.downloaded, 1);
	const manifest = await f.manifest();
	assert.equal(manifest.jackets.one.file, manifest.jackets.two.file);
});

test('a complete cache needs no network and leaves the manifest byte-for-byte unchanged', async () => {
	const f = await fixture();
	await syncSongJackets(f.options);
	const before = await readFile(resolve(f.root, 'src/data/jackets.generated.json'), 'utf8');
	assert.deepEqual(await syncSongJackets({ ...f.options, fetchImpl: () => { throw new Error('Network should not be used'); } }), { total: 1, downloaded: 0, reused: 1 });
	assert.equal(await readFile(resolve(f.root, 'src/data/jackets.generated.json'), 'utf8'), before);
});

test('a corrupt checked-in jacket fails offline validation and is repaired during sync', async () => {
	const f = await fixture();
	await syncSongJackets(f.options);
	const entry = (await f.manifest()).jackets.one;
	await writeFile(resolve(f.root, 'public/assets/maimai/jackets', entry.file), 'corrupt');
	await assert.rejects(checkSongJackets(f.root));
	assert.equal((await syncSongJackets(f.options)).downloaded, 1);
	await checkSongJackets(f.root);
});

test('failed source changes preserve the prior image, retry finitely and block publication', async () => {
	const f = await fixture();
	await syncSongJackets(f.options);
	const before = await f.manifest();
	const path = resolve(f.root, 'public/assets/maimai/jackets', before.jackets.one.file);
	const bytes = await readFile(path);
	await writeFile(resolve(f.root, 'src/data/maimai.generated.json'), JSON.stringify({ songs: [{ ...song, artworkUrl: 'https://images.example/changed.png' }] }));
	let attempts = 0;
	await assert.rejects(syncSongJackets({ ...f.options, fetchImpl: async () => { attempts += 1; return new Response('unavailable', { status: 503 }); } }), /Could not cache 1 jackets/);
	assert.equal(attempts, 3);
	assert.deepEqual(await f.manifest(), before);
	assert.deepEqual(await readFile(path), bytes);
	await assert.rejects(checkSongJackets(f.root), /Missing or outdated/);
});

test('HTML masquerading as a jacket is rejected and never replaces a cached image', async () => {
	const f = await fixture();
	await assert.rejects(syncSongJackets({ ...f.options, fetchImpl: async () => new Response('<html>error</html>', { headers: { 'content-type': 'image/png' } }) }), /Could not cache 1 jackets/);
	assert.deepEqual((await f.manifest()).jackets, {});
});

test('every catalog song has a verified committed jacket without accessing the network', async () => {
	const reused = await syncSongJackets({ fetchImpl: () => { throw new Error('Full-cache verification must stay offline'); } });
	const result = await checkSongJackets();
	const catalog = JSON.parse(await readFile(new URL('../src/data/maimai.generated.json', import.meta.url), 'utf8'));
	assert.equal(result.songs, catalog.songs.length);
	assert.deepEqual(reused, { total: catalog.songs.length, downloaded: 0, reused: catalog.songs.length });
	assert.ok(result.files > 0);
	assert.ok(result.bytes < 1024 ** 3);
});

test('build validation and weekly commits include local jackets but do not redownload during ordinary builds', async () => {
	const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
	assert.equal(packageJson.scripts.prebuild, 'npm run check:jackets');
	assert.ok(packageJson.scripts['refresh:catalog'].endsWith('&& npm run sync:jackets'));
	assert.doesNotMatch(packageJson.scripts.build, /sync:jackets/);
	const workflow = await readFile(new URL('../.github/workflows/refresh-catalog.yml', import.meta.url), 'utf8');
	for (const file of ['src/data/jackets.generated.json', 'public/assets/maimai/jackets']) assert.equal(workflow.split(file).length - 1, 2);
	const data = await readFile(new URL('../src/data/maimai.ts', import.meta.url), 'utf8');
	assert.match(data, /SONGS: Song\[\] = withLocalJackets\(generatedCatalog\.songs, jacketsData, import\.meta\.env\.BASE_URL\)/);
});
