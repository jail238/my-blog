import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../src/styles/global.css');
const palette = css.match(/:root\s*\{([^}]+)\}/)[1];
const colors = (value) => [...value.matchAll(/#([\da-f]{6})\b/g)].map(([, hex]) =>
  [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)));
const luminance = (rgb) => rgb.map((value) => value / 255)
  .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);

test('shared surfaces replace flat white and gray with restrained opaque pastel colors', () => {
  const wash = palette.match(/--surface-wash: ([^;]+);/)[1];
  assert.match(wash, /linear-gradient/);
  assert.equal(colors(wash).length, 3);
  for (const rgb of colors(wash)) {
    assert.ok(Math.min(...rgb) >= 240);
    assert.ok(Math.max(...rgb) - Math.min(...rgb) <= 20);
    const contrast = (luminance(rgb) + 0.05) / (luminance([109, 109, 109]) + 0.05);
    assert.ok(contrast >= 4.5, `Secondary text contrast: ${contrast}`);
  }
  assert.match(palette, /--surface: #fbfaff;/);
  assert.doesNotMatch(wash, /rgba|transparent/);
});

test('plate empty tracks stay flat and separate from the actual rainbow completion fill', () => {
  const track = css.match(/\.plate-progress-track \{([^}]+)\}/)[1];
  assert.match(track, /background: var\(--progress-track\)/);
  assert.match(track, /height: 12px; overflow: hidden/);
  assert.doesNotMatch(track, /spectrum-progress|gradient\(/);
  assert.match(palette, /--progress-track: #e5ebf9;/);
  assert.match(css, /\.plate-progress-track > span \{ background: var\(--spectrum-progress\)/);
  const page = read('../src/pages/plates/index.astro');
  assert.match(page, /aria-valuenow=\{rate\.toFixed\(1\)\}/);
  assert.match(page, /width: \$\{rate\.toFixed\(2\)\}%/);
});

test('chrome, plate interiors and filter bands use the same palette without a gray reset', () => {
  const background = read('../src/styles/pixel-background.css');
  assert.match(background, /body \.site-header\.site-header \{ background: var\(--surface-wash\)/);
  assert.match(background, /body \.site-footer\.site-footer \{ background: var\(--surface-wash\)/);
  for (const selector of ['plate-progress-item', 'song-detail-header', 'record-filters']) {
    assert.match(css, new RegExp(`\\.${selector} \\{[^}]*background: var\\(--surface-wash\\)`));
  }
  assert.doesNotMatch(css, /background: #(?:f1f1f1|e6e6e6|ececec);/);
  assert.doesNotMatch(read('../src/styles/home-holographic.css'), /background: #(?:fff|e9ecf0|f2f4f7|f0f2f5);/);
});
