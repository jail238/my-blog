import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import yaml from 'js-yaml';
import { CatalogIdentities, reconcileCatalogRoster, validateCatalogTransition, archivedCatalogRecords } from './catalog-reconciliation.mjs';
import { annotatePerfectAchievementTimes } from './perfect-achievement-history.mjs';

const song = { id: 'maishift-100', sourceId: 100, title: 'Example', artist: 'Artist', genre: 'maimai', artworkUrl: 'cover.png' };
const chart = { id: 'maishift-100-dx-basic', songId: song.id, type: 'DX', difficulty: 'BASIC', versionId: 'circle-plus', level: '6', constant: 6 };
const catalog = () => ({ songs: [{ ...song }], charts: [{ ...chart }], versions: [{ id: 'circle-plus', order: 27 }] });
const source = () => ({
	songs: [{ title: song.title, artist: song.artist, type: 'DX', songVersion: 26, genre: 'MAIMAI', jacketUrl: 'cover.png' }],
	tracks: [{ s: 0, i: 100, d: 'BASIC', l: 60 }],
});

test('a fallback song promoted to SaltMeta keeps permanent song, chart and video keys', () => {
	const ids = new CatalogIdentities(catalog());
	assert.equal(ids.saltSong({ id: 2024, title: song.title, artist: song.artist }), song.id);
	const reload = new CatalogIdentities({ songs: [{ ...song, sourceId: 2024 }] }, JSON.parse(JSON.stringify(ids)));
	assert.equal(reload.saltSong({ id: 2024, title: song.title, artist: song.artist }), song.id);
	const c = catalog();
	reconcileCatalogRoster(c, source(), reload);
	assert.equal(c.charts[0].id, chart.id);
	assert.equal(c.songs[0].id, song.id);
});

test('explicit source aliases preserve IDs through later title or credit changes', () => {
	const ids = new CatalogIdentities(catalog());
	ids.saltSong({ id: 2024, title: song.title, artist: song.artist });
	assert.equal(ids.saltSong({ id: 2024, title: 'Renamed', artist: 'Updated credit' }), song.id);
	assert.equal(ids.maishiftSong(source().songs[0], source().tracks), song.id);
	const loaded = new CatalogIdentities({ songs: [] }, ids.toJSON());
	assert.equal(loaded.maishiftSong({ ...source().songs[0], title: 'Another name' }, source().tracks), song.id);
});

test('new songs and charts are added while obsolete charts are removed from the active roster', () => {
	const c = catalog();
	c.charts.push({ ...chart, id: 'maishift-100-dx-master', difficulty: 'MASTER' });
	c.songs.push({ id: '50', sourceId: 50, title: 'Retired', artist: 'Other' });
	c.charts.push({ ...chart, id: '50-dx-basic', songId: '50' });
	const previous = structuredClone(c);
	const ids = new CatalogIdentities(c);
	const data = source();
	data.songs.push({ ...data.songs[0], title: 'New song', artist: 'New artist' });
	data.tracks.push({ s: 1, i: 200, d: 'BASIC', l: 70 });
	reconcileCatalogRoster(c, data, ids);
	assert.deepEqual(c.songs.map((s) => s.id), [song.id, 'maishift-200']);
	assert.deepEqual(c.charts.map((c) => c.id), [chart.id, 'maishift-200-dx-basic']);
	assert.deepEqual(validateCatalogTransition(previous, c), { addedSongs: 1, addedCharts: 1, removedSongs: 1, removedCharts: 2 });
	reconcileCatalogRoster(c, data, ids);
	assert.equal(c.charts.length, 2);
});

test('retired songs can return with their original IDs instead of receiving new URLs', () => {
	const ids = new CatalogIdentities(catalog());
	ids.saltSong({ id: 2024, title: song.title, artist: song.artist });
	const c = { ...catalog(), songs: [], charts: [] };
	const reloaded = new CatalogIdentities(c, ids.toJSON());
	assert.equal(reloaded.saltSong({ id: 9000, title: song.title, artist: song.artist }), song.id);
	reconcileCatalogRoster(c, source(), reloaded);
	assert.equal(c.songs[0].id, song.id);
	assert.equal(c.charts[0].id, chart.id);
});

test('unrelated artists and ambiguous or conflicting source identities cannot merge silently', () => {
	const ids = new CatalogIdentities(catalog());
	assert.equal(ids.saltSong({ id: 2025, title: song.title, artist: 'Other artist' }), '2025');
	assert.throws(() => ids.maishiftSong({ title: song.title, artist: 'Unknown artist' }, [{ i: 888 }]), /Ambiguous/);
	assert.throws(() => ids.saltSong({ id: 2025, title: song.title, artist: song.artist }), /Conflicting/);
	assert.throws(() => new CatalogIdentities(null, { version: 999, songs: [] }), /Invalid/);
});

test('empty, duplicated, invalid or partially lost catalogs fail before publication', () => {
	for (const change of [
		(data) => { data.tracks = []; },
		(data) => { data.tracks.push({ ...data.tracks[0] }); },
		(data) => { data.tracks[0].s = 999; },
		(data) => { data.tracks[0].l = NaN; },
		(data) => { data.tracks[0].d = 'INVALID'; },
	]) {
		const data = source();
		change(data);
		assert.throws(() => reconcileCatalogRoster(catalog(), data, new CatalogIdentities(catalog())), /empty|Invalid/);
	}
	assert.throws(() => validateCatalogTransition(catalog(), { songs: [], charts: [] }), /empty/);
	const big = { songs: Array.from({ length: 200 }, (_, i) => ({ id: String(i) })), charts: [] };
	const lost = { songs: big.songs.slice(20), charts: [{ id: '20-dx-basic', songId: '20' }] };
	assert.throws(() => validateCatalogTransition(big, lost), /suspicious catalog loss/);
	assert.throws(() => validateCatalogTransition(null, { songs: [song], charts: [chart, chart] }), /duplicate/);
});

test('retired record milestones are retained and restored without changing first AP dates', () => {
	const record = { chartId: chart.id, maishiftTrackId: 100, combo: 'AP', perfectAchievedAt: '2026-10-01T00:00:00Z', apAchievedAt: '2026-10-01T00:00:00Z' };
	const archived = archivedCatalogRecords({ records: [record] }, []);
	assert.deepEqual(archived, [record]);
	assert.deepEqual(archivedCatalogRecords({ records: [], archivedRecords: archived }, []), archived);
	const restored = annotatePerfectAchievementTimes([{ chartId: chart.id, maishiftTrackId: 100, combo: 'AP' }], {
		previousRecords: archived, detectedAt: '2026-11-26T00:00:00Z', baselineAt: '2026-11-26T00:00:00Z',
	});
	assert.equal(restored[0].apAchievedAt, record.apAchievedAt);
	assert.deepEqual(archivedCatalogRecords({ archivedRecords: archived }, restored), []);
});

test('weekly and manual refresh workflows commit identities only after tests and builds', () => {
	for (const name of ['refresh-catalog', 'refresh-records']) {
		const workflow = yaml.load(readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8'));
		const steps = workflow.jobs.refresh.steps;
		const commit = steps.findIndex((s) => s.name.startsWith('Commit refreshed'));
		assert.ok(steps.findIndex((s) => s.name === 'Test') < commit);
		assert.ok(steps.findIndex((s) => s.name === 'Build') < commit);
		assert.match(steps[commit].run, /src\/data\/catalog-identities.generated.json/);
	}
});

test('the checked-in identity registry covers active songs and survives a no-change reload', () => {
	const c = JSON.parse(readFileSync(new URL('../src/data/maimai.generated.json', import.meta.url), 'utf8'));
	const stored = JSON.parse(readFileSync(new URL('../src/data/catalog-identities.generated.json', import.meta.url), 'utf8'));
	const ids = new CatalogIdentities(c, stored);
	assert.deepEqual(ids.toJSON(), stored);
	for (const s of c.songs) assert.ok(ids.entries.has(s.id), s.id);
	for (const chart of c.charts) assert.ok(chart.id.startsWith(`${chart.songId}-`), chart.id);
});
