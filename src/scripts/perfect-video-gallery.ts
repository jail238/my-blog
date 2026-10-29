import { loadPerfectVideos, type PerfectVideo } from '../utils/perfect-videos-cloud';
import { visiblePerfectVideo } from '../utils/perfect-videos.js';
import { perfectVideoCollection, perfectVideoSavedDate } from '../utils/perfect-video-gallery.js';

export function initializePerfectVideoGallery() {
  const root = document.querySelector<HTMLElement>('#video-collection');
  if (!root) return;
  const get = <T extends HTMLElement>(id: string) => document.getElementById(`video-collection-${id}`) as T;
  const query = get<HTMLInputElement>('query');
  const type = get<HTMLSelectElement>('type');
  const difficulty = get<HTMLSelectElement>('difficulty');
  const sort = get<HTMLSelectElement>('sort');
  const grid = root.querySelector<HTMLElement>('.video-collection-grid')!;
  const nodes = [...root.querySelectorAll<HTMLElement>('[data-video-collection-chart]')];
  const byId = new Map(nodes.map((node) => [node.dataset.videoCollectionChart!, node]));
  const charts = nodes.map((node) => ({
    id: node.dataset.videoCollectionChart!, combo: node.dataset.combo, search: node.dataset.search,
    type: node.dataset.type, difficulty: node.dataset.difficulty, title: node.dataset.title!, constant: node.dataset.constant,
  }));
  let videos = new Map<string, PerfectVideo>();
  let ready = false;
  let loading = false;
  let limit = 20;

  function render() {
    const selected: typeof charts = perfectVideoCollection(charts, videos, {
      query: query.value, type: type.value, difficulty: difficulty.value, sort: sort.value,
    });
    for (const node of nodes) node.hidden = true;
    selected.forEach((chart, index) => {
      const node = byId.get(chart.id)!;
      if (grid.children[index] !== node) grid.insertBefore(node, grid.children[index] ?? null);
      if (index >= limit) return;
      const video = videos.get(chart.id);
      const url = visiblePerfectVideo({ combo: chart.combo }, video)!;
      node.querySelector<HTMLAnchorElement>('[data-watch-video]')!.href = url;
      const saved = perfectVideoSavedDate(video);
      const time = node.querySelector<HTMLTimeElement>('[data-video-saved-date]')!;
      time.parentElement!.hidden = !saved;
      time.textContent = saved?.label ?? '';
      if (saved) time.dateTime = saved.dateTime;
      else time.removeAttribute('datetime');
      node.hidden = false;
    });
    get('count').textContent = ready ? `${Math.min(limit, selected.length)}/${selected.length} videos` : '';
    get('empty').hidden = !ready || selected.length > 0;
    get('empty').textContent = perfectVideoCollection(charts, videos).length ? 'No videos found.' : 'No saved videos.';
    get('more').hidden = !ready || selected.length <= limit;
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    get<HTMLButtonElement>('refresh').disabled = true;
    grid.setAttribute('aria-busy', 'true');
    const status = get('status');
    status.hidden = false;
    status.dataset.error = 'false';
    status.textContent = 'Loading videos...';
    try {
      videos = new Map((await loadPerfectVideos([...byId.keys()])).map((video) => [video.chart_id, video]));
      ready = true;
      status.hidden = true;
      render();
    } catch {
      status.dataset.error = 'true';
      status.textContent = ready ? 'Could not refresh videos. Showing the last loaded list.' : 'Could not load videos. Try refresh.';
    } finally {
      loading = false;
      get<HTMLButtonElement>('refresh').disabled = false;
      grid.setAttribute('aria-busy', 'false');
    }
  }

  for (const control of [query, type, difficulty, sort]) {
    control.addEventListener('input', () => { limit = 20; render(); });
  }
  get('reset').addEventListener('click', () => {
    query.value = type.value = difficulty.value = '';
    sort.value = 'recent';
    limit = 20;
    render();
  });
  get('more').addEventListener('click', () => { limit += 20; render(); });
  get('refresh').addEventListener('click', () => void refresh());
  window.addEventListener('focus', () => void refresh());
  window.addEventListener('online', () => void refresh());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  void refresh();
}
