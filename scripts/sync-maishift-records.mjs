import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addMaishiftCatalogFallbacks } from './maishift-catalog-fallback.mjs';
import {
	callMaishiftServerFunction,
	discoverMaishiftServerFunctions,
	fetchMaishiftText,
	MAISHIFT_ORIGIN,
	parseMaishiftRecordHistory,
} from './maishift-public-client.mjs';
import {
	annotatePerfectAchievementTimes,
	backfillPerfectAchievementTimes,
} from './perfect-achievement-history.mjs';

const HANDLE = process.env.MAISHIFT_HANDLE || 'elixir';
const REGION = process.env.MAISHIFT_REGION || 'ASIA';
const RECORDS_URL = `${MAISHIFT_ORIGIN}/profile/${encodeURIComponent(HANDLE)}/records`;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const USE_CANDIDATE_CATALOG = process.argv.includes('--catalog-candidate');
const CATALOG_PATH = resolve(
	SCRIPT_DIR,
	USE_CANDIDATE_CATALOG ? '../.cache/maimai.candidate.json' : '../src/data/maimai.generated.json',
);
const OUTPUT_PATH = resolve(SCRIPT_DIR, '../src/data/maishift.generated.json');
const CIRCLE_PLUS_SNAPSHOT_PATH = resolve(SCRIPT_DIR, '../src/data/circle-plus.generated.json');
const CIRCLE_PLUS_VERSION = 'CiRCLE PLUS';
const WRITE_CIRCLE_PLUS_SNAPSHOT = process.argv.includes('--write-circle-plus-snapshot');
const PERFECT_MILESTONE_VERSION = 3;

function normalizeTitle(value) {
	return value
		.replace(/\\x([0-9a-f]{2})/gi, (_match, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
		.replace(/\\"/g, '"')
		.normalize('NFC')
		.trim();
}

function normalizeArtist(value) {
	return value.normalize('NFC').trim();
}

function rankFor(achievement) {
	if (achievement >= 1_005_000) return 'SSS+';
	if (achievement >= 1_000_000) return 'SSS';
	if (achievement >= 995_000) return 'SS+';
	if (achievement >= 990_000) return 'SS';
	if (achievement >= 980_000) return 'S+';
	if (achievement >= 970_000) return 'S';
	if (achievement >= 940_000) return 'AAA';
	if (achievement >= 900_000) return 'AA';
	if (achievement >= 800_000) return 'A';
	if (achievement >= 750_000) return 'BBB';
	if (achievement >= 700_000) return 'BB';
	if (achievement >= 600_000) return 'B';
	if (achievement >= 500_000) return 'C';
	return 'D';
}

const comboLabels = {
	ALL_PERFECT_PLUS: 'AP+',
	ALL_PERFECT: 'AP',
	FULL_COMBO_PLUS: 'FC+',
	FULL_COMBO: 'FC',
};

const syncLabels = {
	FULL_SYNC_DX_PLUS: 'FDX+',
	FULL_SYNC_DX: 'FDX',
	FULL_SYNC_PLUS: 'FS+',
	FULL_SYNC: 'FS',
	SYNC_PLAY: 'SYNC',
};

function recordIdentity(song, chartType, difficulty) {
	return `${normalizeTitle(song.title)}\u0000${chartType}\u0000${difficulty}`;
}

function displayLevelForInternalLevel(internalLevelTenths) {
	const baseLevel = Math.floor(internalLevelTenths / 10);
	const decimal = internalLevelTenths % 10;
	return baseLevel >= 7 && baseLevel < 15 && decimal >= 6 ? `${baseLevel}+` : String(baseLevel);
}

function comparableSnapshot(data) {
	const { generatedAt: _generatedAt, ...source } = data.source;
	return { ...data, source };
}

function comparableCirclePlusSnapshot(data) {
	const { generatedAt: _generatedAt, ...source } = data.source;
	return { ...data, source };
}

async function mapWithConcurrency(items, concurrency, mapper) {
	const results = new Array(items.length);
	let nextIndex = 0;
	await Promise.all(
		Array.from({ length: Math.min(concurrency, items.length) }, async () => {
			while (nextIndex < items.length) {
				const index = nextIndex;
				nextIndex += 1;
				results[index] = await mapper(items[index], index);
			}
		}),
	);
	return results;
}

async function fetchPerfectHistorySnapshots(entries, recordsHash) {
	let completed = 0;
	return mapWithConcurrency(entries, 2, async (entry) => {
		const snapshotData = await callMaishiftServerFunction(recordsHash, {
			handle: `${HANDLE}~${entry.userRecordId}`,
			region: REGION,
		});
		completed += 1;
		if (completed % 10 === 0 || completed === entries.length) {
			console.log(`Fetched Maishift history: ${completed}/${entries.length}`);
		}
		return {
			userRecordId: entry.userRecordId,
			capturedAt: entry.capturedAt,
			records: snapshotData.tracks.flatMap((track) => {
				const combo = comboLabels[track.r?.c] ?? track.r?.c;
				return combo === 'AP' || combo === 'AP+'
					? [{ maishiftTrackId: track.i, combo }]
					: [];
			}),
		};
	});
}

const recordsHtml = await fetchMaishiftText(RECORDS_URL);
const { profileHash, recordsHash, historyHash } = await discoverMaishiftServerFunctions(recordsHtml);
const requestData = { handle: HANDLE, region: REGION };
const [profileData, recordsData, catalogText] = await Promise.all([
	callMaishiftServerFunction(profileHash, requestData),
	callMaishiftServerFunction(recordsHash, requestData),
	readFile(CATALOG_PATH, 'utf8'),
]);
const profile = profileData.userRecord.profile;
const historyEntries = profileData.pastRecordsVisible
	? parseMaishiftRecordHistory(await callMaishiftServerFunction(historyHash, requestData)).sort(
			(a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt),
		)
	: [];

const catalog = JSON.parse(catalogText);
if (USE_CANDIDATE_CATALOG) {
	const additions = addMaishiftCatalogFallbacks(catalog, recordsData);
	if (additions.addedSongs > 0 || additions.addedCharts > 0) {
		catalog.songs.sort((a, b) => a.sourceId - b.sourceId);
		catalog.charts.sort(
			(a, b) => a.songId.localeCompare(b.songId, 'en', { numeric: true }) || a.id.localeCompare(b.id),
		);
		await writeFile(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
		console.log(
			`Added Maishift fallback metadata: ${additions.addedSongs} songs, ${additions.addedCharts} charts`,
		);
	}
}
const catalogSongById = new Map(catalog.songs.map((song) => [song.id, song]));
const catalogCharts = new Map();
for (const chart of catalog.charts) {
	const song = catalogSongById.get(chart.songId);
	if (!song) throw new Error(`Catalog chart has no song: ${chart.id}`);

	const key = recordIdentity(song, chart.type, chart.difficulty);
	const matches = catalogCharts.get(key) ?? [];
	matches.push({ chart, song });
	catalogCharts.set(key, matches);
}

const unmatched = [];
const mappedTracks = [];
const seenMappedChartIds = new Set();

for (const track of recordsData.tracks) {
	const maishiftSong = recordsData.songs[track.s];
	if (!maishiftSong) throw new Error(`Maishift track has no song: ${track.i}`);

	const difficulty = track.d === 'RE_MASTER' ? 'Re:MASTER' : track.d;
	const key = recordIdentity(maishiftSong, maishiftSong.type, difficulty);
	let matches = catalogCharts.get(key) ?? [];

	if (matches.length > 1) {
		matches = matches.filter(({ song }) => normalizeArtist(song.artist) === normalizeArtist(maishiftSong.artist));
	}
	if (matches.length > 1) {
		matches = matches.filter(({ chart }) => chart.constant === track.l / 10);
	}

	if (matches.length === 0) {
		if (WRITE_CIRCLE_PLUS_SNAPSHOT) {
			unmatched.push({
				title: maishiftSong.title,
				artist: maishiftSong.artist,
				type: maishiftSong.type,
				difficulty,
				trackId: track.i,
				matches: [],
			});
		}
		continue;
	}

	if (matches.length !== 1) {
		unmatched.push({
			title: maishiftSong.title,
			artist: maishiftSong.artist,
			type: maishiftSong.type,
			difficulty,
			trackId: track.i,
			matches: matches.map(({ chart }) => chart.id),
		});
		continue;
	}

	const match = matches[0];
	const chartId = match.chart.id;
	if (seenMappedChartIds.has(chartId)) throw new Error(`Duplicate Maishift track for catalog chart: ${chartId}`);
	seenMappedChartIds.add(chartId);
	mappedTracks.push({ track, ...match });
}

if (unmatched.length > 0) {
	throw new Error(`Could not resolve ${unmatched.length} Maishift tracks:\n${JSON.stringify(unmatched, null, 2)}`);
}

if (mappedTracks.length !== recordsData.tracks.length) {
	throw new Error(`Maishift track coverage mismatch: ${mappedTracks.length} !== ${recordsData.tracks.length}`);
}

const records = [];
for (const { track, chart } of mappedTracks) {
	if (!track.r || track.r.a <= 0) continue;

	records.push({
		chartId: chart.id,
		achievement: `${(track.r.a / 10_000).toFixed(4)}%`,
		achievementValue: track.r.a,
		rank: rankFor(track.r.a),
		...(track.r.c ? { combo: comboLabels[track.r.c] ?? track.r.c } : {}),
		...(track.r.y ? { sync: syncLabels[track.r.y] ?? track.r.y } : {}),
		dxScore: track.r.d,
		dxScoreMax: track.r.m,
		rating: Math.floor(track.r.g),
		maishiftTrackId: track.i,
	});
}

if (WRITE_CIRCLE_PLUS_SNAPSHOT) {
	let previousCirclePlusSnapshot;
	try {
		previousCirclePlusSnapshot = JSON.parse(await readFile(CIRCLE_PLUS_SNAPSHOT_PATH, 'utf8'));
	} catch (error) {
		if (error?.code !== 'ENOENT') throw error;
	}

	const trackByChartId = new Map(mappedTracks.map(({ track, chart }) => [chart.id, track]));
	let correctedDisplayLevels = 0;
	const charts = catalog.charts
		.map((chart) => {
			const track = trackByChartId.get(chart.id);
			if (!track) {
				return {
					chartId: chart.id,
					songId: chart.songId,
					type: chart.type,
					difficulty: chart.difficulty,
					versionId: chart.versionId,
					level: chart.level,
					constant: chart.constant,
				};
			}
			const expectedLevel = displayLevelForInternalLevel(track.l);
			if (chart.level !== expectedLevel) {
				correctedDisplayLevels += 1;
			}

			return {
				chartId: chart.id,
				songId: chart.songId,
				type: chart.type,
				difficulty: chart.difficulty,
				versionId: chart.versionId,
				level: expectedLevel,
				constant: track.l / 10,
			};
		})
		.sort((a, b) => a.chartId.localeCompare(b.chartId, 'en', { numeric: true }));
	if (correctedDisplayLevels > 0) {
		console.log(`Corrected ${correctedDisplayLevels} display levels from current Maishift constants.`);
	}

	const snapshot = {
		source: {
			gameVersion: CIRCLE_PLUS_VERSION,
			region: REGION,
			recordsUrl: RECORDS_URL,
			generatedAt: new Date().toISOString(),
		},
		totalSongs: catalog.songs.length,
		totalCharts: charts.length,
		songs: catalog.songs
			.map((song) => ({
				songId: song.id,
				...(song.metadataSource === 'maishift'
					? {
						fallbackMetadata: {
							sourceId: song.sourceId,
							title: song.title,
							artist: song.artist,
							genre: song.genre,
							artworkUrl: song.artworkUrl,
						},
					}
					: {}),
			}))
			.sort((a, b) => a.songId.localeCompare(b.songId, 'en', { numeric: true })),
		charts,
	};
	if (
		previousCirclePlusSnapshot &&
		JSON.stringify(comparableCirclePlusSnapshot(previousCirclePlusSnapshot)) ===
			JSON.stringify(comparableCirclePlusSnapshot(snapshot))
	) {
		snapshot.source.generatedAt = previousCirclePlusSnapshot.source.generatedAt;
	}

	await mkdir(dirname(CIRCLE_PLUS_SNAPSHOT_PATH), { recursive: true });
	await writeFile(CIRCLE_PLUS_SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
	console.log(`Pinned ${CIRCLE_PLUS_VERSION}: ${snapshot.totalSongs} songs, ${snapshot.totalCharts} charts`);
	console.log(`Wrote ${CIRCLE_PLUS_SNAPSHOT_PATH}`);
}

records.sort(
	(a, b) =>
		b.rating - a.rating ||
		b.achievementValue - a.achievementValue ||
		a.chartId.localeCompare(b.chartId, 'en', { numeric: true }),
);

let previousOutput;
try {
	previousOutput = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
} catch (error) {
	if (error?.code !== 'ENOENT') throw error;
}

const generatedAt = new Date().toISOString();
let recordsWithPerfectTimes = annotatePerfectAchievementTimes(records, {
	previousRecords: previousOutput?.records ?? [],
	detectedAt: profile.updatedAt ?? generatedAt,
	baselineAt: previousOutput?.source?.generatedAt ?? profile.createdAt ?? profile.updatedAt ?? generatedAt,
});
let recordHistory = previousOutput?.source?.recordHistory;
if (profileData.pastRecordsVisible) {
	if (historyEntries.length === 0) throw new Error('Maishift record history is public but contains no snapshots.');
	const lastProcessedId = Number(recordHistory?.lastUserRecordId ?? 0);
	const requiresFullMilestoneBackfill = Number(recordHistory?.milestoneVersion ?? 0) < PERFECT_MILESTONE_VERSION;
	const pendingEntries = recordHistory && !requiresFullMilestoneBackfill
		? historyEntries.filter((entry) => entry.userRecordId > lastProcessedId)
		: historyEntries;
	if (pendingEntries.length > 0) {
		console.log(`Backfilling AP/AP+ milestones from ${pendingEntries.length} Maishift history snapshots.`);
		const beforeTimes = new Map(
			recordsWithPerfectTimes.map((record) => [
				record.chartId,
				[record.perfectAchievedAt, record.apAchievedAt, record.apPlusAchievedAt].join('\u0000'),
			]),
		);
		const historySnapshots = await fetchPerfectHistorySnapshots(pendingEntries, recordsHash);
		recordsWithPerfectTimes = backfillPerfectAchievementTimes(recordsWithPerfectTimes, historySnapshots);
		const correctedDates = recordsWithPerfectTimes.filter(
			(record) =>
				[record.perfectAchievedAt, record.apAchievedAt, record.apPlusAchievedAt].join('\u0000') !==
				beforeTimes.get(record.chartId),
		).length;
		console.log(`Backfilled AP/AP+ milestones: ${correctedDates}`);
	}

	const firstHistory = historyEntries[0];
	const lastHistory = historyEntries.at(-1);
	recordHistory = {
		visibility: 'public',
		firstSnapshotAt: firstHistory.capturedAt,
		lastSnapshotAt: lastHistory.capturedAt,
		lastUserRecordId: lastHistory.userRecordId,
		snapshotCount: historyEntries.length,
		milestoneVersion: PERFECT_MILESTONE_VERSION,
	};
} else if (recordHistory) {
	recordHistory = { ...recordHistory, visibility: 'private' };
}
const output = {
	source: {
		profileUrl: `${MAISHIFT_ORIGIN}/profile/${HANDLE}/home`,
		recordsUrl: RECORDS_URL,
		handle: HANDLE,
		region: REGION,
		profileUpdatedAt: profile.updatedAt,
		generatedAt,
		...(recordHistory ? { recordHistory } : {}),
	},
	profile: {
		name: profile.name,
		rating: profile.rating,
		playCount: profile.playCount.total,
		currentPlayCount: profile.playCount.current,
		updatedAt: profile.updatedAt,
	},
	total: records.length,
	records: recordsWithPerfectTimes,
};

if (
	previousOutput &&
	JSON.stringify(comparableSnapshot(previousOutput)) === JSON.stringify(comparableSnapshot(output))
) {
	output.source.generatedAt = previousOutput.source.generatedAt;
}

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(`Maishift profile: ${profile.name} / rating ${profile.rating}`);
console.log(`Imported records: ${records.length}`);
console.log(`Wrote ${OUTPUT_PATH}`);
