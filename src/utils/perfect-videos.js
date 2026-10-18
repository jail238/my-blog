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

export function savePerfectVideoReturn(storage, path, now = Date.now()) {
  storage.setItem(PERFECT_VIDEO_RETURN_KEY, JSON.stringify({ path, at: now }));
}

export function consumePerfectVideoReturn(storage, base = '', now = Date.now()) {
  try {
    const raw = storage.getItem(PERFECT_VIDEO_RETURN_KEY);
    storage.removeItem(PERFECT_VIDEO_RETURN_KEY);
    const value = JSON.parse(raw ?? 'null');
    if (!value || !Number.isFinite(value.at) || now < value.at || now - value.at > 600_000) return null;
    const prefix = `${base}/songs/`;
    if (typeof value.path !== 'string' || !value.path.startsWith(prefix)) return null;
    return /^(maishift-)?[0-9]+\/$/.test(value.path.slice(prefix.length)) ? value.path : null;
  } catch { return null; }
}
