import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (file) => readFile(new URL(file, import.meta.url), 'utf8');

test('mobile record rows keep artwork inset and separate full-width titles from scores', async () => {
  const css = await read('../src/styles/global.css');
  const mobile = css.split('@media (max-width: 760px) {')[1].split('@media (max-width: 390px) {')[0];
  assert.match(mobile, /grid-template-areas: 'art song song' 'art tags tags' 'detail detail score'/);
  assert.match(mobile, /\.record-list-row \{[^}]*padding: 12px;/);
  assert.match(mobile, /\.record-list-row > \.song-artwork \{[^}]*align-self: start;/);
  assert.match(css, /\.record-list-row \{ grid-template-areas: 'art song tags score detail'/);
});

test('mobile chart comparison transposes existing cells without duplicating record data', async () => {
  const board = await read('../src/components/SongChartBoard.astro');
  const css = await read('../src/styles/global.css');
  const mobile = css.split('@media (max-width: 760px) {')[1].split('@media (max-width: 390px) {')[0];
  assert.equal((board.match(/--chart-row:/g) ?? []).length, 3);
  assert.equal((board.match(/headers=\{`song-chart-/g) ?? []).length, 3);
  assert.match(board, /role="table"/);
  assert.match(board, /role="columnheader" scope="col"/);
  assert.match(board, /song-chart-mobile-difficulty[^\n]*aria-hidden="true"/);
  assert.equal((board.match(/class="song-chart-score"/g) ?? []).length, 1);
  assert.match(board, /apPlusAchievedAt/);
  assert.match(board, /song-chart-dx-star/);
  assert.match(board, /buildMaimaiYoutubeUrl\(songTitle, type, chart.difficulty\)/);
  assert.match(mobile, /grid-template-columns: 84px minmax\(0, 1fr\) 44px; min-width: 0;/);
  assert.match(mobile, /grid-row: var\(--chart-row\)/);
  assert.doesNotMatch(mobile, /min-width: max\(100%, calc\(var\(--chart-count\)/);
});
