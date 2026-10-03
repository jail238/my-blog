import assert from 'node:assert/strict';
import test from 'node:test';
import { addMaishiftCatalogFallbacks } from './maishift-catalog-fallback.mjs';

function fixture() {
	return {
		catalog: {
			versions: [{ id: 'circle-plus', order: 27 }],
			songs: [{ id: '10', sourceId: 10, title: 'Existing', artist: 'Artist' }],
			charts: [{ id: '10-dx-basic', songId: '10', type: 'DX', difficulty: 'BASIC' }],
		},
		recordsData: {
			songs: [
				{ title: 'Existing', artist: 'Alternate credit', type: 'DX', songVersion: 26, genre: 'POPS', jacketUrl: 'existing.png' },
				{ title: 'New Song', artist: 'New Artist', type: 'DX', songVersion: 26, genre: 'GAME', jacketUrl: 'new.png' },
			],
			tracks: [
				{ s: 0, i: 100, d: 'BASIC', l: 60 },
				{ s: 0, i: 101, d: 'MASTER', l: 148 },
				{ s: 1, i: 201, d: 'RE_MASTER', l: 149 },
				{ s: 1, i: 200, d: 'BASIC', l: 76 },
			],
		},
	};
}

test('adds Maishift-only songs and charts without duplicating existing charts', () => {
	const { catalog, recordsData } = fixture();
	assert.deepEqual(addMaishiftCatalogFallbacks(catalog, recordsData), { addedSongs: 1, addedCharts: 3 });

	const newSong = catalog.songs.find((song) => song.title === 'New Song');
	assert.equal(newSong.id, 'maishift-200');
	assert.equal(newSong.artworkUrl, 'new.png');
	assert.deepEqual(
		catalog.charts.filter((chart) => chart.songId === newSong.id).map((chart) => [chart.difficulty, chart.level]),
		[['Re:MASTER', '14+'], ['BASIC', '7+']],
	);
	assert.equal(catalog.charts.find((chart) => chart.id === '10-dx-master').constant, 14.8);
});

test('is idempotent when the same Maishift catalog is merged again', () => {
	const { catalog, recordsData } = fixture();
	addMaishiftCatalogFallbacks(catalog, recordsData);
	assert.deepEqual(addMaishiftCatalogFallbacks(catalog, recordsData), { addedSongs: 0, addedCharts: 0 });
});
