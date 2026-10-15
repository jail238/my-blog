import { searchMatches } from './catalog-search.js';

export const SSS_PLUS_TARGET = 1_005_000;
export const RECOMMENDATION_MODES = ['push', 'explore', 'study'];

export function validAchievement(record) {
  const value = record?.achievementValue;
  return Number.isInteger(value) && value >= 0 && value <= 1_010_000 ? value : null;
}

export function isSssPlus(chart) {
  const value = validAchievement(chart.record);
  return value !== null && value >= SSS_PLUS_TARGET;
}

export function percentage(value) {
  return (value / 10_000).toFixed(4);
}

export function indexStudies(charts, songs, studies, sources, skills) {
  const byChart = new Map(charts.map((chart) => [chart.id, chart]));
  const bySong = new Map(songs.map((song) => [song.id, song]));
  const result = new Map();
  for (const study of studies) {
    const chart = byChart.get(study.chartId);
    if (!chart) continue;
    if (bySong.get(chart.songId)?.title !== study.title) throw new Error(`Study identity mismatch: ${study.chartId}`);
    const suffix = `${chart.songId}-${chart.type === 'STANDARD' ? 'standard' : 'dx'}-${chart.difficulty.toLowerCase().replace(':', '')}`;
    if (chart.id !== suffix || result.has(chart.id)) throw new Error(`Invalid study chart: ${chart.id}`);
    if (!sources[study.source] || !study.skills.length || study.skills.some((skill) => !skills[skill])) {
      throw new Error(`Invalid study source or pattern: ${chart.id}`);
    }
    result.set(chart.id, study);
  }
  return result;
}

function hasConstant(chart) {
  return Number.isFinite(chart.constant) && chart.constant >= 1 && chart.constant <= 15;
}

function comparableClears(chart, clears) {
  const difficulty = clears.filter((other) => other.difficulty === chart.difficulty);
  const sameType = difficulty.filter((other) => other.type === chart.type);
  return sameType.length >= 3 ? sameType : difficulty;
}

export function buildRecommendations(charts, studies = new Map()) {
  const clears = charts.filter((chart) => isSssPlus(chart) && hasConstant(chart));
  const items = [];
  for (const chart of charts) {
    if (isSssPlus(chart)) continue;
    // A malformed retained record is neither a verified score nor a new chart.
    const achievement = validAchievement(chart.record);
    if (chart.record && achievement === null) continue;
    const pool = comparableClears(chart, clears).sort((a, b) => b.constant - a.constant || a.id.localeCompare(b.id));
    const baseline = pool.length >= 3 ? pool[Math.min(2, pool.length - 1)].constant : null;
    const study = studies.get(chart.id);
    const references = hasConstant(chart) ? [...pool].sort((a, b) =>
      Math.abs(a.constant - chart.constant) - Math.abs(b.constant - chart.constant) ||
      b.record.achievementValue - a.record.achievementValue || a.id.localeCompare(b.id),
    ).slice(0, 3) : [];
    const sharedSkills = (study?.skills ?? []).filter((skill) => references.some((other) => studies.get(other.id)?.skills.includes(skill)));
    const eligibleExplore = !chart.record && hasConstant(chart) && baseline !== null &&
      Math.round(chart.constant * 10) >= Math.round(baseline * 10) - 5 &&
      Math.round(chart.constant * 10) <= Math.round(baseline * 10) + 2;
    const modes = [];
    if (achievement !== null) modes.push('push');
    if (eligibleExplore) modes.push('explore');
    if (study) modes.push('study');
    if (!modes.length) continue;
    items.push({ chart, achievement, gap: achievement === null ? null : SSS_PLUS_TARGET - achievement, baseline, references, sharedSkills, study, modes });
  }
  return items;
}

export function filterRecommendations(items, { mode = 'push', query = '', difficulty = '', type = '', skill = '', sort = 'recommended' } = {}) {
  const filtered = items.filter((item) => item.modes.includes(mode) &&
    (!difficulty || item.difficulty === difficulty) && (!type || item.type === type) &&
    (!skill || item.skills.includes(skill)) && searchMatches(item.searchIndex, query));
  return filtered.sort((a, b) => {
    if (sort === 'constant') return (b.constant ?? -1) - (a.constant ?? -1) || a.id.localeCompare(b.id);
    if (mode === 'push') return a.gap - b.gap || (b.constant ?? -1) - (a.constant ?? -1) || a.id.localeCompare(b.id);
    return b.sharedSkills.length - a.sharedSkills.length ||
      (a.baseline === null ? Infinity : Math.abs(a.constant - a.baseline)) - (b.baseline === null ? Infinity : Math.abs(b.constant - b.baseline)) ||
      (a.constant ?? Infinity) - (b.constant ?? Infinity) || a.id.localeCompare(b.id);
  });
}

export function recommendationPage(items, page = 1, pageSize = 30) {
  const size = [30, 50, 100].includes(pageSize) ? pageSize : 30;
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(pages, Math.max(1, Number.isInteger(page) ? page : 1));
  const start = (current - 1) * size;
  return { items: items.slice(start, start + size), page: current, pages, total: items.length, start: items.length ? start + 1 : 0, end: Math.min(start + size, items.length) };
}

export function recommendationReason(item) {
  if (item.achievement !== null) return `${percentage(item.gap)}% to SSS+`;
  if (item.modes.includes('explore')) return `Near your SSS+ results at ${item.baseline.toFixed(1)}`;
  return 'Source-backed pattern study';
}

export function plannerRecommendationUrl(base, chartId) {
  return `${base}/planner/?${new URLSearchParams({ chart: chartId, target: 'SSS+' })}`;
}

export function plannerChartRequest(href, charts) {
  const url = new URL(href);
  if (url.searchParams.get('target') !== 'SSS+') return null;
  const chart = charts.find((item) => item.id === url.searchParams.get('chart'));
  return chart ? { chart, target: 'SSS+' } : null;
}
