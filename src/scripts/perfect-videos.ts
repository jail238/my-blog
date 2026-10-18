import { plannerCloud } from '../utils/planner-cloud';
import { loadPerfectVideos, removePerfectVideo, savePerfectVideo, type PerfectVideo } from '../utils/perfect-videos-cloud';
import { perfectVideoChartMatches, savePerfectVideoReturn, visiblePerfectVideo } from '../utils/perfect-videos.js';

export function initializePerfectVideos() {
  const root = document.querySelector<HTMLElement>('#perfect-videos');
  if (!root) return;
  if (!plannerCloud) { document.getElementById('perfect-video-status')!.textContent = 'Cloud not connected'; return; }
  const cloud = plannerCloud;
  const base = root.dataset.base ?? '';
  const get = <T extends HTMLElement>(id: string) => document.getElementById(`perfect-video-${id}`) as T;
  const dialog = get<HTMLDialogElement>('editor');
  const input = get<HTMLInputElement>('url');
  const query = get<HTMLInputElement>('query');
  const type = get<HTMLSelectElement>('type');
  const difficulty = get<HTMLSelectElement>('difficulty');
  const filter = get<HTMLSelectElement>('filter');
  const controls = [...document.querySelectorAll<HTMLElement>('[data-video-manager-chart]')];
  const byId = new Map(controls.map((node) => [node.dataset.videoManagerChart!, node]));
  let videos = new Map<string, PerfectVideo>();
  let userId: string | null = null;
  let canEdit = false;
  let permissionError = '';
  let busy = false;
  let signingIn = false;
  let loading = false;
  let ready = false;
  let resultLimit = 20;
  let generation = 0;
  let readSerial = 0;
  let editingId = '';
  let editingPrevious: PerfectVideo | undefined;
  let conflicted = false;

  function status(text = '', error = false) {
    get('status').textContent = text;
    get('status').dataset.error = String(error);
  }

  function issue(error: unknown) {
    const value = error as { code?: string; message?: string };
    if (value.code === '42P01' || value.code === 'PGRST205') return 'Video storage is not ready yet.';
    if (value.code === '23505') return 'This video was added on another device. Close and reopen the editor.';
    if (value.code === '42501') return 'Only the archive owner can edit video links.';
    return value.message ?? 'Could not save the video link. Please try again.';
  }

  function message(text = '') {
    const node = get('message');
    node.textContent = text;
    node.dataset.error = 'true';
    node.hidden = !text;
  }

  function render() {
    let total = 0;
    for (const [id, node] of byId) {
      const link = node.querySelector<HTMLAnchorElement>('[data-perfect-video-link]')!;
      const edit = node.querySelector<HTMLButtonElement>('[data-edit-perfect-video]')!;
      const url = visiblePerfectVideo({ combo: node.dataset.combo }, videos.get(id));
      link.hidden = !url;
      if (url) link.href = url;
      else link.removeAttribute('href');
      edit.disabled = !canEdit || !ready || busy || loading;
      edit.title = `${url ? 'Edit' : 'Add'} video`;
      node.querySelector('[data-video-add-icon]')!.toggleAttribute('hidden', !!url);
      node.querySelector('[data-video-edit-icon]')!.toggleAttribute('hidden', !url);
      node.querySelector('[data-video-action-label]')!.textContent = url ? 'Edit video' : 'Add video';
      const matches = perfectVideoChartMatches(node.dataset, {
        query: query.value, type: type.value, difficulty: difficulty.value, linked: filter.value,
      }, videos.get(id));
      if (matches) total++;
      node.hidden = !matches || total > resultLimit;
    }
    get('count').textContent = `${Math.min(resultLimit, total)}/${total} charts`;
    get('empty').hidden = total > 0;
    get('more').hidden = total <= resultLimit;
    get<HTMLButtonElement>('sign-in').hidden = !!userId;
    get<HTMLButtonElement>('sign-in').disabled = signingIn;
    get('sign-out').hidden = !userId;
    get<HTMLButtonElement>('sign-out').disabled = busy;
    get('refresh').hidden = false;
    get<HTMLButtonElement>('refresh').disabled = loading || busy;
    for (const button of dialog.querySelectorAll<HTMLButtonElement>('button')) button.disabled = busy;
    get<HTMLButtonElement>('save').disabled = busy || conflicted;
    get<HTMLButtonElement>('remove').disabled = busy || conflicted;
    get<HTMLButtonElement>('confirm-remove').disabled = busy || conflicted;
    input.disabled = busy;
  }

  async function refresh() {
    if (loading || busy) return;
    const serial = ++readSerial;
    loading = true;
    render();
    try {
      const rows = await loadPerfectVideos([...byId.keys()]);
      if (serial !== readSerial) return;
      videos = new Map(rows.map((row) => [row.chart_id, row]));
      ready = true;
      status(permissionError || (canEdit ? 'Synced' : userId ? 'Only the archive owner can edit video links.' : 'Sign in to manage video links.'), !!permissionError);
    } catch (error) {
      if (serial === readSerial) { ready = false; status(issue(error), true); }
    } finally {
      if (serial === readSerial) { loading = false; render(); }
    }
  }

  async function setUser(id: string) {
    if (userId === id) return;
    userId = id;
    const current = ++generation;
    readSerial++;
    loading = false;
    ready = false;
    canEdit = false;
    permissionError = '';
    videos.clear();
    if (dialog.open) dialog.close();
    render();
    if (id) {
      const { data, error } = await cloud.rpc('can_manage_perfect_videos');
      if (current !== generation) return;
      if (error) permissionError = issue(error);
      else canEdit = data === true;
    }
    if (current === generation) await refresh();
  }

  for (const [id, node] of byId) {
    node.querySelector('[data-edit-perfect-video]')!.addEventListener('click', () => {
      if (!canEdit || !ready || busy || loading) return;
      editingId = id;
      editingPrevious = videos.get(id);
      conflicted = false;
      input.value = editingPrevious?.deleted_at ? '' : editingPrevious?.url ?? '';
      get('chart').textContent = node.dataset.chartLabel ?? '';
      get('remove').hidden = !editingPrevious || !!editingPrevious.deleted_at;
      get('confirmation').hidden = true;
      message();
      render();
      dialog.showModal();
      input.focus();
    });
  }

  for (const button of document.querySelectorAll('[data-close-video]')) {
    button.addEventListener('click', () => { if (!busy) dialog.close(); });
  }
  dialog.addEventListener('cancel', (event) => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { editingId = ''; editingPrevious = undefined; });
  get('remove').addEventListener('click', () => { get('confirmation').hidden = false; });

  async function write(remove = false) {
    if (!canEdit || busy || conflicted || !editingId) return;
    const current = generation;
    const id = editingId;
    busy = true;
    message();
    render();
    try {
      const row = remove && editingPrevious
        ? await removePerfectVideo(editingPrevious)
        : await savePerfectVideo(id, input.value, editingPrevious);
      if (current !== generation) return;
      videos.set(id, row);
      dialog.close();
      status(remove ? 'Video link removed' : 'Video link saved');
    } catch (error) {
      if (current !== generation) return;
      message(issue(error));
      const value = error as { code?: string; message?: string };
      conflicted = value.code === '23505' || !!value.message?.includes('another device');
    } finally {
      busy = false;
      render();
      if (current === generation && conflicted) await refresh();
    }
  }

  get('form').addEventListener('submit', (event) => { event.preventDefault(); void write(); });
  get('confirm-remove').addEventListener('click', () => void write(true));
  get('refresh').addEventListener('click', () => void refresh());
  for (const control of [query, type, difficulty, filter]) {
    control.addEventListener('input', () => { resultLimit = 20; render(); });
  }
  get('more').addEventListener('click', () => { resultLimit += 20; render(); });
  get('sign-in').addEventListener('click', async () => {
    if (signingIn) return;
    signingIn = true;
    render();
    try {
      savePerfectVideoReturn(window.sessionStorage, window.location.pathname);
      const { error } = await cloud.auth.signInWithOAuth({
        provider: 'github', options: { redirectTo: new URL(`${base}/planner/`, window.location.origin).href },
      });
      if (error) throw error;
    } catch {
      signingIn = false;
      status('Could not start GitHub sign-in. Please try again.', true);
      render();
    }
  });
  get('sign-out').addEventListener('click', async () => {
    const { error } = await cloud.auth.signOut({ scope: 'local' });
    if (error) status(issue(error), true);
    else await setUser('');
  });

  render();
  cloud.auth.onAuthStateChange((_event, session) => { queueMicrotask(() => void setUser(session?.user.id ?? '')); });
  void cloud.auth.getSession().then(({ data, error }) => {
    if (error) status(issue(error), true);
    else void setUser(data.session?.user.id ?? '');
  });
  window.addEventListener('focus', () => void refresh());
  window.addEventListener('online', () => void refresh());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  window.setInterval(() => { if (!document.hidden) void refresh(); }, 20_000);
}
