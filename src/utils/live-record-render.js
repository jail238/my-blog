import { isPerfect } from './net-records.js';
import { hallOfFameGroups } from './hall-of-fame.js';
import { getDxScoreStarCount } from './maimai-dx-score.js';
import { formatKstDate } from './maimai-record-date.js';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const number = (value) => Number(value ?? 0).toLocaleString('en-US');
const difficultyClass = (difficulty) => difficulty === 'Re:MASTER' ? 'remaster' : difficulty.toLowerCase();
const icons = { FC: ['fc', 'FULL COMBO'], 'FC+': ['fcp', 'FULL COMBO+'], AP: ['ap', 'ALL PERFECT'], 'AP+': ['app', 'ALL PERFECT+'] };
const comboIcon = (combo) => icons[combo] ? `<img class="combo-icon" src="/assets/maimai/music-icon/${icons[combo][0]}.webp" alt="${icons[combo][1]}" title="${icons[combo][1]}" width="80" height="80" loading="lazy">` : '';
const artwork = (song, compact = false) => `<span class="song-artwork${compact ? ' compact' : ''}" aria-hidden="true"><span class="song-artwork-fallback">${escape(song.title.trim().slice(0, 1).toUpperCase())}</span><img src="${escape(song.artworkUrl)}" alt="" loading="lazy" decoding="async" width="${compact ? 44 : 92}" height="${compact ? 44 : 92}"></span>`;
const typeLabel = (chart) => chart.type === 'STANDARD' ? 'ST' : 'DX';

function chartScore(record) {
  return record ? `<span class="chart-record-copy"><strong>${escape(record.achievement)}</strong><small>${escape(record.rank)} · RATING ${number(record.rating)}</small></span>${comboIcon(record.combo)}` : '';
}

function boardScore(record) {
  if (!record) return '<span class="song-chart-score-empty" aria-label="No record">-</span>';
  const stars = getDxScoreStarCount(record.dxScore, record.dxScoreMax);
  const dates = [['apAchievedAt', 'apDateSource', 'AP'], ['apPlusAchievedAt', 'apPlusDateSource', 'AP+']].map(([key, source, label]) => record[key]
    ? `<small class="song-chart-perfect-date"><time datetime="${escape(record[key])}">${escape(formatKstDate(record[key]))}</time> ${label} ${record[source] === 'observed' ? 'confirmed' : 'achieved'}</small>` : '').join('');
  return `<div class="song-chart-score" title="DX ${number(record.dxScore)}/${number(record.dxScoreMax)}"><div class="song-chart-score-primary"><strong>${escape(record.achievement)}</strong>${comboIcon(record.combo)}</div><span>${escape(record.rank)} · RATING ${number(record.rating)}</span>${record.sync ? `<span>${escape(record.sync)}</span>` : ''}<small class="song-chart-dx-score" aria-label="DX ${number(record.dxScore)}/${number(record.dxScoreMax)}, ${stars} stars"><span>DX ${record.dxScore}/${record.dxScoreMax}</span>${stars ? `<img class="song-chart-dx-star" src="/assets/maimai/dx-score/${stars}.png" alt="" width="${stars === 5 ? 70 : 46}" height="${stars === 5 ? 70 : 46}" loading="lazy" aria-hidden="true">` : ''}</small>${dates}</div>`;
}

export function latestPerfectCharts(charts) {
  return charts.filter((chart) => isPerfect(chart.record)).sort((a, b) =>
    (Date.parse(b.record.perfectAchievedAt ?? '') || 0) - (Date.parse(a.record.perfectAchievedAt ?? '') || 0)
    || Number(b.record.combo === 'AP+') - Number(a.record.combo === 'AP+') || b.record.achievementValue - a.record.achievementValue || a.id.localeCompare(b.id));
}

function updateProgress(state) {
  for (const node of document.querySelectorAll('[data-record-progress]')) {
    const kind = node.dataset.recordProgress;
    const value = node.dataset.progressValue;
    const charts = state.charts.filter((chart) => chart[kind] === value);
    const done = charts.filter((chart) => isPerfect(chart.record)).length;
    const rate = charts.length ? done / charts.length * 100 : 0;
    node.style.setProperty('--ap-progress', `${rate.toFixed(2)}%`);
    node.title = `AP / AP+ ${done}/${charts.length}`;
    const count = node.querySelector('[data-progress-count]');
    if (count) count.textContent = `${done}/${charts.length}${node.dataset.progressPercent === 'true' ? ` (${rate.toFixed(1)}%)` : ''}`;
  }
  for (const node of document.querySelectorAll('[data-record-total]')) {
    const kind = node.dataset.recordTotal;
    const charts = state.charts.filter((chart) => chart[kind] === node.dataset.progressValue);
    node.textContent = `${charts.length} CHARTS · ${charts.filter((chart) => isPerfect(chart.record)).length}/${charts.length}`;
  }
  let completedPlates = 0;
  for (const group of state.plates) {
    const charts = state.charts.filter((chart) => group.versionIds.includes(chart.versionId) && (!group.chartType || chart.type === group.chartType) && (group.includeReMaster || chart.difficulty !== 'Re:MASTER'));
    const done = charts.filter((chart) => isPerfect(chart.record)).length;
    const rate = charts.length ? done / charts.length * 100 : 0;
    const complete = charts.length > 0 && done === charts.length;
    if (complete) completedPlates++;
    const node = document.querySelector(`[data-plate-id="${group.id}"]`);
    if (!node) continue;
    node.classList.toggle('is-complete', complete);
    node.querySelector('.plate-progress-summary span').textContent = `${done}/${charts.length}`;
    node.querySelector('.plate-progress-summary b').textContent = `${rate.toFixed(1)}%`;
    node.querySelector('.plate-progress-track').setAttribute('aria-valuenow', rate.toFixed(1));
    node.querySelector('.plate-progress-track span').style.width = `${rate.toFixed(2)}%`;
  }
  const plateCount = document.querySelector('[data-completed-plates]');
  if (plateCount) plateCount.textContent = `${completedPlates}/${state.plates.length} 神`;
}

function updateHall(state, songs) {
  const collection = document.querySelector('.hall-collection');
  if (!collection) return;
  const groups = hallOfFameGroups(state.charts);
  let perfectCount = 0;
  for (const group of groups) {
    perfectCount += group.perfectCharts.length;
    const section = collection.querySelector(`[data-constant="${group.constant.toFixed(1)}"]`);
    if (!section) continue;
    const count = section.querySelector('.hall-count');
    count.textContent = `${group.perfectCharts.length}/${group.totalCount}`;
    count.setAttribute('aria-label', `${group.perfectCharts.length} of ${group.totalCount} charts achieved AP or AP+`);
    let jackets = section.querySelector('.hall-jackets');
    if (!jackets && group.perfectCharts.length) { jackets = document.createElement('div'); jackets.className = 'hall-jackets'; section.append(jackets); }
    if (!jackets) continue;
    const existing = new Map([...jackets.querySelectorAll('[data-chart-id]')].map((node) => [node.dataset.chartId, node]));
    for (const chart of group.perfectCharts) {
      const song = songs.get(chart.songId);
      if (!song) continue;
      let node = existing.get(chart.id);
      if (!node) { node = document.createElement('a'); node.className = 'hall-chart'; node.dataset.chartId = chart.id; node.href = `/songs/${song.id}/`; node.innerHTML = `${artwork(song)}<span class="hall-type difficulty-${difficultyClass(chart.difficulty)}"><span class="hall-type-label">${typeLabel(chart)}</span></span><strong class="hall-achievement"></strong>`; }
      const label = `${song.title} · ${typeLabel(chart)} ${chart.difficulty} · Lv ${chart.level} (${group.constant.toFixed(1)}) · ${chart.record.combo} · ${chart.record.achievement}`;
      node.title = label; node.setAttribute('aria-label', label);
      node.querySelector('.hall-achievement').textContent = chart.record.achievement;
      jackets.append(node);
      existing.delete(chart.id);
    }
    for (const node of existing.values()) node.remove();
  }
  document.querySelector('.hall-page .catalog-page-header > p:last-child').textContent = `${number(perfectCount)}/${number(groups.reduce((total, group) => total + group.totalCount, 0))}`;
}

function updateRecords(state, songs) {
  const perfect = latestPerfectCharts(state.charts);
  const gallery = document.querySelector('.record-gallery-grid');
  if (gallery) {
    gallery.innerHTML = perfect.slice(0, 12).map((chart) => {
      const song = songs.get(chart.songId);
      if (!song) return '';
      return `<a href="/songs/${song.id}/" data-chart-id="${chart.id}">${artwork(song, true)}<span class="record-copy"><strong>${escape(song.title)}</strong><small>${typeLabel(chart)} · ${chart.difficulty} · Lv ${chart.level}</small></span><span class="record-score"><span class="record-score-copy"><strong>${escape(chart.record.achievement)}</strong><small>${escape(chart.record.rank)} · ${chart.record.combo}</small></span>${comboIcon(chart.record.combo)}</span></a>`;
    }).join('');
    document.querySelector('.record-gallery-heading-meta > span').textContent = `${number(perfect.length)} CHARTS`;
  }
  const list = document.getElementById('record-list');
  if (!list) return;
  list.innerHTML = perfect.map((chart) => {
    const song = songs.get(chart.songId);
    if (!song) return '';
    const record = chart.record;
    return `<a class="record-list-row" href="/songs/${song.id}/" data-chart-id="${chart.id}" data-search="${escape(`${song.title} ${song.koreanTitle ?? ''} ${song.artist}`.toLocaleLowerCase('ko'))}" data-type="${chart.type}" data-difficulty="${chart.difficulty}" data-level="${chart.level}" data-version="${chart.versionId}">${artwork(song, true)}<span class="record-list-song"><strong>${escape(song.title)}</strong><small>${escape(song.artist)}</small></span><span class="record-list-tags"><span class="type-badge type-${chart.type.toLowerCase()}">${typeLabel(chart)}</span><span class="difficulty-badge difficulty-${difficultyClass(chart.difficulty)}">${chart.difficulty}</span><b>Lv ${chart.level}</b></span><span class="record-list-score"><span class="record-list-score-copy"><strong>${escape(record.achievement)}</strong><small>${escape([record.rank, record.combo, record.sync].filter(Boolean).join(' · '))}</small></span>${comboIcon(record.combo)}</span><span class="record-list-detail"><strong>RATING ${number(record.rating)}</strong><small>DX ${number(record.dxScore)} / ${number(record.dxScoreMax)}</small></span></a>`;
  }).join('');
  document.querySelector('.records-page-header p:last-child strong').textContent = number(perfect.length);
}

export function applyLiveRecordUi(state) {
  const charts = new Map(state.charts.map((chart) => [chart.id, chart]));
  const songs = new Map(state.songs.map((song) => [song.id, song]));
  const focusedId = document.activeElement?.closest('[data-chart-id]')?.dataset.chartId;
  for (const row of document.querySelectorAll('.chart-row[data-chart-id]')) {
    const record = charts.get(row.dataset.chartId)?.record;
    row.dataset.perfect = row.dataset.ap = String(isPerfect(record));
    row.dataset.apPlus = String(record?.combo === 'AP+');
    row.dataset.achievement = String(record?.achievementValue ?? 0);
    const score = row.querySelector('.chart-record');
    score.innerHTML = chartScore(record);
    score.title = record ? `DX ${number(record.dxScore)} / ${number(record.dxScoreMax)}` : '';
  }
  for (const cell of document.querySelectorAll('[data-song-record]')) cell.innerHTML = boardScore(charts.get(cell.dataset.songRecord)?.record);
  for (const marker of document.querySelectorAll('.song-perfect-marker[data-chart-id]')) {
    const chart = charts.get(marker.dataset.chartId);
    marker.classList.toggle('is-perfect', isPerfect(chart?.record));
    marker.title = `${chart?.difficulty}: ${isPerfect(chart?.record) ? chart.record.combo : 'Not completed'}`;
  }
  for (const types of document.querySelectorAll('.song-row-types')) {
    types.setAttribute('aria-label', [...types.querySelectorAll('.song-row-chart-group')].map((group) => `${group.querySelector('.type-badge').textContent} AP / AP+: ${[...group.querySelectorAll('.is-perfect')].map((marker) => charts.get(marker.dataset.chartId)?.difficulty).join(', ') || 'None'}`).join('; '));
  }
  for (const metric of document.querySelectorAll('[data-profile-metric]')) {
    const value = state.profile[metric.dataset.profileMetric];
    if (value !== undefined) metric.textContent = typeof value === 'number' ? number(value) : value;
  }
  updateProgress(state);
  updateHall(state, songs);
  updateRecords(state, songs);
  document.dispatchEvent(new CustomEvent('msk:records-updated'));
  if (focusedId) document.querySelector(`[data-chart-id="${focusedId}"]`)?.focus({ preventScroll: true });
  document.documentElement.dataset.recordsRevision = String(state.revision);
}
