import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('the approved holographic theme is home-only and does not change shared styles', () => {
  const home = read('../src/pages/index.astro');
  assert.match(home, /import '\.\.\/styles\/home-holographic\.css'/);
  assert.doesNotMatch(home, /design-preview|playbook-preview/);
  for (const path of ['../src/styles/global.css', '../src/layouts/CatalogLayout.astro', '../src/components/Header.astro', '../src/components/Footer.astro']) {
    assert.doesNotMatch(read(path), /home-holographic|playbook-preview|Baloo/);
  }
  assert.doesNotMatch(read('../src/styles/home-holographic.css'), /https?:\/\//);
});

test('the home theme uses a licensed self-hosted display font and responsive collection styling', () => {
  const css = read('../src/styles/home-holographic.css');
  const font = readFileSync(new URL('../src/assets/fonts/baloo2-latin-variable.woff2', import.meta.url));
  assert.equal(font.subarray(0, 4).toString(), 'wOF2');
  assert.match(read('../src/assets/fonts/baloo2-OFL.txt'), /SIL OPEN FONT LICENSE/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width: 390px/);
  assert.doesNotMatch(css, /font-size:\s*[^;]*vw|letter-spacing:\s*-/);
  assert.doesNotMatch(css, /\.difficulty-(?:basic|advanced|expert|master|remaster)/);
});

test('the revised study uses multi-hue outlines and keeps real gradient progress fills', () => {
  const css = read('../src/styles/home-holographic.css');
  for (const name of ['spectrum', 'spectrum-progress']) {
    const gradient = css.match(new RegExp(`--${name}: (linear-gradient\\([^;]+);`))?.[1];
    assert.ok(gradient, `${name} is a real gradient`);
    assert.ok(new Set(gradient.match(/#[\da-f]{6}/g)).size >= 4, `${name} combines at least four colors`);
  }
  assert.doesNotMatch(css, /tile-spectrum|spectrum-control/);
  const outline = css.slice(css.indexOf('.archive-modes a,')).split('}')[0];
  for (const selector of ['.archive-modes a:hover', '.site-header .internal-links a:first-child:hover', '.mobile-navigation .mobile-navigation-links a:first-child:hover', '.navigation-icon-button.navigation-icon-button:hover', '.record-gallery a.record-refresh-button:hover']) {
    assert.ok(outline.includes(selector), `${selector} keeps the outline in hover states`);
  }
  assert.match(outline, /background: linear-gradient\(#fff, #fff\) padding-box, conic-gradient\(from var\(--holo-angle\),[^;]+\) border-box;/);
  assert.match(outline, /border: 2px solid transparent;/);
  assert.match(css, /\.level-quick-grid a \{[^}]*var\(--spectrum-progress\)/);
  assert.match(css, /\.version-quick-list a \{[^}]*var\(--spectrum-progress\)/);
});

test('the canvas and large reading surfaces stay neutral rather than rainbow-filled', () => {
  const css = read('../src/styles/home-holographic.css');
  assert.match(css, /--canvas: #fafbfc;/);
  assert.match(css, /html, body \{ background: var\(--canvas\);/);
  for (const selector of ['.site-header.site-header', '.mobile-navigation.mobile-navigation', '.record-gallery', '.record-gallery-grid > a', '.site-footer.site-footer']) {
    const block = css.slice(css.indexOf(`${selector} {`)).split('}')[0];
    assert.match(block, /background: #[\da-f]{3,6};/);
    assert.doesNotMatch(block, /gradient\(/);
  }
  assert.doesNotMatch(css, /spectrum-paper/);
});

test('clean holographic styling keeps playful branding and tactile press feedback', () => {
  const css = read('../src/styles/home-holographic.css');
  assert.match(css, /--font-display: 'Archive Symbols', 'Poppins'/);
  assert.match(css, /--font-brand: 'Baloo 2'/);
  assert.match(css, /\.archive-modes strong \{[^}]*font-weight: 600/);
  assert.match(css, /\.archive-modes a:hover \{[^}]*var\(--holo-lift\)/);
  assert.match(css, /\.archive-modes a:active \{[^}]*inset[^}]*translateY\(1px\)/);
  assert.doesNotMatch(css, /box-shadow: 0 [3-9]px 0/);
});

test('only the iridescent border orbits slowly and reduced motion stops it', () => {
  const css = read('../src/styles/home-holographic.css');
  assert.match(css, /@property --holo-angle \{\s*syntax: '<angle>';\s*inherits: false;\s*initial-value: 0deg;/);
  assert.match(css, /--holo-motion: holo-border-orbit 12s linear infinite;/);
  const outline = css.slice(css.indexOf('.archive-modes a,')).split('}')[0];
  assert.match(outline, /animation: var\(--holo-motion\);/);
  const orbit = css.slice(css.indexOf('@keyframes holo-border-orbit')).split('@media')[0];
  assert.match(orbit, /to \{ --holo-angle: 360deg; \}/);
  assert.doesNotMatch(orbit, /transform:|opacity:|filter:|background-color:|width:|height:/);
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(reduced, /:root \{ --holo-motion: none; \}/);
});
