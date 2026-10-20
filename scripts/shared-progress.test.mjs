import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../src/styles/global.css');
const rule = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`(?:^|\\n)${escaped} \\{([^}]+)\\}`))?.[1];
  assert.ok(block, `Missing rule: ${selector}`);
  return block;
};

test('all AP progress surfaces share one soft multi-hue gradient', () => {
  const gradients = [...css.matchAll(/--spectrum-progress:\s*(linear-gradient\([^;]+);/g)];
  assert.equal(gradients.length, 1);
  const colors = [...new Set(gradients[0][1].match(/#[\da-f]{6}/g))];
  assert.ok(colors.length >= 4);
  for (const color of colors) {
    const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
    assert.ok(Math.min(...channels) >= 160, `${color} stays pale`);
    assert.ok(Math.max(...channels) - Math.min(...channels) <= 90, `${color} avoids vivid saturation`);
  }
  for (const selector of ['.level-quick-grid a', '.version-quick-list a', '.level-index-grid a, .difficulty-index-card', '.version-index-list > a', '.plate-progress-track > span']) {
    assert.match(rule(selector), /background: var\(--spectrum-progress\)/, selector);
  }
  assert.doesNotMatch(css, /--progress-(?:start|end|solid)/);
});

test('shared color does not change fill direction, proportion or empty tracks', () => {
  for (const selector of ['.level-quick-grid a', '.level-index-grid a, .difficulty-index-card']) {
    assert.match(rule(selector), /bottom \/ 100% var\(--ap-progress, 0%\) no-repeat padding-box, #ffffff/);
  }
  for (const selector of ['.version-quick-list a', '.version-index-list > a']) {
    assert.match(rule(selector), /left \/ var\(--ap-progress, 0%\) 100% no-repeat padding-box, #ffffff/);
  }
  assert.match(rule('.plate-progress-track'), /background: #e6e6e6/);
  assert.match(rule('.plate-progress-track > span'), /height: 100%/);
  const plates = read('../src/pages/plates/index.astro');
  assert.match(plates, /aria-valuenow=\{rate\.toFixed\(1\)\}/);
  assert.match(plates, /width: \$\{rate\.toFixed\(2\)\}%/);
});

test('difficulty identity remains separate from the shared AP progress palette', () => {
  assert.match(rule('.difficulty-index-card'), /border-top: 3px solid var\(--difficulty-accent\)/);
  for (const name of ['basic', 'advanced', 'expert', 'master', 'remaster']) {
    assert.match(rule(`.difficulty-tone-${name}`), /--difficulty-accent: #[\da-f]{6}/);
  }
});
