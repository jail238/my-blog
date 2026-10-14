import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { normalizeSearch, searchMatches, songMatches, songSearchIndex } from '../src/utils/catalog-search.js';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('src/data/maimai.generated.json', root), 'utf8'));

test('catalog search finds every registered Korean title, with or without spaces', () => {
  const translatedSongs = catalog.songs.filter((song) => song.koreanTitle);
  assert.ok(translatedSongs.length > 700);
  for (const song of translatedSongs) {
    const index = songSearchIndex(song);
    for (const query of [song.koreanTitle, song.koreanTitle.replace(/\s/g, ''), song.koreanTitle.normalize('NFD')]) {
      assert.ok(searchMatches(index, query), `${song.id}: ${query}`);
    }
    assert.ok(searchMatches(index, song.title), `${song.id}: original title`);
  }
});

test('catalog search handles mixed languages, punctuation, kana and aliases', () => {
  const song = { title: '春を告げる', koreanTitle: '봄을 알리다', artist: 'yama', aliases: ['Haru wo Tsugeru'] };
  for (const query of ['봄을', '봄을알리다', '봄을 알리다 YAMA', 'YAMA 봄을', 'HARU WO TSUGERU', '春を告げる', '', '  ']) {
    assert.ok(songMatches(song, query), query);
  }
  assert.ok(songMatches({ title: 'ウッーウッーウマウマ(ﾟ∀ﾟ)' }, 'ｳｯｰｳｯｰｳﾏｳﾏ'));
  assert.ok(songMatches({ title: 'カタカナ' }, 'かたかな'));
  assert.ok(songMatches({ title: 'Destr0yer' }, 'ＤＥＳＴＲ０ＹＥＲ'));
  assert.equal(songMatches(song, '없는노래'), false);
  assert.equal(songMatches({ title: 'Song' }, '봄을'), false);
  assert.equal(searchMatches(undefined, '봄을'), false);
  assert.equal(normalizeSearch('너는 “보고 있었지”?'), '너는 보고 있었지');
});

test('all catalog rows index Korean titles and all filters use the shared matcher', () => {
  for (const file of ['src/components/ChartRow.astro', 'src/components/SongRow.astro', 'src/pages/records/index.astro']) {
    const source = readFileSync(new URL(file, root), 'utf8');
    assert.match(source, /data-search=\{songSearchIndex\(song\)\}/, file);
    assert.match(source, /import \{ songSearchIndex \} from .*catalog-search\.js/, file);
  }
  for (const file of ['src/components/CatalogSearch.astro', 'src/pages/levels/[level].astro', 'src/pages/difficulties/[difficulty].astro', 'src/pages/records/index.astro']) {
    const source = readFileSync(new URL(file, root), 'utf8');
    assert.match(source, /searchMatches\(row\.dataset\.search, query\)/, file);
    assert.doesNotMatch(source, /dataset\.search\?\.includes\(query\)/, file);
  }
  const planner = readFileSync(new URL('src/utils/planner.js', root), 'utf8');
  assert.match(planner, /export \{ normalizeSearch, songMatches \} from '\.\/catalog-search\.js'/);
});
