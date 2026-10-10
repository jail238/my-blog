import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import yaml from 'js-yaml';

const configScript = fileURLToPath(new URL('./check-planner-config.mjs', import.meta.url));

test('every Pages build validates and receives public planner configuration', () => {
  for (const file of ['deploy.yml', 'refresh-records.yml', 'refresh-catalog.yml']) {
    const workflow = yaml.load(readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), 'utf8'));
    const builds = Object.values(workflow.jobs).flatMap((job) => job.steps ?? []).filter((step) => step.name === 'Build');
    assert.equal(builds.length, 1, file);
    assert.equal(builds[0].env.PUBLIC_SUPABASE_URL, '${{ vars.PUBLIC_SUPABASE_URL }}', file);
    assert.equal(builds[0].env.PUBLIC_SUPABASE_PUBLISHABLE_KEY, '${{ vars.PUBLIC_SUPABASE_PUBLISHABLE_KEY }}', file);
    assert.match(builds[0].run, /npm run check:planner-config\s+npm run build/, file);
  }
});

test('publication stops for missing or secret credentials without printing them', () => {
  for (const [url, key] of [['', ''], ['https://project.supabase.co', 'sb_secret_not-for-browser']]) {
    const result = spawnSync(process.execPath, [configScript], {
      encoding: 'utf8', env: { ...process.env, PUBLIC_SUPABASE_URL: url, PUBLIC_SUPABASE_PUBLISHABLE_KEY: key },
    });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /sb_secret_not-for-browser/);
  }
});

test('publication accepts public configuration without logging the key', () => {
  const key = 'sb_publishable_test-public-key';
  const result = spawnSync(process.execPath, [configScript], {
    encoding: 'utf8', env: { ...process.env, PUBLIC_SUPABASE_URL: 'https://project.supabase.co', PUBLIC_SUPABASE_PUBLISHABLE_KEY: key },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /configuration valid/);
  assert.ok(!result.stdout.includes(key));
});
