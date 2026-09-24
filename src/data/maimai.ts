import catalogData from './maimai.generated.json';
import maishiftData from './maishift.generated.json';

export type ChartType = 'STANDARD' | 'DX';
export type Difficulty = 'BASIC' | 'ADVANCED' | 'EXPERT' | 'MASTER' | 'Re:MASTER';

export interface MaimaiVersion {
	id: string;
	name: string;
	shortName: string;
	order: number;
}

export interface Song {
	id: string;
	sourceId: number;
	title: string;
	artist: string;
	versionId: string;
	genre: string;
	artworkUrl: string;
}

export interface PlayRecord {
	achievement: string;
	achievementValue: number;
	rank: string;
	combo?: string;
	sync?: string;
	dxScore: number;
	dxScoreMax: number;
	rating: number;
	maishiftTrackId: number;
}

export interface Chart {
	id: string;
	songId: string;
	type: ChartType;
	difficulty: Difficulty;
	level: string;
	constant?: number;
	record?: PlayRecord;
}

interface GeneratedCatalog {
	source: {
		url: string;
		region: 'intl';
		gameVersion: 'CiRCLE PLUS';
		chartDataUrl: string;
		chartDataPinnedAt: string;
		sourceUpdatedAt: string | null;
		generatedAt: string;
	};
	versions: MaimaiVersion[];
	songs: Song[];
	charts: Omit<Chart, 'record'>[];
}

interface GeneratedMaishiftData {
	source: {
		profileUrl: string;
		recordsUrl: string;
		handle: string;
		region: string;
		profileUpdatedAt: string;
		generatedAt: string;
	};
	profile: {
		name: string;
		rating: number;
		playCount: number;
		currentPlayCount: number;
		updatedAt: string;
	};
	total: number;
	records: (PlayRecord & { chartId: string })[];
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
	BASIC: 'BASIC',
	ADVANCED: 'ADVANCED',
	EXPERT: 'EXPERT',
	MASTER: 'MASTER',
	'Re:MASTER': 'Re:MASTER',
};

export const LEVEL_ORDER = [
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'7+',
	'8',
	'8+',
	'9',
	'9+',
	'10',
	'10+',
	'11',
	'11+',
	'12',
	'12+',
	'13',
	'13+',
	'14',
	'14+',
	'15',
] as const;

const generatedCatalog = catalogData as GeneratedCatalog;
const generatedMaishift = maishiftData as GeneratedMaishiftData;
const recordsByChartId = new Map(
	generatedMaishift.records.map(({ chartId, ...record }) => [chartId, record] as const),
);

export const CATALOG_SOURCE = generatedCatalog.source;
export const MAISHIFT_SOURCE = generatedMaishift.source;
export const PLAYER_PROFILE = generatedMaishift.profile;
export const VERSIONS = generatedCatalog.versions;
export const SONGS = generatedCatalog.songs;
export const CHARTS: Chart[] = generatedCatalog.charts.map((chart) => ({
	...chart,
	record: recordsByChartId.get(chart.id),
}));

const difficultyOrder: Record<Difficulty, number> = {
	BASIC: 1,
	ADVANCED: 2,
	EXPERT: 3,
	MASTER: 4,
	'Re:MASTER': 5,
};

const apOrder: Record<string, number> = {
	'AP+': 2,
	AP: 1,
};

export const versionsNewestFirst = [...VERSIONS].sort((a, b) => b.order - a.order);
export const songById = new Map(SONGS.map((song) => [song.id, song]));
export const versionById = new Map(VERSIONS.map((version) => [version.id, version]));

function assertUniqueIds(items: { id: string }[], label: string) {
	const ids = new Set<string>();
	for (const item of items) {
		if (ids.has(item.id)) throw new Error(`Duplicate ${label} id: ${item.id}`);
		ids.add(item.id);
	}
}

function displayLevelForConstant(constant: number) {
	const internalLevelTenths = Math.round(constant * 10);
	const baseLevel = Math.floor(internalLevelTenths / 10);
	const decimal = internalLevelTenths % 10;
	return baseLevel >= 7 && baseLevel < 15 && decimal >= 6 ? `${baseLevel}+` : String(baseLevel);
}

function validateCatalog() {
	if (CATALOG_SOURCE.gameVersion !== 'CiRCLE PLUS') {
		throw new Error(`Unsupported catalog version: ${CATALOG_SOURCE.gameVersion}`);
	}

	assertUniqueIds(VERSIONS, 'version');
	assertUniqueIds(SONGS, 'song');
	assertUniqueIds(CHARTS, 'chart');

	const knownLevels = new Set<string>(LEVEL_ORDER);
	const chartKeys = new Set<string>();

	for (const song of SONGS) {
		if (!versionById.has(song.versionId)) {
			throw new Error(`Unknown version ${song.versionId} for song ${song.id}`);
		}
	}

	for (const chart of CHARTS) {
		if (!songById.has(chart.songId)) {
			throw new Error(`Unknown song ${chart.songId} for chart ${chart.id}`);
		}
		if (!knownLevels.has(chart.level)) {
			throw new Error(`Unknown level ${chart.level} for chart ${chart.id}`);
		}
		if (chart.constant === undefined) {
			throw new Error(`Missing constant for chart ${chart.id}`);
		}

		const expectedLevel = displayLevelForConstant(chart.constant);
		if (chart.level !== expectedLevel) {
			throw new Error(
				`CiRCLE PLUS level mismatch for ${chart.id}: ${chart.level} !== ${expectedLevel} (${chart.constant.toFixed(1)})`,
			);
		}

		const chartKey = `${chart.songId}:${chart.type}:${chart.difficulty}`;
		if (chartKeys.has(chartKey)) {
			throw new Error(`Duplicate chart identity: ${chartKey}`);
		}
		chartKeys.add(chartKey);
	}

	if (recordsByChartId.size !== generatedMaishift.total) {
		throw new Error(`Maishift record count mismatch: ${recordsByChartId.size} !== ${generatedMaishift.total}`);
	}

	for (const chartId of recordsByChartId.keys()) {
		if (!CHARTS.some((chart) => chart.id === chartId)) {
			throw new Error(`Unknown Maishift chart id: ${chartId}`);
		}
	}
}

validateCatalog();

export function levelToSlug(level: string) {
	return level.replace('+', '-plus');
}

export function chartsForLevel(level: string) {
	return CHARTS.filter((chart) => chart.level === level).sort((a, b) => {
		const apDifference = (apOrder[b.record?.combo ?? ''] ?? 0) - (apOrder[a.record?.combo ?? ''] ?? 0);
		if (apDifference !== 0) return apDifference;

		const achievementDifference = (b.record?.achievementValue ?? 0) - (a.record?.achievementValue ?? 0);
		if (achievementDifference !== 0) return achievementDifference;

		const constantDifference = (b.constant ?? 0) - (a.constant ?? 0);
		if (constantDifference !== 0) return constantDifference;

		const songA = songById.get(a.songId)?.title ?? '';
		const songB = songById.get(b.songId)?.title ?? '';
		const songDifference = songA.localeCompare(songB, 'ko');
		if (songDifference !== 0) return songDifference;

		return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
	});
}

export function chartsForSong(songId: string) {
	return CHARTS.filter((chart) => chart.songId === songId).sort((a, b) => {
		if (a.type !== b.type) return a.type === 'STANDARD' ? -1 : 1;
		return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
	});
}

export function songsForVersion(versionId: string) {
	return SONGS.filter((song) => song.versionId === versionId).sort((a, b) => a.title.localeCompare(b.title, 'ko'));
}

export function registeredLevels() {
	return LEVEL_ORDER.filter((level) => CHARTS.some((chart) => chart.level === level));
}

export const RECORDED_CHARTS = CHARTS.filter((chart) => chart.record).sort((a, b) => {
	const ratingDifference = (b.record?.rating ?? 0) - (a.record?.rating ?? 0);
	if (ratingDifference !== 0) return ratingDifference;

	const achievementDifference = (b.record?.achievementValue ?? 0) - (a.record?.achievementValue ?? 0);
	if (achievementDifference !== 0) return achievementDifference;

	const songA = songById.get(a.songId)?.title ?? '';
	const songB = songById.get(b.songId)?.title ?? '';
	return songA.localeCompare(songB, 'ko');
});
