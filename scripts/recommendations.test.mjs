import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CHART_STUDIES, STUDY_SOURCES, STUDY_SKILLS } from '../src/data/chart-study.js';
import { songSearchIndex } from '../src/utils/catalog-search.js';
import { SSS_PLUS_TARGET, buildRecommendations, filterRecommendations, indexStudies, isSssPlus, percentage, plannerChartRequest, plannerRecommendationUrl, recommendationPage, validAchievement } from '../src/utils/recommendations.js';
import { finishPlannerSignIn, plannerRedirectUrl } from '../src/utils/planner-auth.js';

const chart = (id, constant, achievementValue, overrides = {}) => ({ id, songId: id, type: 'DX', difficulty: 'MASTER', constant, level: '13', ...(achievementValue === undefined ? {} : { record: { achievementValue } }), ...overrides });
const clear = (id, constant, overrides) => chart(id, constant, SSS_PLUS_TARGET, overrides);
const clears = [clear('a', 13.5), clear('b', 13.4), clear('c', 13.3), clear('d', 13.2), clear('e', 13.1)];

function dto(item) {
  return { id: item.chart.id, difficulty: item.chart.difficulty, type: item.chart.type,
    constant: item.chart.constant ?? null, achievement: item.achievement, gap: item.gap, baseline: item.baseline,
    modes: item.modes, skills: item.study?.skills ?? [], sharedSkills: item.sharedSkills, searchIndex: songSearchIndex({ title: 'ウミユリ海底譚', koreanTitle: '우미유리 해저담', artist: 'n-buna' }) };
}

test('SSS+ uses the fixed-point 100.5000% boundary, not rank text or AP status', () => {
  assert.equal(SSS_PLUS_TARGET, 1_005_000);
  assert.equal(isSssPlus(chart('below', 13, 1_004_999)), false);
  assert.equal(isSssPlus(chart('exact', 13, 1_005_000, { record: { achievementValue: 1_005_000, combo: 'FC' } })), true);
  assert.equal(isSssPlus(chart('ap', 13, 1_004_999, { record: { achievementValue: 1_004_999, combo: 'AP', rank: 'SSS+' } })), false);
  assert.equal(percentage(1_004_999), '100.4999');
  assert.equal(percentage(1), '0.0001');
  for (const achievementValue of [NaN, Infinity, -1, 1_010_001, '1005000', 100.5]) assert.equal(validAchievement({ achievementValue }), null);
});

test('achieved charts and invalid retained scores never leak into targets', () => {
  const input = [...clears, chart('close', 13.4, 1_004_999), chart('zero', 12, 0), chart('invalid', 13.2, NaN), chart('unknown', 13.2)];
  const result = buildRecommendations(input);
  assert.deepEqual(result.map((item) => item.chart.id).sort(), ['close', 'unknown', 'zero']);
  assert.deepEqual(result.find((item) => item.chart.id === 'unknown').modes, ['explore']);
  assert.equal(result.find((item) => item.chart.id === 'zero').achievement, 0);
  assert.equal(result.find((item) => item.chart.id === 'close').gap, 1);
  assert.equal(input[0].id, 'a', 'Input order must not mutate');
});

test('similar-level targets need three same-difficulty clears and resist a single high outlier', () => {
  assert.deepEqual(buildRecommendations([clear('a', 13), clear('b', 13), chart('unknown', 13.1)]), []);
  assert.deepEqual(buildRecommendations([...clears, chart('basic', 3, undefined, { difficulty: 'BASIC' })]), []);
  const result = buildRecommendations([...clears, clear('outlier', 15), chart('near', 13.6), chart('too-high', 13.7), chart('too-low', 12.8), chart('edge-low', 12.9)]);
  assert.deepEqual(result.map((item) => item.chart.id).sort(), ['edge-low', 'near']);
  assert.equal(result[0].baseline, 13.4);
  assert.ok(result[0].references.every(isSssPlus));
});

test('chart format is preferred for comparisons and sparse formats are explicitly retained', () => {
  const result = buildRecommendations([...clears, clear('st1', 12, { type: 'STANDARD' }), clear('st2', 12.1, { type: 'STANDARD' }), clear('st3', 12.2, { type: 'STANDARD' }), chart('st', 12.1, undefined, { type: 'STANDARD' })]);
  const item = result.find((item) => item.chart.id === 'st');
  assert.ok(item.references.every((reference) => reference.type === 'STANDARD'));
  assert.equal(item.baseline, 12);
});

test('pattern study does not label missing notes as absence or auto-assign nearby chart skills', () => {
  const studies = new Map([['a', { skills: ['slide-timing'] }], ['reviewed', { skills: ['slide-timing'], note: 'Timing', source: 'wiki' }]]);
  const items = buildRecommendations([...clears, chart('reviewed', 13.4), chart('unreviewed', 13.4)], studies);
  assert.deepEqual(items.find((item) => item.chart.id === 'reviewed').sharedSkills, ['slide-timing']);
  assert.deepEqual(items.find((item) => item.chart.id === 'unreviewed').sharedSkills, []);
  assert.ok(items.find((item) => item.chart.id === 'reviewed').modes.includes('study'));
  assert.equal(items.find((item) => item.chart.id === 'unreviewed').study, undefined);
});

test('current curated notes match exact song, chart format, difficulty and attributed sources', () => {
  const catalog = JSON.parse(readFileSync(new URL('../src/data/maimai.generated.json', import.meta.url)));
  const studies = indexStudies(catalog.charts, catalog.songs, CHART_STUDIES, STUDY_SOURCES, STUDY_SKILLS);
  const catalogIds = new Set(catalog.charts.map((chart) => chart.id));
  assert.equal(studies.size, CHART_STUDIES.filter((study) => catalogIds.has(study.chartId)).length);
  assert.equal(studies.has('185-dx-master'), false, 'ST notes must not spill into DX');
  assert.equal(studies.has('226-standard-remaster'), false, 'MASTER notes must not spill into Re:MASTER');
  for (const source of Object.values(STUDY_SOURCES)) assert.equal(new URL(source.url).protocol, 'https:');
  const study = CHART_STUDIES[0];
  const withoutChart = indexStudies(catalog.charts.filter((chart) => chart.id !== study.chartId), catalog.songs, CHART_STUDIES, STUDY_SOURCES, STUDY_SKILLS);
  assert.equal(withoutChart.has(study.chartId), false, 'Removed catalog charts must not break weekly updates');
  assert.throws(() => indexStudies(catalog.charts, catalog.songs, [{ ...study, title: 'wrong' }], STUDY_SOURCES, STUDY_SKILLS), /identity mismatch/);
  assert.throws(() => indexStudies(catalog.charts, catalog.songs, [study, study], STUDY_SOURCES, STUDY_SKILLS), /Invalid study chart/);
  assert.throws(() => indexStudies(catalog.charts, catalog.songs, [{ ...study, skills: ['invented'] }], STUDY_SOURCES, STUDY_SKILLS), /Invalid study source/);
});

test('filters support multilingual titles, independent modes and stable nearest-target ordering', () => {
  const items = buildRecommendations([...clears, chart('far', 13, 999_000), chart('close', 13.4, 1_004_999), chart('unknown', 13.2)]).map(dto);
  for (const query of ['우미유리해저담', 'ウミユリ', 'n-buna']) {
    assert.deepEqual(filterRecommendations(items, { query }).map((item) => item.id), ['close', 'far']);
  }
  assert.deepEqual(filterRecommendations(items, { mode: 'explore' }).map((item) => item.id), ['unknown']);
  assert.equal(filterRecommendations(items, { difficulty: 'BASIC' }).length, 0);
  assert.equal(filterRecommendations(items, { skill: 'slide-timing' }).length, 0);
  assert.equal(filterRecommendations(items, { query: 'no-such-song' }).length, 0);
  assert.equal(items[0].id, 'far');
});

test('pagination clamps pages, supports 30/50/100, and represents empty results', () => {
  const items = Array.from({ length: 151 }, (_, id) => ({ id }));
  for (const size of [30, 50, 100]) assert.equal(recommendationPage(items, 1, size).items.length, size);
  assert.deepEqual(recommendationPage(items, 99, 50), { items: [{ id: 150 }], page: 4, pages: 4, total: 151, start: 151, end: 151 });
  assert.equal(recommendationPage(items, -1, 999).items.length, 30);
  assert.deepEqual(recommendationPage([], 2), { items: [], page: 1, pages: 1, total: 0, start: 0, end: 0 });
});

test('Planner handoff preselects an exact SSS+ chart without arbitrary redirects or writes', () => {
  const chart = { id: '185-standard-master', difficulty: 'MASTER', type: 'STANDARD' };
  const path = plannerRecommendationUrl('/archive', chart.id);
  assert.equal(path, '/archive/planner/?chart=185-standard-master&target=SSS%2B');
  assert.deepEqual(plannerChartRequest(`https://example.com${path}`, [chart]), { chart, target: 'SSS+' });
  assert.equal(plannerChartRequest('https://example.com/planner/?chart=missing&target=SSS%2B', [chart]), null);
  assert.equal(plannerChartRequest('https://example.com/planner/?chart=185-standard-master&target=AP', [chart]), null);
  assert.equal(plannerRedirectUrl(`https://example.com${path}&next=https://evil.example/#token`), `https://example.com${path}`);
  assert.equal(plannerRedirectUrl('https://example.com/planner/?chart=https://evil.example&target=SSS%2B'), 'https://example.com/planner/');
});

test('OAuth callback removes credentials while retaining the exact SSS+ handoff', async () => {
  let replacement;
  let exchanged;
  await finishPlannerSignIn({ exchangeCodeForSession: async (code) => { exchanged = code; return { error: null }; } },
    'https://example.com/planner/?chart=185-standard-master&target=SSS%2B&code=test-code#temporary',
    (url) => { replacement = url; });
  assert.equal(exchanged, 'test-code');
  assert.equal(replacement, '/planner/?chart=185-standard-master&target=SSS%2B');
});

test('recommendation data and interface remain separate from existing catalogs and private plans', () => {
  const root = new URL('../', import.meta.url);
  const page = readFileSync(new URL('src/pages/recommendations/index.astro', root), 'utf8');
  const adapter = readFileSync(new URL('src/data/recommendations.ts', root), 'utf8');
  assert.match(page, /Sources &amp; scope/);
  assert.match(page, /replace\(/);
  assert.doesNotMatch(adapter, /planner-cloud|service_role|maishiftTrackId|profileUrl|handle/);
  for (const file of ['src/components/ChartRow.astro', 'src/components/SongRow.astro', 'src/pages/songs/[song].astro']) {
    assert.doesNotMatch(readFileSync(new URL(file, root), 'utf8'), /chart-study|recommendationItems/);
  }
  const header = readFileSync(new URL('src/components/Header.astro', root), 'utf8');
  assert.match(header, /path: '\/recommendations\/', label: 'Recommend'/);
});
