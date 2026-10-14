import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (file) => readFile(new URL(file, import.meta.url), 'utf8');

test('mobile record rows hide rating and DX scores and use two compact rows', async () => {
  const css = await read('../src/styles/global.css');
  const mobile = css.split('@media (max-width: 760px) {')[1].split('@media (max-width: 390px) {')[0];
  assert.match(mobile, /grid-template-areas: 'art song song' 'tags tags score'/);
  assert.match(mobile, /\.record-list-detail \{ display: none; \}/);
  assert.match(mobile, /\.record-list-row \{[^}]*min-height: 0;/);
  assert.match(mobile, /\.record-list-row \{[^}]*padding: 12px;/);
  assert.match(mobile, /\.record-list-row > \.song-artwork \{[^}]*align-self: start;/);
  assert.match(css, /\.record-list-row \{ grid-template-areas: 'art song tags score detail'/);
});

test('mobile chart comparison keeps all difficulty columns in one fitted table', async () => {
  const board = await read('../src/components/SongChartBoard.astro');
  const css = await read('../src/styles/global.css');
  const mobile = css.split('@media (max-width: 760px) {')[1].split('@media (max-width: 390px) {')[0];
  assert.doesNotMatch(board, /--chart-row:|song-chart-mobile-difficulty/);
  assert.equal((board.match(/headers=\{`song-chart-/g) ?? []).length, 3);
  assert.match(board, /role="table"/);
  assert.match(board, /role="columnheader" scope="col"/);
  assert.match(board, /<wbr \/>/);
  assert.equal((board.match(/class="song-chart-score"/g) ?? []).length, 1);
  assert.match(board, /apPlusAchievedAt/);
  assert.match(board, /song-chart-dx-star/);
  assert.match(board, /buildMaimaiYoutubeUrl\(songTitle, type, chart.difficulty\)/);
  assert.match(mobile, /\.song-chart-board \{ min-width: 0; width: 100%; \}/);
  assert.doesNotMatch(mobile, /\.song-chart-board[^}]*display: grid/);
  assert.doesNotMatch(mobile, /\.song-chart-board thead[^}]*clip-path/);
  assert.doesNotMatch(mobile, /min-width: max\(100%, calc\(var\(--chart-count\)/);
});
