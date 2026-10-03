import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://meta.salt.realtvop.top/meta.next.json';
const COVER_BASE_URL = 'https://meta.salt.realtvop.top/covers';
const KOREAN_TITLES_URL = 'https://maimai.team-carol.com/api/aliases';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ALLOW_CATALOG_CHANGES = process.argv.includes('--allow-catalog-changes');
const CATALOG_OUTPUT_PATH = resolve(SCRIPT_DIR, '../src/data/maimai.generated.json');
const OUTPUT_PATH = ALLOW_CATALOG_CHANGES
	? resolve(SCRIPT_DIR, '../.cache/maimai.candidate.json')
	: CATALOG_OUTPUT_PATH;
const CIRCLE_PLUS_SNAPSHOT_PATH = resolve(SCRIPT_DIR, '../src/data/circle-plus.generated.json');
const TARGET_GAME_VERSION = 'CiRCLE PLUS';
const JAPANESE_TITLE_PATTERN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u;
const KOREAN_TITLE_OVERRIDES = new Map([
	['フラグメンツ -T.V. maimai edit-', '프래그먼츠 -T.V. maimai edit-'],
	['GET!! 夢&DREAM', 'GET!! 꿈&DREAM'],
	['【東方ニコカラ】秘神マターラ feat.魂音泉【IOSYS】', '【동방 니코카라】비신 마타라 feat. 타마온센【IOSYS】'],
	['バラバラ〜仮初レインボーローズ〜', '바라바라 ~카리소메 레인보우 로즈~'],
]);

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
const versionIdBySourceName = new Map(versions.map((version) => [version.sourceName, version.id]));

function coverUrl(id) {
	return `${COVER_BASE_URL}/${String(id).padStart(6, '0')}.png`;
}

function chartId(songId, type, difficulty) {
	return `${songId}-${type.toLowerCase()}-${difficulty.toLowerCase().replace(':', '')}`;
}

function comparableCatalog(data) {
	return {
		versions: data.versions,
		songs: data.songs,
		charts: data.charts,
	};
}

async function readJsonIfExists(path) {
	try {
		return JSON.parse(await readFile(path, 'utf8'));
	} catch (error) {
		if (error?.code !== 'ENOENT') throw error;
		return undefined;
	}
}

async function loadKoreanTitles(fallbackSongs = []) {
	const fallbackTitles = new Map(
		fallbackSongs
			.filter((song) => song.koreanTitle)
			.map((song) => [song.title, song.koreanTitle]),
	);

	try {
		const response = await fetch(KOREAN_TITLES_URL);
		if (!response.ok) {
			throw new Error(`Korean title request failed: ${response.status} ${response.statusText}`);
		}

		const payload = await response.json();
		if (!Array.isArray(payload.aliases)) {
			throw new Error('Korean title response has no aliases array.');
		}

		const titles = new Map();
		for (const row of payload.aliases) {
			if (row?.isTranslation === true && typeof row.title === 'string' && typeof row.alias === 'string') {
				titles.set(row.title, row.alias.trim());
			}
		}
		if (titles.size < 500) {
			throw new Error(`Korean title response is unexpectedly small: ${titles.size}`);
		}

		for (const [title, koreanTitle] of KOREAN_TITLE_OVERRIDES) titles.set(title, koreanTitle);
		return titles;
	} catch (error) {
		if (fallbackTitles.size === 0) throw error;
		console.warn(`Korean title refresh skipped; preserving ${fallbackTitles.size} existing titles.`, error);
		for (const [title, koreanTitle] of KOREAN_TITLE_OVERRIDES) fallbackTitles.set(title, koreanTitle);
		return fallbackTitles;
	}
}

const previousOutput = await readJsonIfExists(OUTPUT_PATH);
const translationFallbackOutput =
	previousOutput ?? (OUTPUT_PATH !== CATALOG_OUTPUT_PATH ? await readJsonIfExists(CATALOG_OUTPUT_PATH) : undefined);
const koreanTitlesPromise = loadKoreanTitles(translationFallbackOutput?.songs);

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
const koreanTitles = await koreanTitlesPromise;
const songs = [];
const charts = [];

for (const music of metadata.musics) {
	const internationalCharts = music.charts.filter(
		(chart) => (chart.type === 'sd' || chart.type === 'dx') && DIFFICULTIES.has(chart.difficulty) && chart.regions?.intl,
	);

	if (internationalCharts.length === 0) continue;

	const songId = String(music.id);
	const pinnedSong = pinnedSongById.get(songId);
	if (!pinnedSong && !ALLOW_CATALOG_CHANGES) continue;
	const koreanTitle = JAPANESE_TITLE_PATTERN.test(music.title) ? koreanTitles.get(music.title) : undefined;

	songs.push({
		id: songId,
		sourceId: music.id,
		title: music.title,
		...(koreanTitle ? { koreanTitle } : {}),
		artist: music.artist,
		genre: music.category,
		artworkUrl: coverUrl(music.id),
	});

	for (const chart of internationalCharts) {
		const difficulty = DIFFICULTIES.get(chart.difficulty);
		const type = chart.type === 'sd' ? 'STANDARD' : 'DX';
		const id = chartId(songId, type, difficulty);
		const pinnedChart = pinnedChartById.get(id);
		if (!pinnedChart && !ALLOW_CATALOG_CHANGES) continue;
		const internationalChart = chart.regions.intl;
		const sourceVersionName = internationalChart.version;
		const sourceVersionId = versionIdBySourceName.get(sourceVersionName);
		if (!sourceVersionId) {
			throw new Error(`No known International version for ${id}: ${sourceVersionName}`);
		}
		if (pinnedChart && !pinnedChart.versionId) {
			throw new Error(`Pinned chart has no version: ${id}`);
		}
		if (pinnedChart && !versions.some((version) => version.id === pinnedChart.versionId)) {
			throw new Error(`No known pinned version for ${id}: ${pinnedChart.versionId}`);
		}
		if (pinnedChart && pinnedChart.versionId !== sourceVersionId && !ALLOW_CATALOG_CHANGES) {
			throw new Error(
				`Pinned version mismatch for ${id}: ${pinnedChart.versionId} !== ${sourceVersionId}`,
			);
		}

		charts.push({
			id,
			songId,
			type,
			difficulty,
			versionId: ALLOW_CATALOG_CHANGES ? sourceVersionId : pinnedChart.versionId,
			level: ALLOW_CATALOG_CHANGES ? internationalChart.level : pinnedChart.level,
			constant: ALLOW_CATALOG_CHANGES ? internationalChart.internalLevel : pinnedChart.constant,
		});
	}
}

if (!ALLOW_CATALOG_CHANGES) {
	const generatedSongIds = new Set(songs.map((song) => song.id));
	for (const pinnedSong of circlePlusSnapshot.songs) {
		if (generatedSongIds.has(pinnedSong.songId)) continue;
		if (!pinnedSong.fallbackMetadata) {
			throw new Error(`Pinned song has no catalog or fallback metadata: ${pinnedSong.songId}`);
		}
		songs.push({ id: pinnedSong.songId, ...pinnedSong.fallbackMetadata });
		generatedSongIds.add(pinnedSong.songId);
	}

	const generatedChartIds = new Set(charts.map((chart) => chart.id));
	for (const pinnedChart of circlePlusSnapshot.charts) {
		if (generatedChartIds.has(pinnedChart.chartId)) continue;
		if (!pinnedChart.songId || !pinnedChart.type || !pinnedChart.difficulty) {
			throw new Error(`Pinned chart has no fallback metadata: ${pinnedChart.chartId}`);
		}
		charts.push({
			id: pinnedChart.chartId,
			songId: pinnedChart.songId,
			type: pinnedChart.type,
			difficulty: pinnedChart.difficulty,
			versionId: pinnedChart.versionId,
			level: pinnedChart.level,
			constant: pinnedChart.constant,
		});
		generatedChartIds.add(pinnedChart.chartId);
	}
}

songs.sort((a, b) => a.sourceId - b.sourceId);
charts.sort((a, b) => a.songId.localeCompare(b.songId, 'en', { numeric: true }) || a.id.localeCompare(b.id));

const untranslatedJapaneseTitles = songs.filter(
	(song) => JAPANESE_TITLE_PATTERN.test(song.title) && !song.koreanTitle,
);
if (untranslatedJapaneseTitles.length > 0) {
	console.warn(
		`Missing Korean titles for ${untranslatedJapaneseTitles.length} songs: ` +
			untranslatedJapaneseTitles.slice(0, 20).map((song) => song.title).join(', '),
	);
}

const duplicateSongIds = songs.filter((song, index) => songs.findIndex((candidate) => candidate.id === song.id) !== index);
if (duplicateSongIds.length > 0) {
	throw new Error(`Duplicate song ids: ${duplicateSongIds.map((song) => song.id).join(', ')}`);
}

if (
	!ALLOW_CATALOG_CHANGES &&
	(songs.length !== circlePlusSnapshot.totalSongs || charts.length !== circlePlusSnapshot.totalCharts)
) {
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
		koreanTitlesUrl: KOREAN_TITLES_URL,
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

if (
	previousOutput &&
	JSON.stringify(comparableCatalog(previousOutput)) === JSON.stringify(comparableCatalog(output))
) {
	output.source.generatedAt = previousOutput.source.generatedAt;
	output.source.sourceUpdatedAt = previousOutput.source.sourceUpdatedAt;
}

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const songIdsByVersion = new Map(versions.map((version) => [version.id, new Set()]));
for (const chart of charts) songIdsByVersion.get(chart.versionId).add(chart.songId);

console.log(`${TARGET_GAME_VERSION} International catalog: ${songs.length} songs, ${charts.length} charts`);
console.log(`MAGiCAL: ${songIdsByVersion.get('magical').size} songs`);
console.log(`Wrote ${OUTPUT_PATH}`);
