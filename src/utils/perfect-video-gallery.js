import { perfectVideoChartMatches } from './perfect-videos.js';

const savedDateFormatter = new Intl.DateTimeFormat('en', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function perfectVideoSavedDate(video) {
  const timestamp = Date.parse(video?.updated_at ?? '');
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  const parts = Object.fromEntries(savedDateFormatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return { dateTime: date.toISOString(), label: `${parts.year}.${parts.month}.${parts.day}` };
}

export function perfectVideoCollection(charts, videos, filters = {}) {
  const timestamp = (chart) => Date.parse(videos.get(chart.id)?.updated_at ?? '') || 0;
  const constant = (chart) => Number.isFinite(Number(chart.constant)) ? Number(chart.constant) : 0;
  const titleOrder = (a, b) => a.title.localeCompare(b.title, 'en', { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id);
  return charts.filter((chart) => perfectVideoChartMatches(chart, { ...filters, linked: 'linked' }, videos.get(chart.id)))
    .sort((a, b) => (filters.sort === 'title' ? 0 : filters.sort === 'level' ? constant(b) - constant(a) : timestamp(b) - timestamp(a)) || titleOrder(a, b));
}
