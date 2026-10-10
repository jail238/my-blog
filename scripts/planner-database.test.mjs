import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { validatePlannerConfig } from '../src/utils/planner-config.js';

test('cloud config refuses private keys and incomplete settings before publication', () => {
  assert.equal(validatePlannerConfig('', ''), null);
  assert.deepEqual(validatePlannerConfig('https://project.supabase.co/', 'sb_publishable_example'), { url: 'https://project.supabase.co', key: 'sb_publishable_example' });
  for (const key of ['sb_secret_example', 'eyJhbGciOiJIUzI1NiJ9.service_role', '']) assert.throws(() => validatePlannerConfig('https://project.supabase.co', key));
  for (const url of ['', 'http://project.supabase.co', 'https://name:password@project.supabase.co', 'https://project.supabase.co/?token=secret']) assert.throws(() => validatePlannerConfig(url, 'sb_publishable_example'));
});

test('every pinned chart ID, including fallback charts, fits the storage identity', () => {
  const { charts } = JSON.parse(readFileSync(new URL('../src/data/maimai.generated.json', import.meta.url), 'utf8'));
  const sql = readFileSync(new URL('../supabase/migrations/202610100001_planner.sql', import.meta.url), 'utf8');
  const pattern = new RegExp(sql.match(/chart_id ~ '([^']+)'/)[1]);
  for (const chart of charts) assert.match(chart.id, pattern);
});

test('PostgreSQL enforces private ownership, dates, duplicate goals and stale revisions', async () => {
  const db = new PGlite();
  const first = '00000000-0000-4000-8000-000000000001';
  const second = '00000000-0000-4000-8000-000000000002';
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      insert into auth.users values ('${first}'), ('${second}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
    `);
    await db.exec(readFileSync(new URL('../supabase/migrations/202610100001_planner.sql', import.meta.url), 'utf8'));
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${first}', false);`);
    const insert = (chart = '1051-dx-master', target = 'AP', date = '2026-10-10') => db.query('insert into public.planner_entries (chart_id,target,start_date) values ($1,$2,$3) returning *', [chart, target, date]);
    const { rows: [created] } = await insert();
    assert.equal(created.user_id, first);
    assert.equal(created.revision, 1);
    await assert.rejects(insert(), /duplicate key/);
    await insert('1051-dx-master', 'SSS+');
    await insert('1051-standard-master', 'AP');
    await insert('1051-dx-remaster', 'AP');
    await assert.rejects(db.query('insert into public.planner_entries (user_id,chart_id,target,start_date) values ($1,$2,$3,$4)', [second, '1-dx-basic', 'AP', '2026-10-10']), /row-level security/);
    await assert.rejects(db.query("update public.planner_entries set status='completed' where id=$1", [created.id]), /check constraint/);
    await assert.rejects(db.query("update public.planner_entries set status='completed', resolved_date='2026-10-09' where id=$1", [created.id]), /check constraint/);
    const { rows: [updated] } = await db.query("update public.planner_entries set status='completed', resolved_date='2026-10-11' where id=$1 and revision=1 returning revision", [created.id]);
    assert.equal(updated.revision, 2);
    assert.equal((await db.query("update public.planner_entries set status='skipped',resolved_date='2026-10-11' where id=$1 and revision=1 returning id", [created.id])).rows.length, 0);
    await assert.rejects(db.query('update public.planner_entries set user_id=$1 where id=$2', [second, created.id]), /permission denied/);
    await assert.rejects(db.query('delete from public.planner_entries where id=$1', [created.id]), /permission denied/);
    await db.exec(`select set_config('request.jwt.claim.sub', '${second}', false);`);
    assert.equal((await db.query('select * from public.planner_entries')).rows.length, 0);
    assert.equal((await db.query("update public.planner_entries set status='pending',resolved_date=null where id=$1 returning id", [created.id])).rows.length, 0);
    await insert('1051-dx-master', 'AP');
    assert.equal((await db.query('select * from public.planner_entries')).rows.length, 1);
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from public.planner_entries'), /permission denied/);
    await assert.rejects(insert(), /permission denied/);
  } finally { await db.close(); }
});
