import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { perfectVideoCollection, perfectVideoSavedDate } from '../src/utils/perfect-video-gallery.js';
import { songSearchIndex } from '../src/utils/catalog-search.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const link = { url: 'https://youtu.be/abcdefghijk', deleted_at: null, updated_at: '2026-10-21T00:00:00Z' };
const chart = (id, title, extra = {}) => ({ id, title, combo: 'AP+', type: 'DX', difficulty: 'MASTER', constant: 12.7, search: songSearchIndex({ title, artist: 'Artist' }), ...extra });

test('collection includes only active valid videos for AP/AP+ charts, even for an authenticated owner', () => {
  const charts = ['one', 'deleted', 'invalid', 'missing', 'fc'].map((id) => chart(id, id, { combo: id === 'fc' ? 'FC+' : 'AP' }));
  const videos = new Map([
    ['one', link], ['deleted', { ...link, deleted_at: '2026-10-22' }],
    ['invalid', { ...link, url: 'https://evil.example/watch?v=abcdefghijk' }], ['fc', link],
  ]);
  assert.deepEqual(perfectVideoCollection(charts, videos).map((row) => row.id), ['one']);
  assert.deepEqual(perfectVideoCollection(charts, videos, { linked: 'missing' }).map((row) => row.id), ['one']);
});

test('collection filters translated titles, artists and exact chart type/difficulty', () => {
  const song = { title: '春を告げる', koreanTitle: '봄을 고하다', artist: 'yama' };
  const charts = [chart('one', song.title, { search: songSearchIndex(song), type: 'STANDARD', difficulty: 'BASIC' })];
  const videos = new Map([['one', link]]);
  for (const query of ['春を告げる', '봄을고하다', '봄을 고하다', 'YAMA']) assert.equal(perfectVideoCollection(charts, videos, { query }).length, 1);
  assert.equal(perfectVideoCollection(charts, videos, { type: 'STANDARD', difficulty: 'BASIC' }).length, 1);
  for (const filter of [{ type: 'DX' }, { difficulty: 'MASTER' }, { query: 'not found' }]) assert.equal(perfectVideoCollection(charts, videos, filter).length, 0);
});

test('coverage uses all registered chart videos over all AP/AP+ charts, independent of search and pagination', () => {
  const charts = Array.from({ length: 221 }, (_, index) => chart(String(index), index < 2 ? 'Find me' : `Song ${index}`, { combo: index % 2 ? 'AP' : 'AP+' }));
  const videos = new Map(charts.slice(0, 27).map((row) => [row.id, link]));
  videos.set('unknown-chart', link);
  assert.equal(perfectVideoCollection(charts, videos).length, 27);
  assert.equal(charts.length, 221);
  assert.equal(perfectVideoCollection(charts, videos, { query: 'Find me' }).length, 2);
  assert.equal(perfectVideoCollection(charts, videos, { query: 'missing' }).length, 0);
  const client = read('../src/scripts/perfect-video-gallery.ts');
  assert.match(client, /const registered = perfectVideoCollection\(charts, videos\)\.length/);
  assert.match(client, /ready \? `\$\{registered\}\/\$\{charts.length\} AP videos` : ''/);
  assert.doesNotMatch(client, /get\('count'\)\.textContent = .*selected\.length/);
  assert.match(read('../src/pages/videos/gallery.astro'), /Registered AP videos \/ all AP and AP\+ charts/);
  videos.set('0', { ...link, deleted_at: '2026-10-29' });
  videos.set('1', { ...link, url: 'https://invalid.example/' });
  assert.equal(perfectVideoCollection(charts, videos).length, 25);
  assert.equal(perfectVideoCollection(charts, new Map()).length, 0);
});

test('recent means latest saved link rather than achievement percentage or original catalog order', () => {
  const charts = [chart('one', 'First'), chart('two', 'Second'), chart('three', 'Third')];
  const videos = new Map([
    ['one', link], ['two', { ...link, updated_at: '2026-10-28T00:00:00Z' }],
    ['three', { ...link, updated_at: 'not a date' }],
  ]);
  assert.deepEqual(perfectVideoCollection(charts, videos).map((row) => row.id), ['two', 'one', 'three']);
  assert.deepEqual(charts.map((row) => row.id), ['one', 'two', 'three']);
});

test('title and level sorts are deterministic and separate ST/DX/difficulties sharing one video', () => {
  const charts = [chart('one', 'Beta', { constant: 13.9 }), chart('two', 'Alpha', { constant: 3 }), chart('three', 'Beta', { constant: 13.9, type: 'STANDARD' })];
  const videos = new Map(charts.map((row) => [row.id, link]));
  assert.deepEqual(perfectVideoCollection(charts, videos, { sort: 'title' }).map((row) => row.id), ['two', 'one', 'three']);
  assert.deepEqual(perfectVideoCollection(charts, videos, { sort: 'level' }).map((row) => row.id), ['one', 'three', 'two']);
  videos.set('two', { ...link, deleted_at: '2026-10-28' });
  assert.equal(perfectVideoCollection(charts, videos).length, 2);
  videos.set('two', link);
  assert.equal(perfectVideoCollection(charts, videos).length, 3);
});

test('saved dates use the existing last-save timestamp and the KST calendar day', () => {
  assert.deepEqual(perfectVideoSavedDate(link), { dateTime: '2026-10-21T00:00:00.000Z', label: '2026.10.21' });
  assert.equal(perfectVideoSavedDate({ ...link, updated_at: '2026-10-29T14:59:59Z' }).label, '2026.10.29');
  assert.equal(perfectVideoSavedDate({ ...link, updated_at: '2026-10-29T15:00:00Z' }).label, '2026.10.30');
  assert.equal(perfectVideoSavedDate({ ...link, updated_at: '2026-10-30T00:00:00+09:00' }).label, '2026.10.30');
});

test('missing or malformed saved dates never display an invalid or invented date', () => {
  for (const video of [undefined, null, {}, { updated_at: '' }, { updated_at: 'not a date' }, { updated_at: null }]) assert.equal(perfectVideoSavedDate(video), null);
  const client = read('../src/scripts/perfect-video-gallery.ts');
  assert.match(client, /time.parentElement!\.hidden = !saved/);
  assert.match(client, /else time.removeAttribute\('datetime'\)/);
});

test('gallery labels the last site save date without claiming an original registration or upload date', () => {
  const page = read('../src/pages/videos/gallery.astro');
  assert.match(page, /Last saved on this site \(KST\); changes when the link is edited/);
  assert.match(page, /Saved <time data-video-saved-date>/);
  assert.doesNotMatch(page, /Uploaded|First registered|created_at/);
});

test('home opens the collection while the manager keeps its original URL and OAuth return path', () => {
  assert.match(read('../src/pages/index.astro'), /href=\{`\$\{base\}\/videos\/gallery\/`\}/);
  const nav = read('../src/components/APVideoNavigation.astro');
  assert.match(nav, /\/videos\/gallery\//);
  assert.match(nav, /href=\{`\$\{base\}\/videos\/`\}/);
  assert.match(nav, /aria-current=/);
  assert.match(read('../src/pages/videos/index.astro'), /APVideoNavigation current="manage"/);
  assert.match(read('../src/pages/videos/gallery.astro'), /APVideoNavigation current="collection"/);
});

test('public gallery never edits cloud records or requests authentication or an API key', () => {
  const page = read('../src/pages/videos/gallery.astro');
  const client = read('../src/scripts/perfect-video-gallery.ts');
  assert.doesNotMatch(page + client, /PerfectVideoControls|signIn|can_manage_perfect_videos|savePerfectVideo|removePerfectVideo|service_role|sb_secret_|innerHTML|iframe/);
  assert.match(page, /data-video-collection-chart=\{chart.id\}[\s\S]*?hidden>/);
  assert.match(page, /target="_blank" rel="noopener noreferrer"/);
  assert.match(client, /loadPerfectVideos\(\[\.\.\.byId.keys\(\)\]\)/);
  assert.match(client, /visiblePerfectVideo/);
  assert.match(client, /if \(index >= limit\) return;[\s\S]*perfectVideoSavedDate\(video\)/);
  assert.match(page, /<SongArtwork song=\{song\} \/>/);
  assert.doesNotMatch(page + client, /i\.ytimg\.com|data-video-thumbnail|perfectVideoThumbnailUrl/);
});

test('gallery handles loading, errors, empty searches, pagination and event-driven refreshes', () => {
  const client = read('../src/scripts/perfect-video-gallery.ts');
  assert.match(client, /let limit = 20/);
  assert.match(client, /limit \+= 20/);
  assert.match(client, /No videos found\./);
  assert.match(client, /No saved videos\./);
  assert.match(client, /Could not refresh videos\. Showing the last loaded list\./);
  assert.match(client, /Could not load videos\. Try refresh\./);
  assert.match(client, /grid.setAttribute\('aria-busy', 'false'\)/);
  assert.match(client, /if \(loading\) return/);
  assert.match(client, /window.addEventListener\('focus'/);
  assert.doesNotMatch(client, /setInterval|localStorage/);
});

test('gallery uses shared pastel outlines and uncropped responsive square jackets', () => {
  const css = read('../src/styles/perfect-video-gallery.css');
  assert.match(css, /\.video-collection-page \[hidden\] \{ display: none !important;/);
  assert.match(css, /\.video-collection-artwork \{ aspect-ratio: 1;/);
  assert.match(css, /\.video-collection-cover \.song-artwork img \{ object-fit: contain;/);
  assert.match(css, /border-radius: 8px/);
  assert.match(css, /gap: 2px; line-height: 1\.35/);
  assert.match(css, /@media \(max-width: 359px\)/);
  assert.doesNotMatch(css, /filter:|font-size:.*vw|background:.*(?:#3d3d3d|#ffffff)/i);
  assert.match(read('../src/styles/catalog-outlines.css'), /\.video-collection-card:not\(:hover\):not\(:focus-within\)/);
});

test('desktop uses compact auto-filled cards while mobile keeps its existing two/one-column layout', () => {
  const css = read('../src/styles/perfect-video-gallery.css');
  assert.match(css, /\.video-collection-grid \{[^}]*gap: 16px;[^}]*grid-template-columns: repeat\(auto-fill, minmax\(160px, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.video-collection-grid \{ gap: 12px; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 359px\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.doesNotMatch(css, /@media \(max-width: 1000px\)/);
});
