import { loadPerfectVideos } from '../utils/perfect-videos-cloud';
import { visiblePerfectVideo } from '../utils/perfect-videos.js';

export function initializePerfectVideoLinks() {
  const nodes = [...document.querySelectorAll<HTMLElement>('[data-perfect-video-chart]')];
  if (!nodes.length) return;
  let loading = false;
  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      const videos = new Map((await loadPerfectVideos(nodes.map((node) => node.dataset.perfectVideoChart!))).map((row) => [row.chart_id, row]));
      for (const node of nodes) {
        const url = visiblePerfectVideo({ combo: node.dataset.combo }, videos.get(node.dataset.perfectVideoChart!));
        const link = node.querySelector<HTMLAnchorElement>('[data-perfect-video-link]')!;
        node.hidden = link.hidden = !url;
        if (url) link.href = url;
        else link.removeAttribute('href');
      }
    } catch {
      // An unavailable video store must not interrupt the public chart table.
    } finally { loading = false; }
  }
  void refresh();
  window.addEventListener('focus', () => void refresh());
  window.addEventListener('online', () => void refresh());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
}
