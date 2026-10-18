import { searchMatches } from './catalog-search.js';

export function isPerfectRecord(record) {
  return record?.combo === 'AP' || record?.combo === 'AP+';
}

export function normalizePerfectVideoUrl(value) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error('Enter a valid YouTube video URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error('Use an HTTPS YouTube video URL.');
  }
  let id;
  if (url.hostname === 'youtu.be') {
    id = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    id = url.pathname === '/watch'
      ? url.searchParams.get('v')
      : url.pathname.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Use a YouTube video or Shorts link, not a channel or playlist.');
  return `https://www.youtube.com/watch?v=${id}`;
}

export function visiblePerfectVideo(record, video) {
  if (!isPerfectRecord(record) || !video || video.deleted_at) return null;
  try { return normalizePerfectVideoUrl(video.url); } catch { return null; }
}

export const PERFECT_VIDEO_RETURN_KEY = 'msk-perfect-video-return';

export function perfectVideoChartMatches(chart, { query = '', type = '', difficulty = '', linked = '' } = {}, video) {
  const hasVideo = !!visiblePerfectVideo({ combo: chart.combo }, video);
  return isPerfectRecord({ combo: chart.combo }) && searchMatches(chart.search, query)
    && (!type || chart.type === type) && (!difficulty || chart.difficulty === difficulty)
    && (!linked || (linked === 'linked' ? hasVideo : !hasVideo));
}

export function savePerfectVideoReturn(storage, path, now = Date.now()) {
  storage.setItem(PERFECT_VIDEO_RETURN_KEY, JSON.stringify({ path, at: now }));
}

export function consumePerfectVideoReturn(storage, base = '', now = Date.now()) {
  try {
    const raw = storage.getItem(PERFECT_VIDEO_RETURN_KEY);
    storage.removeItem(PERFECT_VIDEO_RETURN_KEY);
    const value = JSON.parse(raw ?? 'null');
    if (!value || !Number.isFinite(value.at) || now < value.at || now - value.at > 600_000) return null;
    return value.path === `${base}/videos/` ? value.path : null;
  } catch { return null; }
}
