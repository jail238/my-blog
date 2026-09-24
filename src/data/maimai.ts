export type ChartType = 'STANDARD' | 'DX';
export type Difficulty = 'BASIC' | 'ADVANCED' | 'EXPERT' | 'MASTER' | 'Re:MASTER';
export type ArtworkTone = 'mint' | 'amber' | 'coral' | 'violet' | 'blue' | 'graphite';

export interface MaimaiVersion {
	id: string;
	name: string;
	shortName: string;
	order: number;
}

export interface Song {
	id: string;
	title: string;
	artist: string;
	versionId: string;
	genre: string;
	tone: ArtworkTone;
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

export const VERSIONS: MaimaiVersion[] = [
	{ id: 'maimai', name: 'maimai', shortName: 'maimai', order: 1 },
	{ id: 'maimai-plus', name: 'maimai PLUS', shortName: 'maimai PLUS', order: 2 },
	{ id: 'green', name: 'maimai GreeN', shortName: 'GreeN', order: 3 },
	{ id: 'green-plus', name: 'maimai GreeN PLUS', shortName: 'GreeN PLUS', order: 4 },
	{ id: 'orange', name: 'maimai ORANGE', shortName: 'ORANGE', order: 5 },
	{ id: 'orange-plus', name: 'maimai ORANGE PLUS', shortName: 'ORANGE PLUS', order: 6 },
	{ id: 'pink', name: 'maimai PiNK', shortName: 'PiNK', order: 7 },
	{ id: 'pink-plus', name: 'maimai PiNK PLUS', shortName: 'PiNK PLUS', order: 8 },
	{ id: 'murasaki', name: 'maimai MURASAKi', shortName: 'MURASAKi', order: 9 },
	{ id: 'murasaki-plus', name: 'maimai MURASAKi PLUS', shortName: 'MURASAKi PLUS', order: 10 },
	{ id: 'milk', name: 'maimai MiLK', shortName: 'MiLK', order: 11 },
	{ id: 'milk-plus', name: 'maimai MiLK PLUS', shortName: 'MiLK PLUS', order: 12 },
	{ id: 'finale', name: 'maimai FiNALE', shortName: 'FiNALE', order: 13 },
	{ id: 'dx', name: 'maimai でらっくす', shortName: 'でらっくす', order: 14 },
	{ id: 'dx-plus', name: 'maimai でらっくす PLUS', shortName: 'でらっくす PLUS', order: 15 },
	{ id: 'splash', name: 'maimai でらっくす Splash', shortName: 'Splash', order: 16 },
	{ id: 'splash-plus', name: 'maimai でらっくす Splash PLUS', shortName: 'Splash PLUS', order: 17 },
	{ id: 'universe', name: 'maimai でらっくす UNiVERSE', shortName: 'UNiVERSE', order: 18 },
	{ id: 'universe-plus', name: 'maimai でらっくす UNiVERSE PLUS', shortName: 'UNiVERSE PLUS', order: 19 },
	{ id: 'festival', name: 'maimai でらっくす FESTiVAL', shortName: 'FESTiVAL', order: 20 },
	{ id: 'festival-plus', name: 'maimai でらっくす FESTiVAL PLUS', shortName: 'FESTiVAL PLUS', order: 21 },
	{ id: 'buddies', name: 'maimai でらっくす BUDDiES', shortName: 'BUDDiES', order: 22 },
	{ id: 'buddies-plus', name: 'maimai でらっくす BUDDiES PLUS', shortName: 'BUDDiES PLUS', order: 23 },
	{ id: 'prism', name: 'maimai でらっくす PRiSM', shortName: 'PRiSM', order: 24 },
	{ id: 'prism-plus', name: 'maimai でらっくす PRiSM PLUS', shortName: 'PRiSM PLUS', order: 25 },
	{ id: 'circle', name: 'maimai でらっくす CiRCLE', shortName: 'CiRCLE', order: 26 },
	{ id: 'circle-plus', name: 'maimai でらっくす CiRCLE PLUS', shortName: 'CiRCLE PLUS', order: 27 },
	{ id: 'magical', name: 'maimai でらっくす MAGiCAL', shortName: 'MAGiCAL', order: 28 },
];

export const SONGS: Song[] = [
	{
		id: 'dennou-minmin-neko',
		title: '電脳眠眠猫',
		artist: '桃寝ちのい',
		versionId: 'magical',
		genre: 'niconico＆ボーカロイド',
		tone: 'violet',
	},
	{
		id: 'kousenka',
		title: '光線歌',
		artist: 'Guiano',
		versionId: 'magical',
		genre: 'niconico＆ボーカロイド',
		tone: 'blue',
	},
	{
		id: 'aishou-yuushou-drops',
		title: '相性×優勝ドロップス',
		artist: 'Idios',
		versionId: 'magical',
		genre: 'POPS＆アニメ',
		tone: 'coral',
	},
	{
		id: 'donguri-game',
		title: 'どんぐりGAME',
		artist: 'こっちのけんと',
		versionId: 'circle-plus',
		genre: 'POPS＆アニメ',
		tone: 'amber',
	},
	{
		id: 'ai-scream',
		title: '愛♡スクリ～ム！',
		artist: 'AiScReam',
		versionId: 'circle-plus',
		genre: 'POPS＆アニメ',
		tone: 'coral',
	},
	{
		id: 'no-one-yes-man',
		title: 'NO ONE YES MAN',
		artist: 'MYUKKE.',
		versionId: 'prism-plus',
		genre: 'ゲーム＆バラエティ',
		tone: 'graphite',
	},
	{
		id: 'enchanted-wanderer',
		title: 'enchanted wanderer',
		artist: 'linear ring',
		versionId: 'festival',
		genre: 'maimai',
		tone: 'mint',
	},
	{
		id: 'phony',
		title: 'フォニイ',
		artist: 'ツミキ feat. 音楽的同位体 可不（KAFU）',
		versionId: 'festival',
		genre: 'niconico＆ボーカロイド',
		tone: 'violet',
	},
	{
		id: 'oshama-scramble',
		title: 'Oshama Scramble!',
		artist: 't+pazolite',
		versionId: 'orange-plus',
		genre: 'maimai',
		tone: 'amber',
	},
	{
		id: 'cycles',
		title: 'CYCLES',
		artist: 'Masayoshi Minoshima feat. 綾倉盟',
		versionId: 'green-plus',
		genre: 'maimai',
		tone: 'mint',
	},
	{
		id: 'mythos',
		title: 'MYTHOS',
		artist: 'Cranky feat. まらしぃ＆てっぺい先生',
		versionId: 'green-plus',
		genre: 'maimai',
		tone: 'blue',
	},
	{
		id: 'we-gonna-party',
		title: 'We Gonna Party',
		artist: 'Cranky',
		versionId: 'maimai-plus',
		genre: 'maimai',
		tone: 'coral',
	},
	{
		id: 'lionheart',
		title: 'Lionheart',
		artist: 'Masayoshi Minoshima',
		versionId: 'maimai-plus',
		genre: 'maimai',
		tone: 'graphite',
	},
	{
		id: 'sweets-sweets',
		title: 'Sweets×Sweets',
		artist: 'Team-D',
		versionId: 'maimai',
		genre: 'maimai',
		tone: 'coral',
	},
	{
		id: 'true-love-song',
		title: 'True Love Song',
		artist: 'Kai',
		versionId: 'maimai',
		genre: 'maimai',
		tone: 'blue',
	},
];

export const CHARTS: Chart[] = [
	{ id: 'dennou-basic-dx', songId: 'dennou-minmin-neko', type: 'DX', difficulty: 'BASIC', level: '2' },
	{ id: 'dennou-advanced-dx', songId: 'dennou-minmin-neko', type: 'DX', difficulty: 'ADVANCED', level: '6' },
	{ id: 'dennou-expert-dx', songId: 'dennou-minmin-neko', type: 'DX', difficulty: 'EXPERT', level: '10' },
	{ id: 'dennou-master-dx', songId: 'dennou-minmin-neko', type: 'DX', difficulty: 'MASTER', level: '13' },
	{ id: 'kousenka-basic-dx', songId: 'kousenka', type: 'DX', difficulty: 'BASIC', level: '2' },
	{ id: 'kousenka-advanced-dx', songId: 'kousenka', type: 'DX', difficulty: 'ADVANCED', level: '6' },
	{ id: 'kousenka-expert-dx', songId: 'kousenka', type: 'DX', difficulty: 'EXPERT', level: '10' },
	{ id: 'kousenka-master-dx', songId: 'kousenka', type: 'DX', difficulty: 'MASTER', level: '12+' },
	{ id: 'aishou-basic-dx', songId: 'aishou-yuushou-drops', type: 'DX', difficulty: 'BASIC', level: '3' },
	{ id: 'aishou-advanced-dx', songId: 'aishou-yuushou-drops', type: 'DX', difficulty: 'ADVANCED', level: '7' },
	{ id: 'aishou-expert-dx', songId: 'aishou-yuushou-drops', type: 'DX', difficulty: 'EXPERT', level: '10' },
	{ id: 'aishou-master-dx', songId: 'aishou-yuushou-drops', type: 'DX', difficulty: 'MASTER', level: '13' },
	{ id: 'donguri-basic-dx', songId: 'donguri-game', type: 'DX', difficulty: 'BASIC', level: '2' },
	{ id: 'donguri-advanced-dx', songId: 'donguri-game', type: 'DX', difficulty: 'ADVANCED', level: '6' },
	{ id: 'donguri-expert-dx', songId: 'donguri-game', type: 'DX', difficulty: 'EXPERT', level: '10' },
	{ id: 'donguri-master-dx', songId: 'donguri-game', type: 'DX', difficulty: 'MASTER', level: '13+', constant: 13.6 },
	{ id: 'ai-basic-dx', songId: 'ai-scream', type: 'DX', difficulty: 'BASIC', level: '2' },
	{ id: 'ai-advanced-dx', songId: 'ai-scream', type: 'DX', difficulty: 'ADVANCED', level: '6' },
	{ id: 'ai-expert-dx', songId: 'ai-scream', type: 'DX', difficulty: 'EXPERT', level: '9' },
	{ id: 'ai-master-dx', songId: 'ai-scream', type: 'DX', difficulty: 'MASTER', level: '11' },
	{ id: 'ai-remaster-dx', songId: 'ai-scream', type: 'DX', difficulty: 'Re:MASTER', level: '13', constant: 13.4 },
	{ id: 'noym-basic-dx', songId: 'no-one-yes-man', type: 'DX', difficulty: 'BASIC', level: '3' },
	{ id: 'noym-advanced-dx', songId: 'no-one-yes-man', type: 'DX', difficulty: 'ADVANCED', level: '7+' },
	{
		id: 'noym-expert-dx',
		songId: 'no-one-yes-man',
		type: 'DX',
		difficulty: 'EXPERT',
		level: '12',
		record: { achievement: '100.5362%', rank: 'SSS+' },
	},
	{ id: 'noym-master-dx', songId: 'no-one-yes-man', type: 'DX', difficulty: 'MASTER', level: '13+', constant: 13.9 },
	{ id: 'wanderer-basic-dx', songId: 'enchanted-wanderer', type: 'DX', difficulty: 'BASIC', level: '3' },
	{ id: 'wanderer-advanced-dx', songId: 'enchanted-wanderer', type: 'DX', difficulty: 'ADVANCED', level: '7' },
	{
		id: 'wanderer-expert-dx',
		songId: 'enchanted-wanderer',
		type: 'DX',
		difficulty: 'EXPERT',
		level: '12',
		constant: 12.0,
		record: { achievement: '100.9193%', rank: 'SSS+', combo: 'FC+' },
	},
	{ id: 'wanderer-master-dx', songId: 'enchanted-wanderer', type: 'DX', difficulty: 'MASTER', level: '13+', constant: 13.8 },
	{ id: 'phony-basic-dx', songId: 'phony', type: 'DX', difficulty: 'BASIC', level: '2' },
	{ id: 'phony-advanced-dx', songId: 'phony', type: 'DX', difficulty: 'ADVANCED', level: '6' },
	{ id: 'phony-expert-dx', songId: 'phony', type: 'DX', difficulty: 'EXPERT', level: '9+' },
	{
		id: 'phony-master-dx',
		songId: 'phony',
		type: 'DX',
		difficulty: 'MASTER',
		level: '11',
		constant: 11.5,
		record: { achievement: '100.6438%', rank: 'SSS+', combo: 'FC' },
	},
	{ id: 'phony-remaster-dx', songId: 'phony', type: 'DX', difficulty: 'Re:MASTER', level: '13', constant: 13.3 },
	{ id: 'oshama-basic-st', songId: 'oshama-scramble', type: 'STANDARD', difficulty: 'BASIC', level: '6' },
	{ id: 'oshama-advanced-st', songId: 'oshama-scramble', type: 'STANDARD', difficulty: 'ADVANCED', level: '9' },
	{ id: 'oshama-expert-st', songId: 'oshama-scramble', type: 'STANDARD', difficulty: 'EXPERT', level: '11+' },
	{ id: 'oshama-master-st', songId: 'oshama-scramble', type: 'STANDARD', difficulty: 'MASTER', level: '14' },
	{ id: 'cycles-basic-st', songId: 'cycles', type: 'STANDARD', difficulty: 'BASIC', level: '6' },
	{ id: 'cycles-advanced-st', songId: 'cycles', type: 'STANDARD', difficulty: 'ADVANCED', level: '8+' },
	{ id: 'cycles-expert-st', songId: 'cycles', type: 'STANDARD', difficulty: 'EXPERT', level: '10+' },
	{ id: 'cycles-master-st', songId: 'cycles', type: 'STANDARD', difficulty: 'MASTER', level: '13' },
	{ id: 'mythos-basic-st', songId: 'mythos', type: 'STANDARD', difficulty: 'BASIC', level: '5' },
	{ id: 'mythos-advanced-st', songId: 'mythos', type: 'STANDARD', difficulty: 'ADVANCED', level: '9' },
	{ id: 'mythos-expert-st', songId: 'mythos', type: 'STANDARD', difficulty: 'EXPERT', level: '12' },
	{ id: 'mythos-master-st', songId: 'mythos', type: 'STANDARD', difficulty: 'MASTER', level: '14' },
];

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
