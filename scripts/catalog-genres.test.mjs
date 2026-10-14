import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { genreGroups, genreInfo } from '../src/utils/catalog-genres.js';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('src/data/maimai.generated.json', root), 'utf8'));

test('genre groups cover every catalog song exactly once, including unclassified songs', () => {
  const groups = genreGroups(catalog.songs);
  const groupedSongs = groups.flatMap((group) => group.songs);
  assert.equal(groupedSongs.length, catalog.songs.length);
  assert.equal(new Set(groupedSongs.map((song) => song.id)).size, catalog.songs.length);
  assert.equal(groups.length, new Set(catalog.songs.map((song) => song.genre)).size);
  assert.equal(new Set(groups.map((group) => group.id)).size, groups.length);
  for (const group of groups) {
    assert.equal(group.songs.length, catalog.songs.filter((song) => song.genre === group.sourceName).length);
    assert.ok(group.songs.every((song) => genreInfo(song.genre).id === group.id));
    assert.deepEqual(group.songs.map((song) => song.title), [...group.songs].sort((a, b) => a.title.localeCompare(b.title, 'ko')).map((song) => song.title));
  }
});

test('genre labels map source names to English without rewriting catalog metadata', () => {
  assert.equal(genreInfo('ゲーム＆バラエティ').name, 'Game & Variety');
  assert.equal(genreInfo('niconico＆ボーカロイド').name, 'niconico & VOCALOID');
  assert.equal(genreInfo('POPS＆アニメ').name, 'POPS & Anime');
  assert.equal(genreInfo('東方Project').name, 'Touhou Project');
  assert.equal(genreInfo('オンゲキ＆CHUNITHM').name, 'ONGEKI & CHUNITHM');
  assert.equal(genreInfo('UNKNOWN').name, 'Other');
  assert.equal(genreInfo('').id, 'other');
  assert.equal(genreInfo().id, 'other');
  const before = JSON.stringify(catalog.songs);
  genreGroups(catalog.songs);
  assert.equal(JSON.stringify(catalog.songs), before);
});

test('new songs and future genres are discovered automatically with stable distinct paths', () => {
  const original = genreGroups(catalog.songs);
  const next = genreGroups([...catalog.songs,
    { id: 'new-maimai', title: 'New song', genre: 'maimai' },
    { id: 'new-category', title: 'A', genre: 'New / Genre' },
    { id: 'another-category', title: 'B', genre: 'New & Genre' },
  ]);
  assert.equal(next.find((group) => group.id === 'maimai').songs.length, original.find((group) => group.id === 'maimai').songs.length + 1);
  assert.equal(next.length, original.length + 2);
  assert.notEqual(genreInfo('New / Genre').id, genreInfo('New & Genre').id);
  assert.match(genreInfo('New / Genre').id, /^[a-z0-9-]+$/);
  assert.equal(genreInfo('New / Genre').id, next.find((group) => group.sourceName === 'New / Genre').id);
  assert.deepEqual(genreGroups([]), []);
});

test('genre routes share catalog search and full ST/DX chart markers with navigation entry points', () => {
  const read = (file) => readFileSync(new URL(file, root), 'utf8');
  assert.match(read('src/data/maimai.ts'), /export const GENRES = genreGroups\(SONGS\)/);
  const index = read('src/pages/genres/index.astro');
  assert.match(index, /GENRES\.map/);
  assert.match(index, /\/genres\/\$\{genre\.id\}\//);
  assert.match(index, /genre\.songs\.length/);
  const detail = read('src/pages/genres/[genre].astro');
  assert.match(detail, /getStaticPaths/);
  assert.match(detail, /<CatalogSearch/);
  assert.match(detail, /<SongRow song=\{song\} charts=\{chartsForSong\(song\.id\)\}/);
  assert.match(read('src/components/Header.astro'), /path: '\/genres\/', label: 'Genre'/);
  assert.match(read('src/pages/songs/[song].astro'), /href=\{`\$\{base\}\/genres\/\$\{genre\.id\}\/`\}/);
});
