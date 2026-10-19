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

test('song chart comparisons show rank without a rating contribution on every viewport', async () => {
  const board = await read('../src/components/SongChartBoard.astro');
  assert.match(board, /<span class="song-chart-status">\{chart\.record\.rank\}/);
  assert.doesNotMatch(board, /RATING|chart\.record\.rating/);
  for (const retained of ['achievementWhole', 'combo-icon', 'chart.record.sync', 'song-chart-dx-score', 'song-chart-dx-star', 'AP achieved', 'AP+ achieved', 'song-chart-youtube']) {
    assert.ok(board.includes(retained), `Preserve ${retained}`);
  }
  const home = await read('../src/pages/index.astro');
  const row = await read('../src/components/ChartRow.astro');
  assert.match(home, /<small>RATING<\/small>/);
  assert.match(row, /RATING \{chart\.record\.rating\}/);
});

test('mobile chart video links have bottom space inside the comparison table', async () => {
  const css = await read('../src/styles/global.css');
  const mobile = css.split('@media (max-width: 760px) {')[1].split('@media (max-width: 390px) {')[0];
  assert.match(mobile, /\.song-chart-board-actions td \{ padding: 0 2px 12px; \}/);
  assert.doesNotMatch(mobile, /\.song-chart-board-actions td \{ padding: 0 2px; \}/);
  const videoCss = await read('../src/styles/perfect-videos.css');
  assert.match(videoCss, /\.song-chart-ap-video \{[^}]*min-height: 44px/);
});

test('rank and optional sync share one non-wrapping status line on desktop and mobile', async () => {
  const board = await read('../src/components/SongChartBoard.astro');
  const css = await read('../src/styles/global.css');
  assert.ok(board.includes('<span class="song-chart-status">{chart.record.rank}{chart.record.sync && <> · {chart.record.sync}</>}</span>'));
  assert.doesNotMatch(board, /<span>\{chart\.record\.sync\}<\/span>/);
  assert.match(css, /\.song-chart-score \.song-chart-status \{ white-space: nowrap; \}/);
});
