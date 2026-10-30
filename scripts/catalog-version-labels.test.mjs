import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { withDxVersionLabels } from '../src/utils/catalog-version-labels.js';

const catalog = JSON.parse(readFileSync(new URL('../src/data/maimai.generated.json', import.meta.url), 'utf8'));

test('DX version names replace the Japanese label in both full and short forms', () => {
  const versions = catalog.versions.map(withDxVersionLabels);
  for (const [id, name, shortName] of [
    ['dx', 'maimai DX', 'DX'],
    ['dx-plus', 'maimai DX PLUS', 'DX PLUS'],
    ['splash', 'maimai DX Splash', 'Splash'],
    ['circle-plus', 'maimai DX CiRCLE PLUS', 'CiRCLE PLUS'],
  ]) {
    const version = versions.find((item) => item.id === id);
    assert.equal(version.name, name);
    assert.equal(version.shortName, shortName);
  }
  assert.ok(versions.every((version) => !/\u3067\u3089\u3063\u304f\u3059/.test(version.name + version.shortName)));
});

test('display labels preserve original metadata, version identities, order and unrelated names', () => {
  const original = structuredClone(catalog.versions);
  const versions = catalog.versions.map(withDxVersionLabels);
  assert.deepEqual(catalog.versions, original);
  assert.deepEqual(versions.map(({ id, order }) => ({ id, order })), original.map(({ id, order }) => ({ id, order })));
  for (const version of original.filter((item) => !/\u3067\u3089\u3063\u304f\u3059/.test(item.name + item.shortName))) {
    assert.deepEqual(versions.find((item) => item.id === version.id), version);
  }
});

test('all UI version collections use the shared display labels rather than raw generated names', () => {
  const data = readFileSync(new URL('../src/data/maimai.ts', import.meta.url), 'utf8');
  assert.match(data, /export const VERSIONS = generatedCatalog\.versions\.map\(withDxVersionLabels\)/);
  assert.match(data, /export const versionsNewestFirst = \[\.\.\.VERSIONS\]/);
  assert.match(data, /export const versionById = new Map\(VERSIONS\.map/);
});
