import { CHARTS, versionById, type ChartType } from './maimai';

export interface PlateGroup {
	id: string;
	prefix: string;
	assetId: number;
	name: string;
	displayName?: string;
	versionIds: string[];
	includeReMaster: boolean;
	chartType?: ChartType;
	order: number;
}

interface PlateGroupDefinition {
	id: string;
	prefix: string;
	assetId: number;
	versionIds: readonly string[];
	displayName?: string;
	includeReMaster?: boolean;
	chartType?: ChartType;
	orderOffset?: number;
}

export const PLATE_GOAL = {
	suffix: '神',
	shortLabel: 'AP',
	condition: 'ALL PERFECT 이상',
} as const;

const classicVersionIds = [
	'maimai',
	'maimai-plus',
	'green',
	'green-plus',
	'orange',
	'orange-plus',
	'pink',
	'pink-plus',
	'murasaki',
	'murasaki-plus',
	'milk',
	'milk-plus',
	'finale',
] as const;

const plateGroupDefinitions: readonly PlateGroupDefinition[] = [
	{ id: 'maimai', prefix: '真', assetId: 6102, versionIds: ['maimai', 'maimai-plus'] },
	{ id: 'green', prefix: '超', assetId: 6106, versionIds: ['green'] },
	{ id: 'green-plus', prefix: '檄', assetId: 6110, versionIds: ['green-plus'] },
	{ id: 'orange', prefix: '橙', assetId: 6114, versionIds: ['orange'] },
	{ id: 'orange-plus', prefix: '暁', assetId: 6118, versionIds: ['orange-plus'] },
	{ id: 'pink', prefix: '桃', assetId: 6122, versionIds: ['pink'] },
	{ id: 'pink-plus', prefix: '櫻', assetId: 6126, versionIds: ['pink-plus'] },
	{ id: 'murasaki', prefix: '紫', assetId: 6130, versionIds: ['murasaki'] },
	{ id: 'murasaki-plus', prefix: '菫', assetId: 6134, versionIds: ['murasaki-plus'] },
	{ id: 'milk', prefix: '白', assetId: 6138, versionIds: ['milk'] },
	{ id: 'milk-plus', prefix: '雪', assetId: 6142, versionIds: ['milk-plus'] },
	{ id: 'finale', prefix: '輝', assetId: 6146, versionIds: ['finale'] },
	{
		id: 'mai',
		prefix: '舞',
		assetId: 6151,
		versionIds: classicVersionIds,
		displayName: 'maimai–FiNALE · ST',
		includeReMaster: true,
		chartType: 'STANDARD',
		orderOffset: 0.5,
	},
	{ id: 'dx', prefix: '熊', assetId: 55103, versionIds: ['dx'] },
	{ id: 'dx-plus', prefix: '華', assetId: 109103, versionIds: ['dx-plus'] },
	{ id: 'splash', prefix: '爽', assetId: 159103, versionIds: ['splash'] },
	{ id: 'splash-plus', prefix: '煌', assetId: 209103, versionIds: ['splash-plus'] },
	{ id: 'universe', prefix: '宙', assetId: 259103, versionIds: ['universe'] },
	{ id: 'universe-plus', prefix: '星', assetId: 309103, versionIds: ['universe-plus'] },
	{ id: 'festival', prefix: '祭', assetId: 359103, versionIds: ['festival'] },
	{ id: 'festival-plus', prefix: '祝', assetId: 409103, versionIds: ['festival-plus'] },
	{ id: 'buddies', prefix: '双', assetId: 459103, versionIds: ['buddies'] },
	{ id: 'buddies-plus', prefix: '宴', assetId: 509103, versionIds: ['buddies-plus'] },
	{ id: 'prism', prefix: '鏡', assetId: 559103, versionIds: ['prism'] },
	{ id: 'prism-plus', prefix: '彩', assetId: 609103, versionIds: ['prism-plus'] },
	{ id: 'circle', prefix: '丸', assetId: 659103, versionIds: ['circle'] },
	{ id: 'circle-plus', prefix: '廻', assetId: 709103, versionIds: ['circle-plus'] },
];

function groupName(versionIds: readonly string[]) {
	return versionIds.map((versionId) => versionById.get(versionId)?.shortName ?? versionId).join(' / ');
}

export const PLATE_GROUPS: PlateGroup[] = plateGroupDefinitions
	.map((definition) => ({
		...definition,
		versionIds: [...definition.versionIds],
		name: definition.displayName ?? groupName(definition.versionIds),
		includeReMaster: definition.includeReMaster ?? false,
		order:
			Math.max(...definition.versionIds.map((versionId) => versionById.get(versionId)?.order ?? 0)) +
			(definition.orderOffset ?? 0),
	}))
	.sort((a, b) => a.order - b.order);

export function plateCharts(group: PlateGroup) {
	return CHARTS.filter(
		(chart) =>
			group.versionIds.includes(chart.versionId) &&
			(group.chartType === undefined || chart.type === group.chartType) &&
			(group.includeReMaster || chart.difficulty !== 'Re:MASTER'),
	);
}

export function plateProgress(group: PlateGroup) {
	const charts = plateCharts(group);
	const completedCount = charts.filter(
		(chart) => chart.record?.combo === 'AP' || chart.record?.combo === 'AP+',
	).length;

	return {
		group,
		totalCount: charts.length,
		completedCount,
		complete: charts.length > 0 && completedCount === charts.length,
		rate: charts.length > 0 ? (completedCount / charts.length) * 100 : 0,
	};
}
