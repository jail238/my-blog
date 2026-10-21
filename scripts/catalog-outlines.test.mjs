import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const css = read('../src/styles/catalog-outlines.css');

test('all catalog layouts load thin shared outlines without importing home branding', () => {
  const head = read('../src/components/BaseHead.astro');
  assert.match(head, /import '\.\.\/styles\/catalog-outlines\.css'/);
  assert.doesNotMatch(css, /Baloo|font-family:|font-size:|fetch\(|localStorage/);
  for (const selector of [
    '.record-list-row', '.song-chart-group', '.level-index-grid > a', '.difficulty-index-card',
    '.version-index-list > a', '.plate-progress-item', '.song-version-link', '.record-filters',
    '.difficulty-chart-page-size', '.difficulty-chart-sort-toggle', '.level-chart-view-toggle',
    '.difficulty-chart-pagination button', '.perfect-video-button', '.song-chart-ap-video',
    '.video-manager-filters select', '.planner-entry', '.planner-dialog', '.planner-search',
    'body .site-header .navigation-icon-button',
  ]) assert.ok(css.includes(selector), selector);
  assert.match(css, /border: 1px solid transparent;/);
});

test('outline motion is per element, slow, optional and does not animate layout or content', () => {
  assert.match(css, /@property --catalog-rim-angle \{\s*syntax: '<angle>';\s*inherits: false;/);
  assert.match(css, /--catalog-rim: conic-gradient\(from var\(--catalog-rim-angle\)/);
  assert.match(css, /--catalog-rim-motion: catalog-rim-orbit 12s linear infinite/);
  assert.match(css, /animation: var\(--catalog-rim-motion\)/);
  assert.match(css, /@keyframes catalog-rim-orbit \{ to \{ --catalog-rim-angle: 360deg; \} \}/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*--catalog-rim-motion: none/);
  assert.doesNotMatch(css, /transform:|opacity:|filter:|width:|height:/);
});

test('normal lists get outlines but jacket-only grid tiles remain unframed', () => {
  for (const [collection, row] of [['chart-list', 'chart-row'], ['song-list', 'song-row']]) {
    assert.ok(css.includes(`.${collection}:not([data-view='grid']) > .${row}`));
    assert.doesNotMatch(css, new RegExp(`(?<!>) \\.${row}\\s*[,\\n]`));
  }
  assert.doesNotMatch(css, /\.song-artwork|\.hall-jacket|\.type-badge|\.difficulty-badge/);
  assert.match(css, /\.chart-row:not\(:hover\):not\(:focus-within\)/);
  assert.match(css, /animation-play-state: paused/);
});

test('AP fill stays above the interior with real proportions and difficulty accents retained', () => {
  assert.match(css, /background: var\(--catalog-rim-progress\) padding-box,\s*var\(--catalog-rim-fill\) padding-box, var\(--catalog-rim\) border-box/);
  assert.match(css, /--catalog-rim-progress: var\(--spectrum-progress\) bottom \/ 100% var\(--ap-progress, 0%\) no-repeat/);
  assert.match(css, /--catalog-rim-progress: var\(--spectrum-progress\) left \/ var\(--ap-progress, 0%\) 100% no-repeat/);
  assert.match(css, /border-top: 3px solid var\(--difficulty-accent\)/);
  assert.doesNotMatch(css, /--ap-progress:|--spectrum-progress:/);
});

test('semantic states, checkboxes, nested search inputs and table dividers are not overwritten', () => {
  assert.ok(css.includes("input:not([type='checkbox']):not([type='radio'])"));
  assert.ok(css.includes('.planner-button:not(.planner-delete-button)'));
  assert.match(css, /--catalog-rim-fill: linear-gradient\(var\(--brand-strong\), var\(--brand-strong\)\)/);
  assert.match(css, /--catalog-rim-fill: linear-gradient\(var\(--brand-hover\), var\(--brand-hover\)\)/);
  assert.doesNotMatch(css, /\.planner-search input|\.planner-day|\.song-chart-board (?:th|td)|\.video-manager-toggle/);
});
