import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { catalogArtworkUrl } from './catalog-artwork.mjs';
import { addMaishiftCatalogFallbacks } from './maishift-catalog-fallback.mjs';

const brokenUrl = 'https://maimaidx-eng.com/maimai-mobile/img/Music/360427dd3d2c96ca.png';
const mirrorUrl = 'https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover/ed2b18829927219282dd0047513bbbbcfc7099d7bbd90cc7e6eb4c4be467fc43.png';

test('artwork override matches both title and artist without changing other jackets', () => {
	assert.equal(catalogArtworkUrl(' OV3RCLOCK ', 'Alicemetix ', brokenUrl), mirrorUrl);
	assert.equal(catalogArtworkUrl('Another Song', 'Alicemetix', brokenUrl), brokenUrl);
	assert.equal(catalogArtworkUrl('OV3RCLOCK', 'Another Artist', brokenUrl), brokenUrl);
});

test('Maishift-only new songs retain a working jacket during future catalog refreshes', () => {
	const catalog = { versions: [{ id: 'circle-plus', order: 27 }], songs: [], charts: [] };
	addMaishiftCatalogFallbacks(catalog, {
		songs: [{ title: 'OV3RCLOCK', artist: 'Alicemetix', type: 'DX', songVersion: 26, genre: 'UNKNOWN', jacketUrl: brokenUrl }],
		tracks: [{ s: 0, i: 18942, d: 'BASIC', l: 60 }],
	});
	assert.equal(catalog.songs[0].id, 'maishift-18942');
	assert.equal(catalog.songs[0].artworkUrl, mirrorUrl);
});

test('generated and pinned catalog jackets stay aligned with the shared override', () => {
	const catalog = JSON.parse(readFileSync(new URL('../src/data/maimai.generated.json', import.meta.url), 'utf8'));
	const pinned = JSON.parse(readFileSync(new URL('../src/data/circle-plus.generated.json', import.meta.url), 'utf8'));
	const song = catalog.songs.find((song) => song.title === 'OV3RCLOCK' && song.artist === 'Alicemetix');
	assert.equal(song.artworkUrl, mirrorUrl);
	const pinnedSong = pinned.songs.find((entry) => entry.songId === song.id);
	assert.ok(pinnedSong);
	if (pinnedSong.fallbackMetadata) assert.equal(pinnedSong.fallbackMetadata.artworkUrl, mirrorUrl);
	const sync = readFileSync(new URL('./sync-maimai-catalog.mjs', import.meta.url), 'utf8');
	assert.match(sync, /artworkUrl: catalogArtworkUrl\(music\.title, music\.artist, coverUrl\(music\.id\)\)/);
	assert.match(sync, /artworkUrl: catalogArtworkUrl\(metadata\.title, metadata\.artist, metadata\.artworkUrl\)/);
});
