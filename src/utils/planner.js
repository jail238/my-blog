export const PLANNER_TARGETS = ['AP', 'SSS+'];
export const PLANNER_STATUSES = ['pending', 'completed', 'skipped'];

export function normalizeSearch(value = '') {
  return value.normalize('NFKC').toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60))
    .replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

export function songMatches(song, query) {
  const haystack = normalizeSearch([song.title, song.koreanTitle, song.artist, ...(song.aliases ?? [])].filter(Boolean).join(' ')).replaceAll(' ', '');
  return normalizeSearch(query).split(' ').every((term) => haystack.includes(term));
}

export function isDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '2000-01-01' && value <= '2099-12-31';
}

export function todayInKorea(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function monthCells(month) {
  if (!isDateKey(`${month}-01`)) throw new Error('Invalid calendar month.');
  const first = new Date(`${month}-01T00:00:00Z`);
  const start = first.getTime() - first.getUTCDay() * 86_400_000;
  return Array.from({ length: 42 }, (_, index) => new Date(start + index * 86_400_000).toISOString().slice(0, 10));
}

export function shiftMonth(month, amount) {
  if (!isDateKey(`${month}-01`)) throw new Error('Invalid calendar month.');
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

export function statusOnDate(entry, date) {
  return entry.resolved_date && entry.resolved_date <= date ? entry.status : 'pending';
}

export function entriesOnDate(entries, date, { target = '', status = '' } = {}) {
  if (!isDateKey(date)) return [];
  return entries.filter((entry) => !entry.deleted_at && entry.start_date <= date && (!entry.resolved_date || date <= entry.resolved_date)
    && (!target || entry.target === target) && (!status || statusOnDate(entry, date) === status))
    .sort((a, b) => Number(statusOnDate(a, date) !== 'pending') - Number(statusOnDate(b, date) !== 'pending')
      || a.start_date.localeCompare(b.start_date) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

export function hasOpenGoal(entries, chartId, target) {
  return entries.some((entry) => !entry.deleted_at && entry.chart_id === chartId && entry.target === target && entry.status === 'pending');
}

export function editChange(entry, target, startDate) {
  if (entry.deleted_at) throw new Error('This goal was deleted.');
  if (!PLANNER_TARGETS.includes(target)) throw new Error('Choose AP or SSS+.');
  if (!isDateKey(startDate)) throw new Error('Choose a valid date.');
  if (entry.resolved_date && startDate > entry.resolved_date) throw new Error(`Date must be on or before ${entry.resolved_date}.`);
  return { target, start_date: startDate };
}

export function statusChange(entry, status, date) {
  if (entry.deleted_at || !PLANNER_STATUSES.includes(status) || !isDateKey(date) || date < entry.start_date) throw new Error('Invalid status change.');
  return { status, resolved_date: status === 'pending' ? null : date };
}

export function recordMeetsTarget(record, target) {
  if (!record) return false;
  return target === 'AP' ? ['AP', 'AP+'].includes(record.combo) : target === 'SSS+' && record.achievementValue >= 100.5;
}
