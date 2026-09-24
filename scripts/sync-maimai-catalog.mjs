import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://meta.salt.realtvop.top/meta.next.json';
const COVER_BASE_URL = 'https://meta.salt.realtvop.top/covers';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(SCRIPT_DIR, '../src/data/maimai.generated.json');
const CIRCLE_PLUS_SNAPSHOT_PATH = resolve(SCRIPT_DIR, '../src/data/circle-plus.generated.json');
const TARGET_GAME_VERSION = 'CiRCLE PLUS';

const VERSION_DEFINITIONS = [
	['maimai', 'maimai', 'maimai'],
	['maimai PLUS', 'maimai-plus', 'maimai PLUS'],
	['GreeN', 'green', 'GreeN'],
	['GreeN PLUS', 'green-plus', 'GreeN PLUS'],
	['ORANGE', 'orange', 'ORANGE'],
	['ORANGE PLUS', 'orange-plus', 'ORANGE PLUS'],
	['PiNK', 'pink', 'PiNK'],
	['PiNK PLUS', 'pink-plus', 'PiNK PLUS'],
	['MURASAKi', 'murasaki', 'MURASAKi'],
	['MURASAKi PLUS', 'murasaki-plus', 'MURASAKi PLUS'],
	['MiLK', 'milk', 'MiLK'],
	['MiLK PLUS', 'milk-plus', 'MiLK PLUS'],
	['FiNALE', 'finale', 'FiNALE'],
	['maimaiでらっくす', 'dx', 'でらっくす'],
	['maimaiでらっくす PLUS', 'dx-plus', 'でらっくす PLUS'],
	['Splash', 'splash', 'Splash'],
	['Splash PLUS', 'splash-plus', 'Splash PLUS'],
	['UNiVERSE', 'universe', 'UNiVERSE'],
	['UNiVERSE PLUS', 'universe-plus', 'UNiVERSE PLUS'],
	['FESTiVAL', 'festival', 'FESTiVAL'],
	['FESTiVAL PLUS', 'festival-plus', 'FESTiVAL PLUS'],
	['BUDDiES', 'buddies', 'BUDDiES'],
	['BUDDiES PLUS', 'buddies-plus', 'BUDDiES PLUS'],
	['PRiSM', 'prism', 'PRiSM'],
	['PRiSM PLUS', 'prism-plus', 'PRiSM PLUS'],
	['CiRCLE', 'circle', 'CiRCLE'],
	['CiRCLE PLUS', 'circle-plus', 'CiRCLE PLUS'],
	['MAGiCAL', 'magical', 'MAGiCAL'],
];

const DIFFICULTIES = new Map([
	[0, 'BASIC'],
	[1, 'ADVANCED'],
	[2, 'EXPERT'],
	[3, 'MASTER'],
	[4, 'Re:MASTER'],
]);

const versions = VERSION_DEFINITIONS.map(([sourceName, id, shortName], index) => ({
	id,
	name:
		sourceName === 'maimai'
			? sourceName
			: sourceName.startsWith('maimai')
				? sourceName.replace('maimaiでらっくす', 'maimai でらっくす')
				: index <= 12
					? `maimai ${sourceName}`
					: `maimai でらっくす ${sourceName}`,
	shortName,
	order: index + 1,
	sourceName,
}));

function coverUrl(id) {
	return `${COVER_BASE_URL}/${String(id).padStart(6, '0')}.png`;
}

function chartId(songId, type, difficulty) {
	return `${songId}-${type.toLowerCase()}-${difficulty.toLowerCase().replace(':', '')}`;
}

const circlePlusSnapshot = JSON.parse(await readFile(CIRCLE_PLUS_SNAPSHOT_PATH, 'utf8'));
if (circlePlusSnapshot.source.gameVersion !== TARGET_GAME_VERSION) {
	throw new Error(
		`Pinned catalog version mismatch: ${circlePlusSnapshot.source.gameVersion} !== ${TARGET_GAME_VERSION}`,
	);
}

const pinnedChartById = new Map(circlePlusSnapshot.charts.map((chart) => [chart.chartId, chart]));
const pinnedSongById = new Map(circlePlusSnapshot.songs.map((song) => [song.songId, song]));
if (
	pinnedChartById.size !== circlePlusSnapshot.totalCharts ||
	pinnedSongById.size !== circlePlusSnapshot.totalSongs
) {
	throw new Error(`${TARGET_GAME_VERSION} snapshot contains duplicate chart or song ids.`);
}

const response = await fetch(SOURCE_URL);
if (!response.ok) {
	throw new Error(`Catalog request failed: ${response.status} ${response.statusText}`);
}

const sourceUpdatedAt = response.headers.get('last-modified');
const metadata = await response.json();
const songs = [];
const charts = [];

for (const music of metadata.musics) {
	const internationalCharts = music.charts.filter(
		(chart) => (chart.type === 'sd' || chart.type === 'dx') && DIFFICULTIES.has(chart.difficulty) && chart.regions?.intl,
	);

	if (internationalCharts.length === 0) continue;

	const songId = String(music.id);
	const pinnedSong = pinnedSongById.get(songId);
	if (!pinnedSong) continue;
	if (!versions.some((version) => version.id === pinnedSong.versionId)) {
		throw new Error(`No known pinned version for ${music.id} ${music.title}: ${pinnedSong.versionId}`);
	}

	songs.push({
		id: songId,
		sourceId: music.id,
		title: music.title,
		artist: music.artist,
		versionId: pinnedSong.versionId,
		genre: music.category,
		artworkUrl: coverUrl(music.id),
	});

	for (const chart of internationalCharts) {
		const difficulty = DIFFICULTIES.get(chart.difficulty);
		const type = chart.type === 'sd' ? 'STANDARD' : 'DX';
		const id = chartId(songId, type, difficulty);
		const pinnedChart = pinnedChartById.get(id);
		if (!pinnedChart) continue;

		charts.push({
			id,
			songId,
			type,
			difficulty,
			level: pinnedChart.level,
			constant: pinnedChart.constant,
		});
	}
}

songs.sort((a, b) => a.sourceId - b.sourceId);
charts.sort((a, b) => a.songId.localeCompare(b.songId, 'en', { numeric: true }) || a.id.localeCompare(b.id));

const duplicateSongIds = songs.filter((song, index) => songs.findIndex((candidate) => candidate.id === song.id) !== index);
if (duplicateSongIds.length > 0) {
	throw new Error(`Duplicate song ids: ${duplicateSongIds.map((song) => song.id).join(', ')}`);
}

if (songs.length !== circlePlusSnapshot.totalSongs || charts.length !== circlePlusSnapshot.totalCharts) {
	const generatedChartIds = new Set(charts.map((chart) => chart.id));
	const missingChartIds = [...pinnedChartById.keys()].filter((id) => !generatedChartIds.has(id));
	throw new Error(
		`${TARGET_GAME_VERSION} catalog coverage mismatch: ${songs.length}/${circlePlusSnapshot.totalSongs} songs, ` +
			`${charts.length}/${circlePlusSnapshot.totalCharts} charts. Missing charts: ${missingChartIds.slice(0, 20).join(', ')}`,
	);
}

const output = {
	source: {
		url: SOURCE_URL,
		region: 'intl',
		gameVersion: TARGET_GAME_VERSION,
		chartDataUrl: circlePlusSnapshot.source.recordsUrl,
		chartDataPinnedAt: circlePlusSnapshot.source.generatedAt,
		sourceUpdatedAt,
		generatedAt: new Date().toISOString(),
	},
	versions: versions.map(({ sourceName: _sourceName, ...version }) => version),
	songs,
	charts,
};

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const versionCounts = new Map(versions.map((version) => [version.id, 0]));
for (const song of songs) versionCounts.set(song.versionId, versionCounts.get(song.versionId) + 1);

console.log(`${TARGET_GAME_VERSION} International catalog: ${songs.length} songs, ${charts.length} charts`);
console.log(`MAGiCAL: ${versionCounts.get('magical')} songs`);
console.log(`Wrote ${OUTPUT_PATH}`);
