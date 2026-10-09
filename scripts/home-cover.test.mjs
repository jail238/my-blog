import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const script = home.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
const coverIds = [...home.matchAll(/<template data-archive-cover="([^"]+)"/g)].map(([, id]) => id);

function render({ previous, random = 0, blocked = false, ids = coverIds } = {}) {
  const mounted = [];
  const cover = {
    dataset: {},
    querySelectorAll: () => ids.map((id) => ({
      dataset: { archiveCover: id },
      content: { cloneNode: () => id },
    })),
    prepend: (node) => mounted.push(node),
  };
  let saved;
  runInNewContext(script, {
    document: { currentScript: { closest: () => cover } },
    Math: { floor: Math.floor, random: () => random },
    sessionStorage: {
      getItem: () => { if (blocked) throw new Error('Storage blocked'); return previous; },
      setItem: (key, value) => { if (blocked) throw new Error('Storage blocked'); saved = { key, value }; },
    },
  });
  return { mounted, id: cover.dataset.cover, saved };
}

test('first load can randomly select either supplied cover and mounts only that image', () => {
  assert.deepEqual(coverIds, ['rooftop', 'city']);
  for (const [random, expected] of [[0, 'rooftop'], [0.999, 'city']]) {
    const result = render({ random });
    assert.deepEqual(result.mounted, [expected]);
    assert.equal(result.id, expected);
    assert.deepEqual(result.saved, { key: 'msk.archive-cover', value: expected });
  }
});

test('refreshes do not repeat the previous cover in the same tab', () => {
  for (const previous of coverIds) {
    for (const random of [0, 0.999]) assert.notEqual(render({ previous, random }).id, previous);
  }
});

test('cover selection still works when session storage is unavailable or stale', () => {
  assert.equal(render({ blocked: true, random: 0.999 }).id, 'city');
  assert.equal(render({ previous: 'removed-cover', random: 0 }).id, 'rooftop');
});

test('a future single-cover setup still renders its image', () => {
  assert.deepEqual(render({ ids: ['rooftop'], previous: 'rooftop' }).mounted, ['rooftop']);
});
