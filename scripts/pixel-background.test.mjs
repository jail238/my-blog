import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import sharp from 'sharp';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../src/styles/pixel-background.css');

test('every real catalog page receives the pixel backdrop from the shared head', () => {
  const head = read('../src/components/BaseHead.astro');
  assert.match(head, /import '\.\.\/styles\/pixel-background\.css'/);
  assert.match(read('../src/layouts/CatalogLayout.astro'), /<BaseHead/);
  assert.doesNotMatch(css, /retro-coast|supabase|fetch\(|localStorage/);
});

test('the pale pixel background stays behind content without dimming white cards', () => {
  assert.match(css, /body \{ isolation: isolate; \}/);
  assert.match(css, /body::before \{[^}]*retro-city-tinted-pixel-preview\.webp[^}]*image-rendering: pixelated;[^}]*opacity: 0\.50;[^}]*pointer-events: none;[^}]*position: fixed;[^}]*z-index: -1;/);
  assert.match(css, /\.maimai-home \.record-gallery \{ background: transparent;/);
  assert.match(css, /\.maimai-home \.catalog-section-heading \{\s*background: #ffffffe0;/);
  assert.match(css, /max-width: 760px/);
  assert.match(css, /background-position: 18% center;/);
  assert.doesNotMatch(css, /\.archive-modes|\.record-gallery-grid|\.level-quick-grid|animation:|filter:/);
});

test('the shared backdrop is an optimized light raster with restrained color', async () => {
  const bytes = readFileSync(new URL('../src/assets/retro-city-tinted-pixel-preview.webp', import.meta.url));
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  assert.ok(bytes.length < 350_000);
  const { data, info } = await sharp(bytes).resize(48, 32).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let luma = 0;
  let chroma = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const [red, green, blue] = data.subarray(i, i + 3);
    luma += (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    chroma += (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255;
  }
  const pixels = info.width * info.height;
  assert.ok(luma / pixels > 0.65);
  assert.ok(chroma / pixels < 0.25);
  const canvasLuma = (0.2126 * 237 + 0.7152 * 243 + 0.0722 * 248) / 255;
  assert.ok((luma / pixels + canvasLuma) / 2 > 0.80, 'The 50% backdrop stays pale over its canvas');
});
