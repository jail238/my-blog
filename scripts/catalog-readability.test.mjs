import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const rule = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`(?:^|\\n)${escaped} \\{([^}]+)\\}`))?.[1];
  assert.ok(block, `Missing rule: ${selector}`);
  return block;
};

test('song version links have an opaque interior and a visible thin pastel outline', () => {
  for (const selector of ['.song-version-links a', '.plate-progress-item']) {
    assert.match(rule(selector), /border: 1px solid transparent/);
    assert.match(rule(selector), /var\(--spectrum-outline\) border-box/);
  }
  assert.match(rule('.song-version-links a'), /background: linear-gradient\(var\(--surface\), var\(--surface\)\) padding-box/);
  assert.match(rule('.plate-progress-item'), /background: var\(--surface-wash\) padding-box/);
  const link = rule('.song-version-links a');
  assert.match(link, /color: #424c5a/);
  assert.match(link, /font-weight: 600/);
  assert.match(link, /min-height: 36px/);
  assert.match(rule('.song-version-links a:hover'), /var\(--spectrum-outline\) border-box/);
  const colors = css.match(/--spectrum-outline: ([^;]+)/)[1].match(/#[\da-f]{6}/g);
  assert.ok(colors.length >= 4);
  for (const color of colors) {
    const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
    assert.ok(Math.min(...channels) >= 130);
    assert.ok(Math.max(...channels) - Math.min(...channels) <= 90);
  }
});

test('song identity and complete plate items protect text from the city backdrop', () => {
  const header = rule('.song-detail-header');
  assert.match(header, /background: var\(--surface-wash\)/);
  assert.match(header, /border-block: 1px solid #d5dced/);
  assert.doesNotMatch(header, /opacity:|filter:|box-shadow:|border-radius:/);
  assert.match(rule('.plate-progress-item'), /overflow: hidden/);
  assert.match(rule('.plate-progress-copy'), /padding: 24px/);
  assert.match(rule('.plate-art'), /background: linear-gradient\(110deg, #f0f8ff, #f8f3ff 55%, #fff3f8\)/);
  assert.doesNotMatch(rule('.plate-art img'), /opacity:|filter:/);
  assert.match(rule('.plate-progress-track > span'), /background: var\(--spectrum-progress\)/);
});

test('readable catalog surfaces retain mobile spacing and usable version links', () => {
  const mobile = css.split('@media (max-width: 760px) {')[1].split('@media (max-width: 390px) {')[0];
  assert.match(mobile, /\.plate-progress-copy \{[^}]*padding: 20px 16px/);
  assert.match(mobile, /\.plate-art \{ padding: 16px 12px/);
  assert.match(mobile, /\.song-detail-header \{[^}]*padding: 16px 12px/);
  assert.match(mobile, /\.song-version-links a \{ min-height: 44px/);
});
