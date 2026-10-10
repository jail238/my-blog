import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('retiring NET sync blocks old clients without deleting snapshots or changing Planner access', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema auth, public to anon, authenticated;
      insert into auth.users values ('00000000-0000-4000-8000-000000000001');
    `);
    for (const file of ['202610100001_planner.sql', '202610100002_planner_edit_delete.sql', '202610100003_net_records.sql']) {
      await db.exec(await read(`../supabase/migrations/${file}`));
    }
    await db.exec(`
      update public.record_snapshot set revision = 7, records = '{"56-standard-basic":{"combo":"AP"}}';
      insert into public.record_publishers values ('00000000-0000-4000-8000-000000000001');
    `);
    const before = await db.query('select records, profile, revision, updated_at from public.record_snapshot');
    await db.exec(await read('../supabase/migrations/202610100004_disable_net_records.sql'));
    const after = await db.query('select records, profile, revision, updated_at from public.record_snapshot');
    assert.deepEqual(after.rows, before.rows);
    assert.equal((await db.query('select count(*)::int as count from public.record_publishers')).rows[0].count, 1);
    for (const role of ['anon', 'authenticated']) {
      const { rows: [permissions] } = await db.query(`select
        has_function_privilege('${role}', 'public.can_import_net_records()', 'execute') as check_access,
        has_function_privilege('${role}', 'public.import_net_records(jsonb,jsonb)', 'execute') as import_access,
        has_table_privilege('${role}', 'public.record_snapshot', 'select') as snapshot_access,
        has_table_privilege('${role}', 'public.record_publishers', 'select') as publisher_access`);
      assert.deepEqual(permissions, { check_access: false, import_access: false, snapshot_access: false, publisher_access: false });
    }
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';`);
    await assert.rejects(db.query('select public.can_import_net_records()'), /permission denied/);
    await assert.rejects(db.query(`select public.import_net_records('{}', '{}')`), /permission denied/);
    await assert.rejects(db.query('select * from public.record_snapshot'), /permission denied/);
    await db.exec(`insert into public.planner_entries(chart_id, target, start_date) values ('56-standard-basic', 'AP', '2026-10-10');`);
    await db.exec(`update public.planner_entries set target = 'SSS+', start_date = '2026-10-11';`);
    const { rows: [goal] } = await db.query('select target, revision from public.planner_entries');
    assert.deepEqual(goal, { target: 'SSS+', revision: 2 });
    await db.exec(`set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';`);
    assert.equal((await db.query('select * from public.planner_entries')).rows.length, 0);
  } finally {
    await db.close();
  }
});

test('record refresh links use the Maishift workflow and retired NET routes are absent', async () => {
  for (const file of ['../src/pages/index.astro', '../src/pages/records/index.astro']) {
    const source = await read(file);
    assert.match(source, /href=\{RECORD_REFRESH_URL\}/);
    assert.doesNotMatch(source, /\/sync\//);
  }
  assert.doesNotMatch(await read('../src/layouts/CatalogLayout.astro'), /live-record/);
  for (const file of ['../src/pages/sync/index.astro', '../src/pages/net-import.js.ts', '../src/pages/record-catalog.json.ts']) {
    await assert.rejects(access(new URL(file, import.meta.url)), { code: 'ENOENT' });
  }
});
