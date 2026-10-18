import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { consumePerfectVideoReturn, isPerfectRecord, normalizePerfectVideoUrl, perfectVideoChartMatches, PERFECT_VIDEO_RETURN_KEY, savePerfectVideoReturn, visiblePerfectVideo } from '../src/utils/perfect-videos.js';
import { songSearchIndex } from '../src/utils/catalog-search.js';

test('personal video URLs accept YouTube shares, Shorts and live links without tracking parameters', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=abcdefghijk&si=tracking&t=30',
    'https://youtu.be/abcdefghijk?si=tracking',
    'https://m.youtube.com/watch?v=abcdefghijk',
    'https://youtube.com/shorts/abcdefghijk',
    'https://www.youtube.com/live/abcdefghijk/',
  ]) assert.equal(normalizePerfectVideoUrl(url), 'https://www.youtube.com/watch?v=abcdefghijk');
  for (const url of [
    'javascript:alert(1)', 'http://youtu.be/abcdefghijk', 'https://youtube.com.evil.example/watch?v=abcdefghijk',
    'https://user:secret@youtube.com/watch?v=abcdefghijk', 'https://youtube.com:444/watch?v=abcdefghijk',
    'https://youtube.com/playlist?list=abcdefghijk', 'https://youtube.com/@channel',
    'https://youtu.be/short', 'https://youtu.be/abcdefghijk/extra', '',
  ]) assert.throws(() => normalizePerfectVideoUrl(url));
});

test('only AP or AP+ with an active valid link gets a personal video button', () => {
  const video = { url: 'https://youtu.be/abcdefghijk', deleted_at: null };
  for (const combo of ['AP', 'AP+']) {
    assert.ok(isPerfectRecord({ combo }));
    assert.equal(visiblePerfectVideo({ combo }, video), 'https://www.youtube.com/watch?v=abcdefghijk');
  }
  for (const record of [undefined, {}, { combo: 'FC+' }, { rank: 'SSS+', achievement: '100.9900%' }]) {
    assert.equal(isPerfectRecord(record), false);
    assert.equal(visiblePerfectVideo(record, video), null);
  }
  assert.equal(visiblePerfectVideo({ combo: 'AP' }, undefined), null);
  assert.equal(visiblePerfectVideo({ combo: 'AP' }, { ...video, deleted_at: '2026-10-18' }), null);
  assert.equal(visiblePerfectVideo({ combo: 'AP' }, { url: 'javascript:alert(1)' }), null);
});

test('GitHub callback returns only to the recent same-site video manager and consumes the return once', () => {
  const values = new Map();
  const storage = { setItem: (k, v) => values.set(k, v), getItem: (k) => values.get(k) ?? null, removeItem: (k) => values.delete(k) };
  savePerfectVideoReturn(storage, '/videos/', 1000);
  assert.equal(consumePerfectVideoReturn(storage, '', 1500), '/videos/');
  assert.equal(consumePerfectVideoReturn(storage, '', 1500), null);
  for (const path of ['//evil.example/', 'https://evil.example/', '/planner/', '/songs/2001/', '/videos/?next=evil', '/videos/../planner/', '/videos/%2e%2e/']) {
    savePerfectVideoReturn(storage, path, 1000);
    assert.equal(consumePerfectVideoReturn(storage, '', 1500), null);
  }
  savePerfectVideoReturn(storage, '/archive/videos/', 1000);
  assert.equal(consumePerfectVideoReturn(storage, '/archive', 1500), '/archive/videos/');
  for (const now of [999, 601001]) {
    savePerfectVideoReturn(storage, '/videos/', 1000);
    assert.equal(consumePerfectVideoReturn(storage, '', now), null);
  }
  values.set(PERFECT_VIDEO_RETURN_KEY, 'bad JSON');
  assert.equal(consumePerfectVideoReturn(storage), null);
  assert.equal(consumePerfectVideoReturn({ getItem: () => { throw new Error('Blocked'); } }), null);
});

test('video editing stays in the home-linked manager while song tables only show registered links', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const board = read('../src/components/SongChartBoard.astro');
  assert.match(board, /isPerfectRecord\(chart.record\)/);
  assert.match(board, /data-perfect-video-chart=\{chart.id\}/);
  assert.match(board, /noopener noreferrer/);
  assert.match(board, /buildMaimaiYoutubeUrl\(songTitle, type, chart.difficulty\)/);
  assert.doesNotMatch(board, /data-edit-perfect-video|Pencil/);
  assert.doesNotMatch(read('../src/pages/songs/[song].astro'), /PerfectVideoControls/);
  assert.match(read('../src/pages/songs/[song].astro'), /initializePerfectVideoLinks/);
  assert.match(read('../src/pages/index.astro'), /href=\{`\$\{base\}\/videos\/`\}/);
  const manager = read('../src/pages/videos/index.astro');
  assert.match(manager, /<PerfectVideoControls/);
  assert.match(manager, /PERFECT_RECORDED_CHARTS/);
  assert.match(manager, /songSearchIndex\(song\)/);
  for (const page of ['records/index.astro', 'hall-of-fame/index.astro', 'levels/[level].astro', 'difficulties/[difficulty].astro']) {
    assert.doesNotMatch(read(`../src/pages/${page}`), /PerfectVideoControls|data-perfect-video/);
  }
  const client = read('../src/scripts/perfect-videos.ts');
  assert.match(client, /can_manage_perfect_videos/);
  assert.doesNotMatch(client, /innerHTML|service_role|sb_secret_/);
  assert.match(read('../src/utils/perfect-videos-cloud.ts'), /eq\('revision', previous.revision\)/);
  const publicReader = read('../src/scripts/perfect-video-links.ts');
  assert.doesNotMatch(publicReader, /signIn|can_manage|savePerfectVideo|removePerfectVideo/);
});

test('manager searches multilingual titles and separates exact charts and saved-link state', () => {
  const chart = { search: songSearchIndex({ title: '春を告げる', koreanTitle: '봄을 고하다', artist: 'yama' }), combo: 'AP+', type: 'DX', difficulty: 'BASIC' };
  for (const query of ['春を告げる', '봄을고하다', '봄을 고하다', 'YAMA']) assert.ok(perfectVideoChartMatches(chart, { query }));
  assert.ok(perfectVideoChartMatches(chart, { type: 'DX', difficulty: 'BASIC', linked: 'missing' }));
  for (const filter of [{ type: 'STANDARD' }, { difficulty: 'MASTER' }, { query: 'not a match' }, { linked: 'linked' }]) assert.equal(perfectVideoChartMatches(chart, filter), false);
  const video = { url: 'https://youtu.be/abcdefghijk', deleted_at: null };
  assert.ok(perfectVideoChartMatches(chart, { linked: 'linked' }, video));
  assert.equal(perfectVideoChartMatches(chart, { linked: 'missing' }, video), false);
  assert.ok(perfectVideoChartMatches(chart, { linked: 'missing' }, { ...video, deleted_at: '2026-10-18' }));
  assert.equal(perfectVideoChartMatches({ ...chart, combo: 'FC+' }), false);
});

test('PostgreSQL restricts public video reads and owner writes, soft deletion and stale revisions', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  const url = 'https://www.youtube.com/watch?v=abcdefghijk';
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create table auth.users (id uuid primary key);
      insert into auth.users values ('${owner}'), ('${other}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
      create table public.record_publishers (user_id uuid primary key references auth.users(id));
      insert into public.record_publishers values ('${owner}');
      alter table public.record_publishers enable row level security;
      revoke all on public.record_publishers from public, anon, authenticated;
    `);
    await db.exec(readFileSync(new URL('../supabase/migrations/202610180001_perfect_videos.sql', import.meta.url), 'utf8'));
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${owner}', false);`);
    assert.equal((await db.query('select public.can_manage_perfect_videos() as allowed')).rows[0].allowed, true);
    const insert = (chart = '2001-dx-basic', value = url) => db.query('insert into public.chart_perfect_videos (chart_id,url) values ($1,$2) returning *', [chart, value]);
    const { rows: [created] } = await insert();
    assert.equal(created.revision, 1);
    await insert('2001-standard-basic');
    await insert('2001-dx-master');
    await assert.rejects(insert(), /duplicate key/);
    await assert.rejects(insert('bad-id'), /check constraint/);
    await assert.rejects(insert('2002-dx-basic', 'javascript:alert(1)'), /check constraint/);
    await assert.rejects(insert('2002-dx-basic', `${url}&token=secret`), /check constraint/);
    const { rows: [updated] } = await db.query('update public.chart_perfect_videos set url=$1 where chart_id=$2 and revision=1 returning *', [url, created.chart_id]);
    assert.equal(updated.revision, 2);
    assert.equal((await db.query('update public.chart_perfect_videos set url=$1 where chart_id=$2 and revision=1 returning *', [url, created.chart_id])).rows.length, 0);
    await db.query('update public.chart_perfect_videos set deleted_at=now() where chart_id=$1 and revision=2', [created.chart_id]);
    for (const column of ['chart_id', 'revision', 'updated_at']) {
      await assert.rejects(db.query(`update public.chart_perfect_videos set ${column}=${column} where chart_id=$1`, [created.chart_id]), /permission denied/);
    }
    await assert.rejects(db.query('delete from public.chart_perfect_videos'), /permission denied/);
    await assert.rejects(db.query('select * from public.record_publishers'), /permission denied/);
    await db.exec(`select set_config('request.jwt.claim.sub', '${other}', false);`);
    assert.equal((await db.query('select public.can_manage_perfect_videos() as allowed')).rows[0].allowed, false);
    assert.equal((await db.query('select * from public.chart_perfect_videos where chart_id=$1', [created.chart_id])).rows.length, 0);
    await assert.rejects(insert('2002-dx-basic'), /row-level security/);
    assert.equal((await db.query('update public.chart_perfect_videos set url=$1 returning *', [url])).rows.length, 0);
    await db.exec('reset role; set role anon;');
    assert.equal((await db.query('select * from public.chart_perfect_videos')).rows.length, 2);
    await assert.rejects(insert('2002-dx-basic'), /permission denied/);
    await assert.rejects(db.query('update public.chart_perfect_videos set url=$1', [url]), /permission denied/);
    await assert.rejects(db.query('select public.can_manage_perfect_videos()'), /permission denied/);
    await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${owner}', false);`);
    const { rows: [restored] } = await db.query('update public.chart_perfect_videos set url=$1,deleted_at=null where chart_id=$2 and revision=3 returning *', [url, created.chart_id]);
    assert.equal(restored.revision, 4);
    assert.equal(restored.deleted_at, null);
  } finally { await db.close(); }
});
