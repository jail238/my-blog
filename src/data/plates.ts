import { CHARTS, versionById, type ChartType } from './maimai';

export interface PlateGroup {
	id: string;
	prefix: string;
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
	{ id: 'maimai', prefix: '真', versionIds: ['maimai', 'maimai-plus'] },
	{ id: 'green', prefix: '超', versionIds: ['green'] },
	{ id: 'green-plus', prefix: '檄', versionIds: ['green-plus'] },
	{ id: 'orange', prefix: '橙', versionIds: ['orange'] },
	{ id: 'orange-plus', prefix: '暁', versionIds: ['orange-plus'] },
	{ id: 'pink', prefix: '桃', versionIds: ['pink'] },
	{ id: 'pink-plus', prefix: '櫻', versionIds: ['pink-plus'] },
	{ id: 'murasaki', prefix: '紫', versionIds: ['murasaki'] },
	{ id: 'murasaki-plus', prefix: '菫', versionIds: ['murasaki-plus'] },
	{ id: 'milk', prefix: '白', versionIds: ['milk'] },
	{ id: 'milk-plus', prefix: '雪', versionIds: ['milk-plus'] },
	{ id: 'finale', prefix: '輝', versionIds: ['finale'] },
	{
		id: 'mai',
		prefix: '舞',
		versionIds: classicVersionIds,
		displayName: 'maimai–FiNALE · ST',
		includeReMaster: true,
		chartType: 'STANDARD',
		orderOffset: 0.5,
	},
	{ id: 'dx', prefix: '熊', versionIds: ['dx'] },
	{ id: 'dx-plus', prefix: '華', versionIds: ['dx-plus'] },
	{ id: 'splash', prefix: '爽', versionIds: ['splash'] },
	{ id: 'splash-plus', prefix: '煌', versionIds: ['splash-plus'] },
	{ id: 'universe', prefix: '宙', versionIds: ['universe'] },
	{ id: 'universe-plus', prefix: '星', versionIds: ['universe-plus'] },
	{ id: 'festival', prefix: '祭', versionIds: ['festival'] },
	{ id: 'festival-plus', prefix: '祝', versionIds: ['festival-plus'] },
	{ id: 'buddies', prefix: '双', versionIds: ['buddies'] },
	{ id: 'buddies-plus', prefix: '宴', versionIds: ['buddies-plus'] },
	{ id: 'prism', prefix: '鏡', versionIds: ['prism'] },
	{ id: 'prism-plus', prefix: '彩', versionIds: ['prism-plus'] },
	{ id: 'circle', prefix: '丸', versionIds: ['circle'] },
	{ id: 'circle-plus', prefix: '廻', versionIds: ['circle-plus'] },
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
