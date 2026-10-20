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
	assert.match(page, /`difficulty-\$\{difficultyClass\}`/);
	assert.match(css, /conic-gradient/);
	assert.match(css, /prefers-reduced-motion: reduce/);
	assert.match(css, /\.hall-collection \{ animation: none; \}/);
	const header = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
	assert.match(header, /path: '\/hall-of-fame\/', label: 'Hall of Fame'/);
});

test('Hall of Fame uses shared pastel badges with legible text and mobile optical centering', () => {
	const page = readFileSync(new URL('../src/pages/hall-of-fame/index.astro', import.meta.url), 'utf8');
	const css = readFileSync(new URL('../src/styles/hall-of-fame.css', import.meta.url), 'utf8');
	const global = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
	const luminance = (hex) => {
		const rgb = hex.match(/\w{2}/g).map((channel) => parseInt(channel, 16) / 255)
			.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
		return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
	};
	for (const difficulty of ['basic', 'advanced', 'expert', 'master', 'remaster']) {
		const rule = global.match(new RegExp(`\\.difficulty-${difficulty} \\{ background: (#\\w{6}); color: (#\\w{6}); \\}`));
		assert.ok(rule, `${difficulty} keeps its shared difficulty palette`);
		const background = luminance(rule[1].slice(1)), foreground = luminance(rule[2].slice(1));
		assert.ok(background > 0.75, `${difficulty} uses a light background`);
		assert.ok((background + 0.05) / (foreground + 0.05) >= 4.5, `${difficulty} text contrast is at least 4.5:1`);
	}
	assert.doesNotMatch(css, /\.hall-type-(?:basic|advanced|expert|master|remaster)\s*\{/);
	assert.match(page, /class="hall-type-label">\{typeLabel\}<\/span>/);
	assert.match(css, /height: 18px/);
	assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.hall-type-label \{ transform: translateY\(1px\); \}/);
});

test('each constant group can fold independently with native keyboard-accessible details', () => {
	const page = readFileSync(new URL('../src/pages/hall-of-fame/index.astro', import.meta.url), 'utf8');
	assert.match(page, /<details class="hall-group" open aria-labelledby=\{`constant-\$\{Math\.round\(constant \* 10\)\}`\} data-constant=\{constant\.toFixed\(1\)\}>/);
	assert.match(page, /<summary class="hall-group-heading">\s*<h2 id=/);
	assert.match(page, /import \{ ChevronDown \} from '@lucide\/astro'/);
	assert.match(page, /<ChevronDown class="hall-toggle-icon" aria-hidden="true" \/>/);
	const summary = page.split('<summary class="hall-group-heading">')[1].split('</summary>')[0];
	for (const text of ['constant.toFixed(1)', 'Lv {level}', '{perfectCharts.length}/{totalCount}']) assert.ok(summary.includes(text));
	assert.ok(page.indexOf('class="hall-jackets"') > page.indexOf('</summary>'));
	assert.doesNotMatch(page.match(/<details[^>]+>/)?.[0] ?? '', /\bname=/);
	assert.doesNotMatch(page, /<script|localStorage|\shidden=/);
});

test('fold arrows expose focus, hide duplicate native markers and respect reduced motion', () => {
	const css = readFileSync(new URL('../src/styles/hall-of-fame.css', import.meta.url), 'utf8');
	assert.match(css, /\.hall-group-heading \{[^}]*cursor: pointer;[^}]*list-style: none;[^}]*padding: 8px;/);
	assert.match(css, /\.hall-group-heading::-webkit-details-marker \{ display: none; \}/);
	assert.match(css, /\.hall-group-heading:focus-visible \{[^}]*outline: 2px solid/);
	assert.match(css, /\.hall-group:not\(\[open\]\) \.hall-toggle-icon \{ transform: rotate\(-90deg\); \}/);
	assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.hall-chart, \.hall-toggle-icon \{ transition: none; \}/);
});

test('Hall of Fame bands use pale multi-hue surfaces and thin shared rainbow dividers', () => {
	const css = readFileSync(new URL('../src/styles/hall-of-fame.css', import.meta.url), 'utf8');
	const bands = [...css.matchAll(/background: (linear-gradient\(115deg,[^;]+);/g)].map((match) => match[1]);
	assert.equal(bands.length, 2);
	for (const gradient of bands) {
		const colors = gradient.match(/#[\da-f]{8}/g);
		assert.equal(colors.length, 3);
		for (const color of colors) {
			const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
			assert.ok(Math.min(...channels) >= 230, `${color} stays light`);
			assert.ok(Math.max(...channels) - Math.min(...channels) <= 32, `${color} stays low saturation`);
		}
	}
	assert.match(css, /border-bottom: 1px solid transparent;\s*border-image: var\(--spectrum-progress\) 1;/);
	assert.doesNotMatch(css, /\.hall-group:nth-child\(odd\) \{ background: #ffffff|background: #f3f3f3|\.hall-group \{[^}]*filter:/);
});
