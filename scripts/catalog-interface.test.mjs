import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';
import { create as createFont } from 'fontkit';
import { auditCatalogFonts, unicodeRanges } from './catalog-font-audit.mjs';

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

test('home record metrics sit on the cover without a snapshot label or date', () => {
  const home = readFileSync(new URL('src/pages/index.astro', root), 'utf8');
  const cover = home.match(/<section class="archive-cover"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.match(cover, /class="profile-metrics" aria-label="Record summary"/);
  for (const label of ['RATING', 'CLASS', 'COINS']) assert.ok(cover.includes(`<small>${label}</small>`));
  assert.match(cover, /PLAYER_PROFILE\.rating\.toLocaleString/);
  assert.match(cover, /PLAYER_PROFILE\.playCount\.toLocaleString/);
  assert.doesNotMatch(home, /RECORD SNAPSHOT|snapshotDate|snapshotParts|archive-profile/);
  const css = readFileSync(new URL('src/styles/global.css', root), 'utf8');
  assert.match(css, /\.profile-metrics\s*\{[^}]*color:\s*#ffffff/);
  assert.match(css, /\.profile-metrics small\s*\{[^}]*color:\s*#ffffff/);
});

test('home cover uses the full image ratio rather than a cropped fixed-height banner', () => {
  const css = readFileSync(new URL('src/styles/global.css', root), 'utf8');
  for (const [, rule] of css.matchAll(/\.archive-cover\s*\{([^}]+)\}/g)) {
    assert.doesNotMatch(rule, /(?:min-|max-)?height\s*:/);
  }
  const image = css.match(/\.archive-cover-image\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(image, /height:\s*auto/);
  assert.match(image, /width:\s*100%/);
  assert.doesNotMatch(image, /object-fit:\s*cover|position:\s*absolute/);
  assert.match(css, /\.cover-layout\s*\{[^}]*inset:\s*0;[^}]*position:\s*absolute/);
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

test('display and multilingual text fonts are self-hosted WOFF2 with character subsets', () => {
  const css = readFileSync(new URL('src/styles/global.css', root), 'utf8');
  assert.match(css, /--font-display: 'Archive Symbols', 'Poppins', 'Pretendard JP Variable'/);
  assert.match(css, /--font-text: 'Archive Symbols', 'Pretendard JP Variable'/);
  assert.doesNotMatch(css, /SUITE|Zen Kaku Gothic/);
  const directory = new URL('src/assets/fonts/pretendard-jp/', root);
  const subsets = readFileSync(new URL('pretendard-jp.css', directory), 'utf8');
  const sources = [...subsets.matchAll(/src:\s*url\(([^)]+)\)/g)];
  assert.equal(sources.length, 119);
  assert.equal([...subsets.matchAll(/unicode-range:/g)].length, sources.length);
  for (const [, source] of sources) {
    assert.match(source, /^\.\/woff2-dynamic-subset\//);
    assert.equal(readFileSync(new URL(source, directory)).subarray(0, 4).toString(), 'wOF2');
  }
  for (const font of ['poppins-latin-semibold', 'poppins-latin-bold']) {
    assert.equal(readFileSync(new URL(`src/assets/fonts/${font}.woff2`, root)).subarray(0, 4).toString(), 'wOF2');
  }
  const head = readFileSync(new URL('src/components/BaseHead.astro', root), 'utf8');
  assert.match(head, /href=\{textFont\} as="font"/);
  assert.match(head, /href=\{displayFont\} as="font"/);
});

test('symbol fallback has real glyphs for kaomoji and missing catalog symbols at both weights', () => {
  const css = readFileSync(new URL('src/styles/global.css', root), 'utf8');
  const codepoints = [0x2200, 0x2208, 0x22bf, 0x2642, 0x266d, 0x2934, 0x32f0, 0xff65, 0xff69, 0xff84, 0xff9f,
    0x01c2, 0x039b, 0x039e, 0x03a6, 0x03a7, 0x03a8, 0x03b1, 0x03b5, 0x03bd, 0x042f, 0x0578, 0x211d, 0x2161, 0x237a, 0x272a, 0x867e];
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)]
    .map((match) => match[1]).filter((face) => face.includes("font-family: 'Archive Symbols'"));
  assert.equal(faces.length, 2);
  for (const face of faces) {
    const path = face.match(/src:\s*url\('([^']+)'\)/)[1];
    const bytes = readFileSync(new URL(path, new URL('src/styles/global.css', root)));
    assert.ok(bytes.length < 20_000, 'Symbol fallback must stay small');
    const font = createFont(bytes);
    assert.equal(font.hasGlyphForCodePoint(0x41), false, 'Do not replace ordinary letters');
    assert.match(face, /U\+0028-0029/);
    for (const cp of [0x28, 0x29]) assert.ok(font.hasGlyphForCodePoint(cp));
    for (const cp of codepoints) {
      assert.ok(unicodeRanges(face).some(([start, end]) => cp >= start && cp <= end));
      assert.ok(font.hasGlyphForCodePoint(cp), `Missing glyph U+${cp.toString(16)}`);
      assert.ok(font.glyphForCodePoint(cp).path.toSVG().length > 0);
    }
    assert.ok(font.layout('(\uff9f\u2200\uff9f)').glyphs.every((glyph) => glyph.id > 0));
  }
});

test('every catalog title, translation and artist has glyph and combining-cluster coverage', () => {
  const { songs } = JSON.parse(readFileSync(new URL('src/data/maimai.generated.json', root), 'utf8'));
  const report = auditCatalogFonts(songs);
  assert.equal(report.songs, songs.length);
  assert.deepEqual(report.failures, []);
});

test('font audit does not silently skip undeclared characters or malformed source text', () => {
  const report = auditCatalogFonts([{ id: 'audit', title: '\u{10ffff}\ufffd' }]);
  assert.ok(report.failures.some((failure) => failure.reason === 'Missing declared glyph'));
  assert.ok(report.failures.some((failure) => failure.reason === 'Invalid source character'));
});
