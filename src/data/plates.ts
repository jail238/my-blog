import { CHARTS, versionById } from './maimai';

export interface PlateGroup {
	id: string;
	prefix: string;
	name: string;
	versionIds: string[];
	order: number;
}

export const PLATE_GOAL = {
	suffix: '神',
	shortLabel: 'AP',
	condition: 'ALL PERFECT 이상',
} as const;

const plateGroupDefinitions = [
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
] as const satisfies readonly {
	id: string;
	prefix: string;
	versionIds: readonly string[];
}[];

function groupName(versionIds: readonly string[]) {
	return versionIds.map((versionId) => versionById.get(versionId)?.shortName ?? versionId).join(' / ');
}

export const PLATE_GROUPS: PlateGroup[] = plateGroupDefinitions
	.map((definition) => ({
		...definition,
		versionIds: [...definition.versionIds],
		name: groupName(definition.versionIds),
		order: Math.max(...definition.versionIds.map((versionId) => versionById.get(versionId)?.order ?? 0)),
	}))
	.sort((a, b) => a.order - b.order);

export function plateCharts(group: PlateGroup) {
	return CHARTS.filter(
		(chart) => group.versionIds.includes(chart.versionId) && chart.difficulty !== 'Re:MASTER',
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
