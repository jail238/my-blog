import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import sharp from 'sharp';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('the real home defaults to all three pale pixel covers without preview-only imports', () => {
  const home = read('../src/pages/index.astro');
  assert.match(home, /import defaultArchiveCover from '\.\.\/assets\/archive-city-pop-pastel-pixel\.webp'/);
  assert.match(home, /import defaultArchiveCity from '\.\.\/assets\/archive-mountain-store-pastel-pixel\.webp'/);
  assert.match(home, /archiveCover = defaultArchiveCover/);
  assert.match(home, /archiveCity = defaultArchiveCity/);
  assert.match(home, /additionalCovers = \[\{\s*id: 'residential-lane',\s*image: residentialLaneCover/);
  assert.match(home, /additionalCovers\.map\(\(\{ id, image, alt \}\)/);
  for (const name of ['city-pop', 'mountain-store', 'residential-lane']) {
    assert.match(home, new RegExp(`archive-${name}-pastel-pixel\\.webp`));
  }
  assert.match(home, /import '\.\.\/styles\/home-pixel\.css'/);
  assert.doesNotMatch(home, /styles\/retro-.*preview|design-preview/);
});

test('all three pastel pixel covers have full panoramic canvases with optimized raster files', async () => {
  for (const name of ['archive-city-pop-pastel-pixel', 'archive-mountain-store-pastel-pixel', 'archive-residential-lane-pastel-pixel']) {
    const bytes = readFileSync(new URL(`../src/assets/${name}.webp`, import.meta.url));
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, 'webp');
    assert.ok(metadata.width >= 1584);
    assert.ok(metadata.width / metadata.height > 2.3);
    assert.ok(metadata.width / metadata.height < 2.4);
    assert.ok(bytes.length < 450_000);
  }
  const css = read('../src/styles/home-pixel.css');
  assert.match(css, /\.archive-cover \{ aspect-ratio: auto; \}/);
  assert.match(css, /pointer-events: none/);
  assert.match(css, /\.archive-cover-image \{ image-rendering: pixelated; \}/);
  assert.match(css, /background: none/);
  assert.doesNotMatch(css, /object-fit|height:|filter:|\.record-gallery/);
});

test('pastel covers stay light and restrained rather than returning to dark saturated artwork', async () => {
  for (const name of ['archive-city-pop-pastel-pixel', 'archive-mountain-store-pastel-pixel', 'archive-residential-lane-pastel-pixel']) {
    const bytes = readFileSync(new URL(`../src/assets/${name}.webp`, import.meta.url));
    const { data, info } = await sharp(bytes).resize(48, 20).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let luma = 0;
    let chroma = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const [red, green, blue] = data.subarray(i, i + 3);
      luma += (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
      chroma += (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255;
    }
    const pixels = info.width * info.height;
    assert.ok(luma / pixels > 0.65, `${name} is too dark`);
    assert.ok(chroma / pixels < 0.30, `${name} is too saturated`);
  }
});

test('narrow home cover labels shrink without cropping or enlarging the artwork', () => {
  const css = read('../src/styles/home-pixel.css');
  assert.match(css, /@media \(max-width: 360px\) \{[\s\S]*?\.archive-cover \.cover-copy h1 \{ font-size: 30px;/);
  assert.match(css, /\.profile-metrics strong \{ font-size: 22px;/);
  assert.match(css, /\.cover-layout \{ gap: 8px;/);
});
