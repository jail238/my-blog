import catalogData from './maimai.generated.json';

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
	rank: string;
	combo?: string;
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
		sourceUpdatedAt: string | null;
		generatedAt: string;
	};
	versions: MaimaiVersion[];
	songs: Song[];
	charts: Omit<Chart, 'record'>[];
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

const RECORD_OVERRIDES: Record<string, PlayRecord> = {
	'1874:DX:EXPERT': { achievement: '100.5362%', rank: 'SSS+' },
	'1527:DX:EXPERT': { achievement: '100.9193%', rank: 'SSS+', combo: 'FC+' },
	'1485:DX:MASTER': { achievement: '100.6438%', rank: 'SSS+', combo: 'FC' },
};

export const CATALOG_SOURCE = generatedCatalog.source;
export const VERSIONS = generatedCatalog.versions;
export const SONGS = generatedCatalog.songs;
export const CHARTS: Chart[] = generatedCatalog.charts.map((chart) => ({
	...chart,
	record: RECORD_OVERRIDES[`${chart.songId}:${chart.type}:${chart.difficulty}`],
}));

const difficultyOrder: Record<Difficulty, number> = {
	BASIC: 1,
	ADVANCED: 2,
	EXPERT: 3,
	MASTER: 4,
	'Re:MASTER': 5,
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

function validateCatalog() {
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

		const chartKey = `${chart.songId}:${chart.type}:${chart.difficulty}`;
		if (chartKeys.has(chartKey)) {
			throw new Error(`Duplicate chart identity: ${chartKey}`);
		}
		chartKeys.add(chartKey);
	}
}

validateCatalog();

export function levelToSlug(level: string) {
	return level.replace('+', '-plus');
}

export function chartsForLevel(level: string) {
	return CHARTS.filter((chart) => chart.level === level).sort((a, b) => {
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
