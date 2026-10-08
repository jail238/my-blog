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
