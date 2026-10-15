import type { RecommendationItem } from '../data/recommendations';
import { filterRecommendations, percentage, plannerRecommendationUrl, recommendationPage, recommendationReason } from '../utils/recommendations.js';
import { buildMaimaiYoutubeUrl } from '../utils/maimai-youtube.js';

export function initializeRecommendations() {
  const root = document.querySelector<HTMLElement>('#recommendations');
  if (!root || root.dataset.ready) return;
  const { items, skills } = JSON.parse(document.getElementById('recommendation-data')!.textContent!) as { items: RecommendationItem[]; skills: Record<string, string> };
  const base = root.dataset.base ?? '';
  const get = <T extends HTMLElement>(id: string) => document.getElementById(`recommendation-${id}`) as T;
  const template = get<HTMLTemplateElement>('template');
  const query = get<HTMLInputElement>('query');
  const difficulty = get<HTMLSelectElement>('difficulty');
  const type = get<HTMLSelectElement>('type');
  const skill = get<HTMLSelectElement>('skill');
  const sort = get<HTMLSelectElement>('sort');
  const size = get<HTMLSelectElement>('page-size');
  let mode = 'push';
  let page = 1;

  function card(item: RecommendationItem) {
    const node = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
    node.dataset.chartId = item.id;
    const slot = <T extends HTMLElement>(name: string) => node.querySelector<T>(`[data-slot="${name}"]`)!;
    const songUrl = `${base}/songs/${item.songId}/`;
    for (const name of ['title', 'artwork-link', 'song-link']) slot<HTMLAnchorElement>(name).href = songUrl;
    const title = item.title.trim() || 'Untitled';
    slot('title').textContent = title;
    slot('title').title = title;
    slot('artwork-link').setAttribute('aria-label', title);
    slot<HTMLImageElement>('artwork').src = item.artworkUrl;
    slot('translation').textContent = item.koreanTitle ?? '';
    slot('translation').hidden = !item.koreanTitle;
    slot('type').textContent = item.type === 'STANDARD' ? 'ST' : 'DX';
    slot('type').className = `type-badge type-${item.type.toLowerCase()}`;
    slot('difficulty').textContent = item.difficulty;
    slot('difficulty').className = `difficulty-badge difficulty-${item.difficulty.toLowerCase().replace(':', '')}`;
    slot('level').textContent = `Lv ${item.level}${item.constant !== null ? ` · ${item.constant.toFixed(1)}` : ''}`;
    slot('achievement').textContent = item.achievement === null ? 'No record' : `${percentage(item.achievement)}%`;
    slot('reason').textContent = recommendationReason(item);
    slot('skills').hidden = !item.skills.length;
    slot('skills').replaceChildren(...item.skills.map((id) => {
      const badge = document.createElement('span');
      badge.textContent = skills[id];
      return badge;
    }));
    slot('note').textContent = item.note;
    slot('note').hidden = !item.note;
    const source = slot<HTMLAnchorElement>('source');
    source.hidden = !item.source;
    if (item.source) { source.textContent = item.source.name; source.href = item.source.url; }
    slot('reference-label').hidden = !item.references.length;
    slot('references').replaceChildren(...item.references.map((reference) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `${base}/songs/${reference.songId}/`;
      link.textContent = `${reference.title.trim() || 'Untitled'} · ${reference.type === 'STANDARD' ? 'ST' : 'DX'} ${reference.difficulty} · ${reference.constant.toFixed(1)} · ${percentage(reference.achievement)}%`;
      li.append(link);
      return li;
    }));
    slot('shared').hidden = !item.sharedSkills.length;
    slot('shared').textContent = `Shared patterns: ${item.sharedSkills.map((id) => skills[id]).join(', ')}`;
    node.querySelector<HTMLDetailsElement>('details')!.hidden = !item.note && !item.references.length;
    slot<HTMLAnchorElement>('youtube').href = buildMaimaiYoutubeUrl(item.title, item.type, item.difficulty);
    slot<HTMLAnchorElement>('planner').href = plannerRecommendationUrl(base, item.id);
    return node;
  }

  function render(resetPage = false) {
    if (resetPage) page = 1;
    const matching = filterRecommendations(items, { mode, query: query.value, difficulty: difficulty.value, type: type.value, skill: skill.value, sort: sort.value });
    const result = recommendationPage(matching, page, Number(size.value));
    page = result.page;
    get('list').replaceChildren(...result.items.map(card));
    get('count').textContent = `${result.start}-${result.end}/${result.total.toLocaleString('en-US')} charts`;
    get('page').textContent = `${page} / ${result.pages}`;
    get<HTMLButtonElement>('previous').disabled = page <= 1;
    get<HTMLButtonElement>('next').disabled = page >= result.pages;
    get('empty').hidden = result.total > 0;
  }

  get<HTMLFormElement>('filters').addEventListener('submit', (event) => event.preventDefault());
  get<HTMLFormElement>('filters').addEventListener('reset', (event) => {
    event.preventDefault();
    query.value = ''; difficulty.value = ''; type.value = ''; skill.value = '';
    sort.value = 'recommended'; size.value = '30';
    render(true);
  });
  for (const control of [query, difficulty, type, skill, sort, size]) control.addEventListener('input', () => render(true));
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
    button.addEventListener('click', () => {
      mode = button.dataset.mode!;
      for (const other of root.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
        other.classList.toggle('active', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      render(true);
    });
  }
  for (const [id, increment] of [['previous', -1], ['next', 1]] as const) {
    get(id).addEventListener('click', () => {
      page += increment;
      render();
      const heading = get('count');
      window.scrollTo({ top: window.scrollY + heading.getBoundingClientRect().top - 100, behavior: 'instant' });
    });
  }
  root.dataset.ready = 'true';
  render();
}
