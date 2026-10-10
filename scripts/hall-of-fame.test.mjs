import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { hallOfFameGroups } from '../src/utils/hall-of-fame.js';

function chart(id, constant, combo, options = {}) {
	return {
		id, songId: id, type: 'DX', difficulty: 'EXPERT', versionId: 'test',
		constant, level: String(Math.floor(constant)),
		...(combo ? { record: { combo, achievementValue: 100.5, achievement: '100.5000%' } } : {}),
		...options,
	};
}

test('Hall of Fame counts AP and AP+ only, but includes every chart in the denominator', () => {
	const charts = [
		chart('ap', 10.5, 'AP'), chart('app', 10.5, 'AP+'),
		chart('fc', 10.5, 'FC+'), chart('unplayed', 10.5),
		chart('score-only', 10.5, 'FC', { record: { achievementValue: 101, achievement: '101.0000%', combo: 'FC' } }),
	];
	const [group] = hallOfFameGroups(charts);
	assert.equal(group.constant, 10.5);
	assert.equal(group.totalCount, 5);
	assert.deepEqual(group.perfectCharts.map(({ id }) => id), ['app', 'ap']);
	assert.equal(charts[0].id, 'ap', 'Do not mutate the shared catalog ordering');
});

test('Hall of Fame keeps ST, DX and all five difficulties as separate charts', () => {
	const charts = ['STANDARD', 'DX'].flatMap((type) =>
		['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'].map((difficulty) =>
			chart(`${type}-${difficulty}`, 11.6, 'AP', { type, difficulty, songId: 'same-song', level: '11+' }),
		),
	);
	const [group] = hallOfFameGroups(charts);
	assert.equal(group.level, '11+');
	assert.equal(group.totalCount, 10);
	assert.equal(group.perfectCharts.length, 10);
});

test('Hall of Fame covers both endpoints, preserves zero-AP groups and sorts descending', () => {
	const groups = hallOfFameGroups([
		chart('low', 1, 'AP'), chart('high', 15), chart('empty', 10.6, 'FC'),
		chart('middle-a', 10.7, 'AP'), chart('middle-b', 10.700000000000001, 'AP+'),
		chart('missing', undefined), chart('nan', NaN), chart('infinite', Infinity),
		chart('below', 0.9), chart('above', 15.1), chart('null', null), chart('string', '10.7'),
	]);
	assert.deepEqual(groups.map(({ constant }) => constant), [15, 10.7, 10.6, 1]);
	assert.equal(groups[1].totalCount, 2);
	assert.equal(groups[2].totalCount, 1);
	assert.deepEqual(groups[2].perfectCharts, []);
	assert.deepEqual(hallOfFameGroups([]), []);
});

test('Hall of Fame orders AP+ first, then percentage, with stable ties', () => {
	const groups = hallOfFameGroups([
		chart('ap-high', 5, 'AP', { record: { combo: 'AP', achievementValue: 101 } }),
		chart('app-low', 5, 'AP+', { record: { combo: 'AP+', achievementValue: 100.8 } }),
		chart('app-z', 5, 'AP+', { record: { combo: 'AP+', achievementValue: 100.9 } }),
		chart('app-a', 5, 'AP+', { record: { combo: 'AP+', achievementValue: 100.9 } }),
	]);
	assert.deepEqual(groups[0].perfectCharts.map(({ id }) => id), ['app-a', 'app-z', 'app-low', 'ap-high']);
});

test('Hall of Fame rebuilds all numerators and denominators from current snapshots', () => {
	const catalog = JSON.parse(readFileSync(new URL('../src/data/maimai.generated.json', import.meta.url), 'utf8'));
	const records = JSON.parse(readFileSync(new URL('../src/data/maishift.generated.json', import.meta.url), 'utf8'));
	const recordsById = new Map(records.records.map((record) => [record.chartId, record]));
	const charts = catalog.charts.map((item) => ({ ...item, record: recordsById.get(item.id) }));
	const groups = hallOfFameGroups(charts);
	assert.equal(groups.reduce((sum, group) => sum + group.totalCount, 0), charts.length);
	assert.equal(groups.reduce((sum, group) => sum + group.perfectCharts.length, 0),
		charts.filter((item) => ['AP', 'AP+'].includes(item.record?.combo)).length);
	assert.equal(new Set(groups.flatMap((group) => group.perfectCharts.map(({ id }) => id))).size,
		groups.reduce((sum, group) => sum + group.perfectCharts.length, 0));
	for (const group of groups) {
		assert.equal(group.totalCount, charts.filter((item) => item.constant.toFixed(1) === group.constant.toFixed(1)).length);
	}
	const next = hallOfFameGroups([...charts, chart('new-chart', 15, 'AP')]);
	assert.equal(next[0].totalCount, groups[0].totalCount + 1);
	assert.equal(next[0].perfectCharts.length, groups[0].perfectCharts.length + 1);
});

test('Hall of Fame offers accessible song links, exact scores, difficulty colors and reduced motion', () => {
	const page = readFileSync(new URL('../src/pages/hall-of-fame/index.astro', import.meta.url), 'utf8');
	assert.match(page, /hallOfFameGroups\(CHARTS\)/);
	assert.match(page, /\{perfectCharts\.length\}\/\{totalCount\}/);
	assert.match(page, /href=\{`\$\{base\}\/songs\/\$\{song\.id\}\/`\}/);
	assert.match(page, /aria-label=\{label\} title=\{label\}/);
	assert.match(page, /\{chart\.record\?\.achievement\}/);
	assert.doesNotMatch(page, /ComboIcon|SSS\+|average|combo-icon/i);
	const css = readFileSync(new URL('../src/styles/hall-of-fame.css', import.meta.url), 'utf8');
	for (const difficulty of ['basic', 'advanced', 'expert', 'master', 'remaster']) {
		assert.ok(css.includes(`.hall-type-${difficulty}`));
	}
	assert.match(css, /conic-gradient/);
	assert.match(css, /prefers-reduced-motion: reduce/);
	assert.match(css, /\.hall-collection \{ animation: none; \}/);
	const header = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
	assert.match(header, /\/hall-of-fame\/`\}>Hall of Fame<\/HeaderLink>/);
});
