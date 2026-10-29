import { normalizePerfectVideoUrl, perfectVideoChartMatches } from './perfect-videos.js';

export function perfectVideoThumbnailUrl(value) {
  const url = new URL(normalizePerfectVideoUrl(value));
  return `https://i.ytimg.com/vi/${url.searchParams.get('v')}/mqdefault.jpg`;
}

export function perfectVideoCollection(charts, videos, filters = {}) {
  const timestamp = (chart) => Date.parse(videos.get(chart.id)?.updated_at ?? '') || 0;
  const constant = (chart) => Number.isFinite(Number(chart.constant)) ? Number(chart.constant) : 0;
  const titleOrder = (a, b) => a.title.localeCompare(b.title, 'en', { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id);
  return charts.filter((chart) => perfectVideoChartMatches(chart, { ...filters, linked: 'linked' }, videos.get(chart.id)))
    .sort((a, b) => (filters.sort === 'title' ? 0 : filters.sort === 'level' ? constant(b) - constant(a) : timestamp(b) - timestamp(a)) || titleOrder(a, b));
}
