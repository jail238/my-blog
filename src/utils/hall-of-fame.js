/** @typedef {import('../data/maimai').Chart} Chart */

/**
 * @param {readonly Chart[]} charts
 * @returns {{ constant: number, level: string, totalCount: number, perfectCharts: Chart[] }[]}
 */
export function hallOfFameGroups(charts) {
	/** @type {Map<number, { constant: number, level: string, totalCount: number, perfectCharts: Chart[] }>} */
	const groups = new Map();
	for (const chart of charts) {
		if (typeof chart.constant !== 'number' || !Number.isFinite(chart.constant)) continue;
		if (chart.constant < 1 || chart.constant > 15) continue;
		const tenths = Math.round(chart.constant * 10);
		let group = groups.get(tenths);
		if (!group) {
			group = { constant: tenths / 10, level: chart.level, totalCount: 0, perfectCharts: [] };
			groups.set(tenths, group);
		}
		group.totalCount += 1;
		if (chart.record?.combo === 'AP' || chart.record?.combo === 'AP+') group.perfectCharts.push(chart);
	}

	for (const group of groups.values()) {
		group.perfectCharts.sort((a, b) =>
			Number(b.record?.combo === 'AP+') - Number(a.record?.combo === 'AP+') ||
			(b.record?.achievementValue ?? 0) - (a.record?.achievementValue ?? 0) ||
			a.id.localeCompare(b.id),
		);
	}
	return [...groups.values()].sort((a, b) => b.constant - a.constant);
}
