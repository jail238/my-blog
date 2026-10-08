import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);

function templateFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? templateFiles(path) : entry.name.endsWith('.astro') ? [path] : [];
  });
}

test('catalog interface templates use English without changing multilingual song data', () => {
  for (const directory of ['src/components/', 'src/pages/', 'src/layouts/']) {
    for (const file of templateFiles(fileURLToPath(new URL(directory, root)))) {
      assert.doesNotMatch(readFileSync(file, 'utf8'), /[\uac00-\ud7a3]/, file);
    }
  }
  const songPage = readFileSync(new URL('src/pages/songs/[song].astro', root), 'utf8');
  assert.match(songPage, /text=\{song\.title\} label="Copy original title"/);
  assert.match(songPage, /text=\{song\.koreanTitle\} label="Copy Korean title"/);
  assert.match(readFileSync(new URL('src/layouts/CatalogLayout.astro', root), 'utf8'), /lang="en"/);
});

test('the supplied rooftop cover keeps its original dimensions and uses responsive eager loading', async () => {
  const metadata = await sharp(readFileSync(new URL('src/assets/archive-rooftop.webp', root))).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1584);
  assert.equal(metadata.height, 672);
  const home = readFileSync(new URL('src/pages/index.astro', root), 'utf8');
  assert.match(home, /widths=\{\[640, 960, 1584\]\}/);
  assert.match(home, /loading="eager"/);
  assert.match(home, /fetchpriority="high"/);
});

test('archive accents and progress use neutral grays with readable active controls', () => {
  const css = readFileSync(new URL('src/styles/global.css', root), 'utf8');
  const palette = css.match(/:root\s*\{([^}]+)\}/)?.[1] ?? '';
  const tokens = [
    'canvas', 'brand', 'brand-hover', 'brand-strong', 'brand-soft',
    'control-hover', 'progress-start', 'progress-end', 'progress-solid',
  ];
  const channel = (token) => {
    const hex = palette.match(new RegExp(`--${token}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
    assert.ok(hex, `Missing color token: ${token}`);
    const rgb = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
    assert.equal(rgb[0], rgb[1], `${token} is not neutral`);
    assert.equal(rgb[1], rgb[2], `${token} is not neutral`);
    return rgb[0] / 255;
  };
  for (const token of tokens) channel(token);
  for (const token of ['brand-strong', 'brand-hover']) {
    const value = channel(token);
    const luminance = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    assert.ok(1.05 / (luminance + 0.05) >= 4.5, `${token} has low white-text contrast`);
  }
});
