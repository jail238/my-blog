import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://meta.salt.realtvop.top/meta.next.json';
const COVER_BASE_URL = 'https://meta.salt.realtvop.top/covers';
const OUTPUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/maimai.generated.json');

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

const versionBySourceName = new Map(versions.map((version) => [version.sourceName, version]));

function coverUrl(id) {
	return `${COVER_BASE_URL}/${String(id).padStart(6, '0')}.png`;
}

function chartId(songId, type, difficulty) {
	return `${songId}-${type.toLowerCase()}-${difficulty.toLowerCase().replace(':', '')}`;
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

	const chartVersions = internationalCharts
		.map((chart) => versionBySourceName.get(String(chart.regions.intl.version)))
		.filter(Boolean)
		.sort((a, b) => a.order - b.order);

	if (chartVersions.length === 0) {
		throw new Error(`No known international version for ${music.id} ${music.title}`);
	}

	const songId = String(music.id);
	songs.push({
		id: songId,
		sourceId: music.id,
		title: music.title,
		artist: music.artist,
		versionId: chartVersions[0].id,
		genre: music.category,
		artworkUrl: coverUrl(music.id),
	});

	for (const chart of internationalCharts) {
		const difficulty = DIFFICULTIES.get(chart.difficulty);
		const type = chart.type === 'sd' ? 'STANDARD' : 'DX';
		charts.push({
			id: chartId(songId, type, difficulty),
			songId,
			type,
			difficulty,
			level: chart.regions.intl.level,
			constant: chart.regions.intl.internalLevel,
		});
	}
}

songs.sort((a, b) => a.sourceId - b.sourceId);
charts.sort((a, b) => a.songId.localeCompare(b.songId, 'en', { numeric: true }) || a.id.localeCompare(b.id));

const duplicateSongIds = songs.filter((song, index) => songs.findIndex((candidate) => candidate.id === song.id) !== index);
if (duplicateSongIds.length > 0) {
	throw new Error(`Duplicate song ids: ${duplicateSongIds.map((song) => song.id).join(', ')}`);
}

const output = {
	source: {
		url: SOURCE_URL,
		region: 'intl',
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

console.log(`International catalog: ${songs.length} songs, ${charts.length} charts`);
console.log(`MAGiCAL: ${versionCounts.get('magical')} songs`);
console.log(`Wrote ${OUTPUT_PATH}`);
