import { plannerCloud, loadPlannerEntries, addPlannerEntries, changePlannerEntry, type PlannerEntry } from '../utils/planner-cloud';
import { finishPlannerSignIn, plannerRedirectUrl } from '../utils/planner-auth.js';
import { entriesOnDate, hasOpenGoal, isDateKey, monthCells, shiftMonth, songMatches, statusChange, statusOnDate, todayInKorea } from '../utils/planner.js';

interface PlannerSong { id: string; title: string; koreanTitle?: string; artist: string; artworkUrl: string }
interface PlannerChart { id: string; songId: string; type: string; difficulty: string; level: string; constant?: number; version: string; record?: { achievement: string; combo?: string } }

export function initializePlanner() {
  const root = document.querySelector<HTMLElement>('#planner');
  if (!root) return;
  const base = root.dataset.base ?? '';
  const get = <T extends HTMLElement>(id: string) => document.getElementById(`planner-${id}`) as T;
  const picker = get<HTMLDialogElement>('picker');
  const auth = get<HTMLDialogElement>('auth');
  const query = get<HTMLInputElement>('query');
  const addDate = get<HTMLInputElement>('add-date');
  const type = get<HTMLSelectElement>('type');
  const difficulty = get<HTMLSelectElement>('difficulty');
  const statusFilter = get<HTMLSelectElement>('status-filter');
  const dateInput = get<HTMLInputElement>('date');
  const addButton = get<HTMLButtonElement>('add-selected');
  let date = todayInKorea();
  let month = date.slice(0, 7);
  let targetFilter = '';
  let addTarget: 'AP' | 'SSS+' = 'AP';
  let entries: PlannerEntry[] = [];
  let songs: PlannerSong[] = [];
  let charts: PlannerChart[] = [];
  let songsById = new Map<string, PlannerSong>();
  let chartsById = new Map<string, PlannerChart>();
  let chartsBySong = new Map<string, PlannerChart[]>();
  let selected = new Set<string>();
  let resultLimit = 20;
  let userId = '';
  let generation = 0;
  let ready = false;
  let busy = false;
  let refreshing = false;
  let catalogReady = false;
  let signingIn = false;
  const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  const fullFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' });
  const dateObject = (value: string) => new Date(`${value}T00:00:00Z`);

  function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  function message(text: string, error = false, authMessage = false) {
    const node = get<HTMLElement>(authMessage ? 'auth-message' : picker.open ? 'picker-message' : 'message');
    node.textContent = text;
    node.dataset.error = String(error);
    node.hidden = !text;
  }

  function errorMessage(error: unknown) {
    const issue = error as { code?: string; message?: string };
    if (issue.code === '23505') return 'An open goal already exists for one of these charts. The list has been refreshed.';
    if (issue.code === '42P01' || issue.code === 'PGRST205') return 'Cloud storage is not set up yet.';
    return issue.message ?? 'Could not sync. Your changes were not saved. Please try again.';
  }

  function icon(name: string) {
    return (get<HTMLTemplateElement>(`icon-${name}`)).content.cloneNode(true);
  }

  function artwork(song?: PlannerSong) {
    const image = element('img', 'planner-artwork');
    if (song) image.src = song.artworkUrl;
    image.alt = '';
    image.width = 48;
    image.height = 48;
    image.loading = 'lazy';
    image.addEventListener('error', () => image.replaceWith(element('span', 'planner-artwork')));
    return image;
  }

  function tags(chart: PlannerChart | undefined, target?: string) {
    const node = element('div', 'planner-entry-tags');
    if (chart) {
      node.append(element('span', `type-badge type-${chart.type.toLowerCase()}`, chart.type === 'STANDARD' ? 'ST' : 'DX'));
      node.append(element('span', `difficulty-badge difficulty-${chart.difficulty === 'Re:MASTER' ? 'remaster' : chart.difficulty.toLowerCase()}`, chart.difficulty));
      node.append(element('small', '', `Lv ${chart.level}`));
    }
    if (target) {
      const badge = element('span', 'planner-target', target);
      badge.dataset.target = target;
      badge.title = `Target: ${target}`;
      node.append(badge);
    }
    return node;
  }

  function record(chart: PlannerChart) {
    const node = element('span', 'planner-record', chart.record?.achievement ?? '');
    if (chart.record && ['AP', 'AP+'].includes(chart.record.combo ?? '')) {
      const mark = element('img');
      mark.src = `${base}/assets/maimai/music-icon/${chart.record.combo === 'AP+' ? 'app' : 'ap'}.webp`;
      mark.alt = chart.record.combo ?? '';
      mark.width = 20;
      mark.height = 20;
      node.append(mark);
    }
    return node;
  }

  function action(label: string, iconName: string, onClick: () => void) {
    const button = element('button', 'planner-icon-button');
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.disabled = busy || refreshing || !ready;
    button.append(icon(iconName));
    button.addEventListener('click', onClick);
    return button;
  }

  function renderCalendar() {
    get('month').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dateObject(`${month}-01`));
    dateInput.value = date;
    get<HTMLButtonElement>('prev-month').disabled = month <= '2000-01';
    get<HTMLButtonElement>('next-month').disabled = month >= '2099-12';
    const today = todayInKorea();
    const buttons = monthCells(month).map((day: string) => {
      const items = entriesOnDate(entries, day);
      const pending = items.filter((item: PlannerEntry) => statusOnDate(item, day) === 'pending').length;
      const button = element('button', 'planner-day');
      button.type = 'button';
      button.classList.toggle('outside', !day.startsWith(month));
      button.classList.toggle('active', day === date);
      button.classList.toggle('today', day === today);
      button.setAttribute('aria-pressed', String(day === date));
      button.setAttribute('aria-label', `${fullFormat.format(dateObject(day))}, ${pending} pending, ${items.length - pending} closed`);
      if (day === today) button.setAttribute('aria-current', 'date');
      button.disabled = !isDateKey(day);
      button.append(element('span', '', String(Number(day.slice(-2)))), element('small', '', items.length ? (pending ? String(pending) : 'Done') : ''));
      button.addEventListener('click', () => selectDate(day));
      return button;
    });
    get('days').replaceChildren(...buttons);
  }

  function renderAgenda() {
    get('day-label').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', timeZone: 'UTC' }).format(dateObject(date));
    get('date-title').textContent = dayFormat.format(dateObject(date));
    const visible = entriesOnDate(entries, date, { target: targetFilter, status: statusFilter.value });
    const pending = visible.filter((item: PlannerEntry) => statusOnDate(item, date) === 'pending').length;
    get('count').textContent = `${visible.length} charts · ${pending} pending`;
    const rows = visible.map((entry: PlannerEntry) => {
      const chart = chartsById.get(entry.chart_id);
      const song = chart ? songsById.get(chart.songId) : undefined;
      const status = statusOnDate(entry, date);
      const row = element('article', 'planner-entry');
      row.dataset.status = status;
      row.dataset.entryId = entry.id;
      const copy = element('div', 'planner-entry-copy');
      const title = element(song ? 'a' : 'strong', 'planner-entry-title', song?.title ?? entry.chart_id);
      if (title instanceof HTMLAnchorElement) title.href = `${base}/songs/${song?.id}/`;
      title.title = song?.title ?? entry.chart_id;
      copy.append(title, element('small', 'planner-entry-subtitle', song?.koreanTitle ?? song?.artist ?? 'Chart no longer in catalog'), tags(chart, entry.target));
      const meta = element('div', 'planner-entry-meta', `Since ${entry.start_date}`);
      if (chart?.record) { meta.append(document.createTextNode(' · '), record(chart)); }
      copy.append(meta);
      const actions = element('div', 'planner-entry-actions');
      if (status === 'pending') {
        actions.append(action(`Complete ${entry.target} goal`, 'check', () => void changeStatus(entry, 'completed')),
          action('Skip goal', 'skip', () => void changeStatus(entry, 'skipped')));
      } else {
        actions.append(element('span', 'planner-status', status === 'completed' ? 'Completed' : 'Skipped'),
          action('Undo status', 'undo', () => void changeStatus(entry, 'pending')));
      }
      row.append(artwork(song), copy, actions);
      return row;
    });
    get('entries').replaceChildren(...rows);
    get('empty').hidden = visible.length > 0;
    get('empty-copy').textContent = !plannerCloud ? 'Cloud connection required.' : !userId ? 'Sign in to view your plans.' : !ready ? 'Waiting for cloud sync.' : 'No charts for this date.';
    get<HTMLButtonElement>('refresh').disabled = !userId || refreshing || busy;
    get<HTMLButtonElement>('sign-in').hidden = !!userId;
    get<HTMLButtonElement>('sign-out').hidden = !userId;
    get<HTMLButtonElement>('sign-out').disabled = busy;
  }

  function renderSelection() {
    get('selection-count').textContent = `${selected.size} selected`;
    addButton.disabled = busy || refreshing || !selected.size || !catalogReady || !isDateKey(addDate.value) || (!!userId && !ready) || !plannerCloud;
    addButton.replaceChildren(icon(busy ? 'loading' : 'check'), document.createTextNode(userId ? `Add ${selected.size || 'selected'}` : 'Sign in to add'));
    get<HTMLButtonElement>('clear-selection').disabled = !selected.size || busy;
  }

  function renderSearch() {
    if (!catalogReady) return;
    const matching = songs.map((song) => ({ song, options: (chartsBySong.get(song.id) ?? []).filter((chart) => (!type.value || chart.type === type.value) && (!difficulty.value || chart.difficulty === difficulty.value)) }))
      .filter(({ song, options }) => options.length && songMatches(song, query.value));
    get('search-count').textContent = `${matching.length} song${matching.length === 1 ? '' : 's'}`;
    const results = matching.slice(0, resultLimit).map(({ song, options }) => {
      const section = element('section', 'planner-search-song');
      const heading = element('div', 'planner-search-song-heading');
      const copy = element('div', 'planner-entry-copy');
      const title = element('strong', 'planner-entry-title', song.title);
      title.title = song.title;
      copy.append(title, element('small', 'planner-entry-subtitle', [song.koreanTitle, song.artist].filter(Boolean).join(' · ')));
      heading.append(artwork(song), copy);
      const choices = element('div', 'planner-chart-options');
      for (const chart of options) {
        const label = element('label', 'planner-chart-option');
        const input = element('input');
        input.type = 'checkbox';
        input.value = chart.id;
        const planned = hasOpenGoal(entries, chart.id, addTarget);
        input.disabled = planned || busy;
        input.checked = selected.has(chart.id);
        input.setAttribute('aria-label', `${song.title}, ${chart.type === 'STANDARD' ? 'ST' : 'DX'}, ${chart.difficulty}, level ${chart.level}, target ${addTarget}`);
        input.addEventListener('change', () => { input.checked ? selected.add(chart.id) : selected.delete(chart.id); renderSelection(); });
        const typeBadge = element('span', `type-badge type-${chart.type.toLowerCase()}`, chart.type === 'STANDARD' ? 'ST' : 'DX');
        const difficultyBadge = element('span', `difficulty-badge difficulty-${chart.difficulty === 'Re:MASTER' ? 'remaster' : chart.difficulty.toLowerCase()}`, chart.difficulty);
        label.append(input, typeBadge, difficultyBadge, element('span', 'planner-option-level', `${chart.level} (${chart.constant?.toFixed(1) ?? '-'})`));
        if (planned) label.append(element('small', '', 'Planned'));
        else if (chart.record) label.append(record(chart));
        choices.append(label);
      }
      section.append(heading, choices);
      return section;
    });
    if (!results.length) get('search-results').replaceChildren(element('p', 'planner-empty', 'No matching charts.'));
    else get('search-results').replaceChildren(...results);
    get('more').hidden = resultLimit >= matching.length;
    renderSelection();
  }

  function render() { renderCalendar(); renderAgenda(); renderSelection(); if (picker.open) renderSearch(); }
  function selectDate(next: string) { if (isDateKey(next)) { date = next; month = date.slice(0, 7); renderCalendar(); renderAgenda(); } }

  async function refresh(showErrors = true) {
    if (!userId || busy || refreshing) return;
    const currentGeneration = generation;
    let changed = false;
    refreshing = true;
    get('sync').textContent = 'Syncing';
    renderAgenda();
    renderSelection();
    try {
      const next = await loadPlannerEntries(userId);
      if (generation !== currentGeneration) return;
      changed = JSON.stringify(entries) !== JSON.stringify(next);
      entries = next;
      ready = true;
      get('sync').textContent = 'Synced';
      selected = new Set([...selected].filter((id) => !hasOpenGoal(entries, id, addTarget)));
      if (showErrors) message('');
    } catch (error) {
      if (generation !== currentGeneration) return;
      ready = false;
      get('sync').textContent = 'Sync unavailable';
      if (showErrors) message(errorMessage(error), true);
    } finally {
      if (generation === currentGeneration) {
        refreshing = false;
        renderCalendar();
        renderAgenda();
        renderSelection();
        if (changed && picker.open) renderSearch();
      }
    }
  }

  async function setUser(nextId: string) {
    if (nextId === userId) return;
    generation++;
    userId = nextId;
    entries = [];
    selected.clear();
    ready = false;
    busy = false;
    refreshing = false;
    get('sync').textContent = nextId ? 'Syncing' : 'Signed out';
    message('');
    render();
    if (nextId) { auth.close(); await refresh(); }
  }

  async function changeStatus(entry: PlannerEntry, status: PlannerEntry['status']) {
    if (!ready || busy || refreshing) return;
    const currentGeneration = generation;
    busy = true;
    get('sync').textContent = 'Saving';
    render();
    try {
      const updated = await changePlannerEntry(entry, statusChange(entry, status, date));
      if (currentGeneration !== generation) return;
      entries = entries.map((item) => item.id === updated.id ? updated : item);
      get('sync').textContent = 'Synced';
      message('');
    } catch (error) { if (currentGeneration === generation) message(errorMessage(error), true); }
    finally { if (currentGeneration === generation) { busy = false; render(); await refresh(false); } }
  }

  function openAuth() {
    auth.showModal();
    get<HTMLButtonElement>('github-sign-in').focus();
    if (!plannerCloud) message('Cloud connection required.', true, true);
  }

  get('open-picker').addEventListener('click', () => {
    addDate.value = date;
    picker.showModal();
    message('');
    renderSearch();
    query.focus();
  });
  get('sign-in').addEventListener('click', openAuth);
  get('refresh').addEventListener('click', () => void refresh());
  get('today').addEventListener('click', () => selectDate(todayInKorea()));
  get('prev-month').addEventListener('click', () => { month = shiftMonth(month, -1); renderCalendar(); });
  get('next-month').addEventListener('click', () => { month = shiftMonth(month, 1); renderCalendar(); });
  dateInput.addEventListener('change', () => selectDate(dateInput.value));
  statusFilter.addEventListener('change', renderAgenda);
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-target-filter]')) {
    button.addEventListener('click', () => {
      targetFilter = button.dataset.targetFilter ?? '';
      for (const other of root.querySelectorAll<HTMLButtonElement>('[data-target-filter]')) {
        const active = other === button; other.classList.toggle('active', active); other.setAttribute('aria-pressed', String(active));
      }
      renderAgenda();
    });
  }
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-add-target]')) {
    button.addEventListener('click', () => {
      addTarget = button.dataset.addTarget as 'AP' | 'SSS+';
      selected = new Set([...selected].filter((id) => !hasOpenGoal(entries, id, addTarget)));
      for (const other of root.querySelectorAll<HTMLButtonElement>('[data-add-target]')) {
        const active = other === button; other.classList.toggle('active', active); other.setAttribute('aria-pressed', String(active));
      }
      renderSearch();
    });
  }
  for (const input of [query, type, difficulty]) input.addEventListener('input', () => { resultLimit = 20; renderSearch(); });
  addDate.addEventListener('input', renderSelection);
  get('more').addEventListener('click', () => { resultLimit += 20; renderSearch(); });
  get('clear-selection').addEventListener('click', () => { selected.clear(); renderSearch(); });
  addButton.addEventListener('click', async () => {
    if (!userId) { openAuth(); return; }
    if (!ready || busy || refreshing || !selected.size || !isDateKey(addDate.value)) return;
    const chosenDate = addDate.value;
    const currentGeneration = generation;
    busy = true;
    get('sync').textContent = 'Saving';
    render();
    try {
      const added = await addPlannerEntries(userId, [...selected], addTarget, chosenDate);
      if (currentGeneration !== generation) return;
      entries.push(...added);
      selected.clear();
      selectDate(chosenDate);
      picker.close();
      message(`${added.length} chart${added.length === 1 ? '' : 's'} added.`);
    } catch (error) { if (currentGeneration === generation) message(errorMessage(error), true); }
    finally { if (currentGeneration === generation) { busy = false; render(); await refresh(false); } }
  });

  get('sign-out').addEventListener('click', async () => {
    const { error } = await plannerCloud!.auth.signOut({ scope: 'local' });
    if (error) message(error.message, true);
    else await setUser('');
  });
  get('github-sign-in').addEventListener('click', async () => {
    if (!plannerCloud || signingIn) return;
    const button = get<HTMLButtonElement>('github-sign-in');
    signingIn = true;
    button.disabled = true;
    message('Connecting to GitHub...', false, true);
    try {
      const { error } = await plannerCloud.auth.signInWithOAuth({
        provider: 'github', options: { redirectTo: plannerRedirectUrl(window.location.href) },
      });
      if (error) throw error;
    } catch (error) {
      message(errorMessage(error), true, true);
      signingIn = false;
      button.disabled = false;
    }
  });

  async function loadCatalog() {
    try {
      const response = await fetch(`${base}/planner/catalog.json`);
      if (!response.ok) throw new Error('Could not load the catalog. Reload to try again.');
      const catalog = await response.json();
      songs = catalog.songs;
      charts = catalog.charts;
      songsById = new Map(songs.map((song) => [song.id, song]));
      chartsById = new Map(charts.map((chart) => [chart.id, chart]));
      chartsBySong = new Map();
      for (const chart of charts) {
        if (!chartsBySong.has(chart.songId)) chartsBySong.set(chart.songId, []);
        chartsBySong.get(chart.songId)!.push(chart);
      }
      catalogReady = true;
      render();
    } catch (error) { message(errorMessage(error), true); get('search-count').textContent = 'Catalog unavailable'; }
  }

  dateInput.value = date;
  addDate.value = date;
  render();
  void loadCatalog();
  if (plannerCloud) {
    plannerCloud.auth.onAuthStateChange((_event, session) => { queueMicrotask(() => void setUser(session?.user.id ?? '')); });
    void (async () => {
      try {
        await finishPlannerSignIn(plannerCloud.auth, window.location.href, (url: string) => window.history.replaceState(null, '', url));
        const { data, error } = await plannerCloud.auth.getSession();
        if (error) throw error;
        if (data.session) await setUser(data.session.user.id);
        else if (!userId) get('sync').textContent = 'Signed out';
      } catch (error) {
        get('sync').textContent = 'Sign-in unavailable';
        message(errorMessage(error), true);
      }
    })();
  } else {
    get('sync').textContent = 'Cloud not connected';
    get<HTMLButtonElement>('github-sign-in').disabled = true;
  }
  window.addEventListener('focus', () => void refresh(false));
  window.addEventListener('online', () => void refresh());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(false); });
  window.setInterval(() => { if (!document.hidden) void refresh(false); }, 20_000);
}
