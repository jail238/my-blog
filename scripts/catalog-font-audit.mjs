import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { create as createFont } from 'fontkit';

const root = new URL('../', import.meta.url);
const fields = ['title', 'koreanTitle', 'artist', 'genre'];
const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });

export function unicodeRanges(css) {
  const ranges = [];
  for (const [, start, end] of css.matchAll(/U\+([0-9a-f]+)(?:-([0-9a-f]+))?/gi)) {
    ranges.push([parseInt(start, 16), parseInt(end ?? start, 16)]);
  }
  return ranges;
}

function readFaces(file, visited = new Set()) {
  if (visited.has(file.href)) return [];
  visited.add(file.href);
  const css = readFileSync(file, 'utf8');
  const faces = [...css.matchAll(/@import\s+['"]([^'"]+)['"]/g)]
    .flatMap(([, source]) => readFaces(new URL(source, file), visited));
  for (const [, body] of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
    const source = body.match(/src:\s*url\(['"]?([^'"\)]+)/)[1];
    const weights = body.match(/font-weight:\s*(\d+)(?:\s+(\d+))?/);
    faces.push({
      family: body.match(/font-family:\s*['"]([^'"]+)/)[1],
      weight: [Number(weights[1]), Number(weights[2] ?? weights[1])],
      ranges: unicodeRanges(body),
      font: createFont(readFileSync(new URL(source, file))),
    });
  }
  return faces;
}

function weightDistance(face, weight) {
  const [low, high] = face.weight;
  return weight >= low && weight <= high ? 0 : Math.min(Math.abs(low - weight), Math.abs(high - weight));
}

function selectFace(faces, families, codepoint, weight) {
  for (const family of families) {
    const candidates = faces.filter((face) => face.family === family);
    if (!candidates.length) continue;
    const distance = Math.min(...candidates.map((face) => weightDistance(face, weight)));
    // CSS composite faces prefer later rules, and only the closest weight is eligible.
    for (const face of candidates.toReversed()) {
      if (weightDistance(face, weight) !== distance) continue;
      if (face.ranges.some(([start, end]) => codepoint >= start && codepoint <= end)
        && face.font.hasGlyphForCodePoint(codepoint)) return face;
    }
  }
}

function isPlatformEmoji(cluster) {
  return /[\p{Emoji_Presentation}\ufe0f]/u.test(cluster)
    && /\p{Extended_Pictographic}/u.test(cluster)
    && [...cluster].every((character) => /[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200d\ufe0e\ufe0f]/u.test(character));
}

export function auditCatalogFonts(songs) {
  const cssFile = new URL('src/styles/global.css', root);
  const css = readFileSync(cssFile, 'utf8');
  const faces = readFaces(cssFile);
  const stacks = ['text', 'display'].map((kind) => ({
    kind,
    families: [...css.match(new RegExp(`--font-${kind}:([^;]+)`))[1].matchAll(/'([^']+)'/g)]
      .map(([, family]) => family),
  }));
  const failures = [];
  const emoji = new Set();
  const characters = new Set();
  const selections = new Map();
  function cachedFace(families, codepoint, weight) {
    const key = `${families.join(',')}:${weight}:${codepoint}`;
    if (!selections.has(key)) selections.set(key, selectFace(faces, families, codepoint, weight));
    return selections.get(key);
  }
  for (const song of songs) {
    for (const field of fields) {
      const text = song[field] ?? '';
      if (/\ufffd|[\u0000-\u001f\u007f]/u.test(text)) failures.push({ id: song.id, field, reason: 'Invalid source character' });
      for (const { segment } of segmenter.segment(text)) {
        for (const character of segment) characters.add(character);
        for (const { kind, families } of stacks) {
          for (const weight of [400, 600, 700]) {
            if (isPlatformEmoji(segment)) {
              emoji.add(segment);
              if (!families.includes('Apple Color Emoji') || !families.includes('Segoe UI Emoji')
                || !families.includes('Noto Color Emoji')) failures.push({ id: song.id, field, reason: 'Missing emoji fallback' });
              continue;
            }
            const selected = [...segment].map((character) => cachedFace(families, character.codePointAt(0), weight));
            const first = selected[0];
            if (selected.some((face) => !face)) {
              failures.push({ id: song.id, field, kind, weight, segment, reason: 'Missing declared glyph' });
            } else if ([...segment].length > 1
              && ([...segment].some((character) => !first.font.hasGlyphForCodePoint(character.codePointAt(0)))
                || first.font.layout(segment).glyphs.some((glyph) => glyph.id === 0))) {
              failures.push({ id: song.id, field, kind, weight, segment, reason: 'Broken combining cluster' });
            }
          }
        }
      }
    }
  }
  return {
    songs: songs.length,
    translations: songs.filter((song) => song.koreanTitle).length,
    uniqueCharacters: characters.size,
    emoji: [...emoji],
    failures,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { songs } = JSON.parse(readFileSync(new URL('src/data/maimai.generated.json', root), 'utf8'));
  const report = auditCatalogFonts(songs);
  console.log(JSON.stringify(report, null, 2));
  if (report.failures.length) process.exitCode = 1;
}
