import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { initHomeReveal } from '../src/scripts/home-reveal.js';

function setup({ reduced = false, supported = true, failObserve = false } = {}) {
  const sections = [100, 920, 920, 1500].map((top) => ({
    dataset: {},
    styles: {},
    style: { setProperty(name, value) { this.owner.styles[name] = value; } },
    getBoundingClientRect: () => ({ top }),
  }));
  for (const section of sections) section.style.owner = section;
  const listeners = {};
  const motion = { matches: reduced, addEventListener: (type, handler) => { listeners.motion = handler; } };
  const page = { dataset: {}, querySelectorAll: () => sections, addEventListener: (type, handler) => { listeners[type] = handler; } };
  const observed = new Set();
  let callback;
  let created = 0;
  let disconnected = false;
  const environment = {
    innerHeight: 900,
    matchMedia: () => motion,
    addEventListener: (type, handler) => { listeners[type] = handler; },
    IntersectionObserver: supported ? class {
      constructor(handler, options) { callback = handler; created++; assert.equal(options.threshold, 0.12); }
      observe(section) { if (failObserve) throw new Error('Observer unavailable'); observed.add(section); }
      unobserve(section) { observed.delete(section); }
      disconnect() { disconnected = true; observed.clear(); }
    } : undefined,
  };
  const root = { querySelector: () => page };
  const init = () => initHomeReveal(root, environment);
  init();
  return { sections, page, observed, listeners, init, emit: (entries) => callback(entries), created: () => created, disconnected: () => disconnected };
}

test('home reveal keeps the initial screen visible and prepares only off-screen sections once', () => {
  const app = setup();
  assert.equal(app.sections[0].dataset.revealState, 'visible');
  assert.equal(app.observed.size, 3);
  assert.ok(app.sections.slice(1).every((section) => section.dataset.revealState === 'pending'));
  app.init();
  assert.equal(app.created(), 1);
});

test('scrolling reveals each intersecting section once with a short ordered stagger', () => {
  const app = setup();
  app.emit(app.sections.slice(1, 3).map((target) => ({ target, isIntersecting: true })));
  assert.equal(app.sections[1].dataset.revealState, 'visible');
  assert.equal(app.sections[1].styles['--home-reveal-delay'], '0ms');
  assert.equal(app.sections[2].styles['--home-reveal-delay'], '140ms');
  assert.equal(app.sections[3].dataset.revealState, 'pending');
  assert.equal(app.observed.size, 1);
  app.emit([{ target: app.sections[3], isIntersecting: false }]);
  assert.equal(app.sections[3].dataset.revealState, 'pending');
});

test('keyboard focus reveals the section immediately without hiding its links', () => {
  const app = setup();
  app.listeners.focusin({ target: { closest: () => app.sections[3] } });
  assert.equal(app.sections[3].dataset.revealState, 'visible');
  assert.equal(app.sections[3].styles['--home-reveal-delay'], '0ms');
});

test('reduced motion, missing observers and observer errors all leave content accessible', () => {
  for (const options of [{ reduced: true }, { supported: false }, { failObserve: true }]) {
    const app = setup(options);
    assert.ok(app.sections.every((section) => section.dataset.revealState !== 'pending'));
  }
  const app = setup();
  app.listeners.motion({ matches: true });
  assert.ok(app.sections.every((section) => section.dataset.revealState === 'visible'));
  assert.equal(app.disconnected(), true);
});

test('back-forward cache restoration cannot leave sections hidden', () => {
  const app = setup();
  app.listeners.pageshow({ persisted: true });
  assert.ok(app.sections.every((section) => section.dataset.revealState === 'visible'));
  assert.equal(app.disconnected(), true);
});

test('reveal markup and CSS stay home-only, preserve layout and respect reduced motion', () => {
  const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/styles/home-pixel.css', import.meta.url), 'utf8');
  for (const section of ['categories', 'level', 'version', 'records']) assert.ok(home.includes(`data-home-reveal="${section}"`));
  assert.match(home, /import \{ initHomeReveal \} from '\.\.\/scripts\/home-reveal\.js'/);
  assert.match(css, /\.maimai-home \[data-reveal-state='pending'\] \{ opacity: 0; pointer-events: none; transition: none; translate: 0 18px;/);
  assert.match(css, /:focus-within \{ opacity: 1; pointer-events: auto; transition: none; translate: none;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition: none; translate: none;/);
  assert.doesNotMatch(css, /display: none|visibility: hidden|scroll-snap|height: 100vh/);
});
