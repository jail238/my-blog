import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAISHIFT_ORIGIN = 'https://maimai.shiftpsh.com';
const HANDLE = process.env.MAISHIFT_HANDLE || 'elixir';
const REGION = process.env.MAISHIFT_REGION || 'ASIA';
const RECORDS_URL = `${MAISHIFT_ORIGIN}/profile/${encodeURIComponent(HANDLE)}/records`;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = resolve(SCRIPT_DIR, '../src/data/maimai.generated.json');
const OUTPUT_PATH = resolve(SCRIPT_DIR, '../src/data/maishift.generated.json');
const CIRCLE_PLUS_SNAPSHOT_PATH = resolve(SCRIPT_DIR, '../src/data/circle-plus.generated.json');
const CIRCLE_PLUS_VERSION = 'CiRCLE PLUS';
const WRITE_CIRCLE_PLUS_SNAPSHOT = process.argv.includes('--write-circle-plus-snapshot');

const SPECIAL_VALUES = [undefined, null, true, false];

function deserialize(value) {
	if (!value || typeof value !== 'object') return value;

	switch (value.t) {
		case 0:
		case 1:
		case 5:
			return value.s;
		case 2:
			return SPECIAL_VALUES[value.s];
		case 9:
			return value.a.map(deserialize);
		case 10:
		case 11:
			return Object.fromEntries(value.p.k.map((key, index) => [key, deserialize(value.p.v[index])]));
		default:
			throw new Error(`Unsupported Maishift serialization type: ${value.t}`);
	}
}

function serverFunctionPayload(data) {
	return {
		t: {
			t: 10,
			i: 0,
			p: {
				k: ['data'],
				v: [
					{
						t: 10,
						i: 1,
						p: {
							k: Object.keys(data),
							v: Object.values(data).map((value) => ({ t: 1, s: value })),
						},
						o: 0,
					},
				],
			},
			o: 0,
		},
		f: 63,
		m: [],
	};
}

async function fetchText(url) {
	const response = await fetch(url, {
		headers: { 'user-agent': 'M.S.K. archive record sync' },
	});
	if (!response.ok) throw new Error(`Request failed: ${response.status} ${url}`);
	return response.text();
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function bindingHash(mainScript, binding) {
	const bindingIndex = mainScript.indexOf(`${binding}=`);
	if (bindingIndex < 0) throw new Error(`Could not find Maishift server function binding: ${binding}`);

	const match = mainScript.slice(bindingIndex, bindingIndex + 500).match(/["']([a-f0-9]{64})["']/);
	if (!match) throw new Error(`Could not find Maishift server function hash for: ${binding}`);
	return match[1];
}

async function discoverServerFunctions(recordsHtml) {
	const allScriptLinks = [...recordsHtml.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.js)["'][^>]*>/gi)].map((match) => match[1]);
	const routeScriptLinks = allScriptLinks.filter((path) => /\/index-[^/]+\.js$/.test(path));
	const scriptLinks = [...routeScriptLinks, ...allScriptLinks.filter((path) => !routeScriptLinks.includes(path))];

	let recordsScript;
	for (const path of scriptLinks) {
		const source = await fetchText(new URL(path, MAISHIFT_ORIGIN));
		if (source.includes('profile-tracks')) {
			recordsScript = source;
			break;
		}
	}
	if (!recordsScript) throw new Error('Could not locate the Maishift records page script.');

	const mainPath = recordsScript.match(/from["']\.\/(main-[^"']+\.js)["']/)?.[1];
	if (!mainPath) throw new Error('Could not locate the Maishift main script.');

	const recordsAlias = recordsScript.match(/queryKey:\[\s*["']profile-tracks["'][\s\S]{0,800}?queryFn:\(\)=>\s*([$\w]+)\(\{data:/)?.[1];
	if (!recordsAlias) throw new Error('Could not locate the Maishift records function alias.');

	const importName = recordsScript.match(
		new RegExp(`(?:\\{|,)\\s*([$\\w]+)\\s+as\\s+${escapeRegExp(recordsAlias)}(?:,|\\})`),
	)?.[1];
	if (!importName) throw new Error('Could not resolve the Maishift records function import.');

	const mainScript = await fetchText(new URL(`/assets/${mainPath}`, MAISHIFT_ORIGIN));
	const exportBlock = mainScript.slice(mainScript.lastIndexOf('export{'));
	const recordsBinding = exportBlock.match(new RegExp(`([$\\w]+)\\s+as\\s+${escapeRegExp(importName)}(?:,|\\})`))?.[1];
	if (!recordsBinding) throw new Error('Could not resolve the Maishift records function binding.');

	const profileBinding = mainScript.match(
		/Ne\(["']\/\{\-\$locale\}\/profile\/\$handle["']\)\(\{[\s\S]{0,1400}?loader:async\([^)]*\)=>await\s+([$\w]+)\(\{data:/,
	)?.[1];
	if (!profileBinding) throw new Error('Could not resolve the Maishift profile function binding.');

	return {
		profileHash: bindingHash(mainScript, profileBinding),
		recordsHash: bindingHash(mainScript, recordsBinding),
	};
}

async function callServerFunction(hash, data) {
	const payload = encodeURIComponent(JSON.stringify(serverFunctionPayload(data)));
	const response = await fetch(`${MAISHIFT_ORIGIN}/_serverFn/${hash}?payload=${payload}`, {
		headers: {
			accept: 'application/json',
			'x-tsr-serverfn': 'true',
			'user-agent': 'M.S.K. archive record sync',
		},
	});
	if (!response.ok) throw new Error(`Maishift server function failed: ${response.status}`);

	const serialized = await response.json();
	const decoded = deserialize(serialized);
	if (decoded.error) throw new Error(`Maishift returned an error: ${decoded.error}`);
	return decoded.result;
}

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

const recordsHtml = await fetchText(RECORDS_URL);
const { profileHash, recordsHash } = await discoverServerFunctions(recordsHtml);
const requestData = { handle: HANDLE, region: REGION };
const [profileData, recordsData, catalogText] = await Promise.all([
	callServerFunction(profileHash, requestData),
	callServerFunction(recordsHash, requestData),
	readFile(CATALOG_PATH, 'utf8'),
]);

const catalog = JSON.parse(catalogText);
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

	if (matches.length === 0) continue;

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

if (mappedTracks.length !== catalog.charts.length) {
	throw new Error(`Maishift catalog coverage mismatch: ${mappedTracks.length} !== ${catalog.charts.length}`);
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
	const charts = mappedTracks
		.map(({ track, chart }) => {
			const expectedLevel = displayLevelForInternalLevel(track.l);
			if (chart.level !== expectedLevel) {
				throw new Error(
					`CiRCLE PLUS level mismatch for ${chart.id}: ${chart.level} !== ${expectedLevel} (${track.l / 10})`,
				);
			}

			return {
				chartId: chart.id,
				level: chart.level,
				constant: track.l / 10,
			};
		})
		.sort((a, b) => a.chartId.localeCompare(b.chartId, 'en', { numeric: true }));

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
			.map(({ id, versionId }) => ({ songId: id, versionId }))
			.sort((a, b) => a.songId.localeCompare(b.songId, 'en', { numeric: true })),
		charts,
	};

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

const profile = profileData.userRecord.profile;
const output = {
	source: {
		profileUrl: `${MAISHIFT_ORIGIN}/profile/${HANDLE}/home`,
		recordsUrl: RECORDS_URL,
		handle: HANDLE,
		region: REGION,
		profileUpdatedAt: profile.updatedAt,
		generatedAt: new Date().toISOString(),
	},
	profile: {
		name: profile.name,
		rating: profile.rating,
		playCount: profile.playCount.total,
		currentPlayCount: profile.playCount.current,
		updatedAt: profile.updatedAt,
	},
	total: records.length,
	records,
};

let previousOutput;
try {
	previousOutput = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
} catch (error) {
	if (error?.code !== 'ENOENT') throw error;
}

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
