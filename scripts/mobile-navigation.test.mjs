import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { initMobileNavigation } from '../src/scripts/mobile-navigation.js';

class Node extends EventTarget {
	dataset = {};
	attributes = new Map();
	setAttribute(name, value) { this.attributes.set(name, value); }
	getAttribute(name) { return this.attributes.get(name); }
}

class Dialog extends Node {
	open = false;
	showCount = 0;
	links = Array.from({ length: 7 }, () => new Node());
	showModal() { this.open = true; this.showCount += 1; }
	close() { this.open = false; this.dispatchEvent(new Event('close')); }
	querySelectorAll() { return this.links; }
	getBoundingClientRect() { return { left: 0, right: 304, top: 0, bottom: 844 }; }
}

function fixture(matches = true) {
	const header = new Node(), toggle = new Node(), close = new Node(), dialog = new Dialog();
	const viewport = Object.assign(new EventTarget(), { matches });
	const nodes = new Map([
		['[data-site-header]', header], ['[data-mobile-navigation-toggle]', toggle],
		['[data-mobile-navigation-close]', close], ['#mobile-navigation-dialog', dialog],
	]);
	const root = { querySelector: (selector) => nodes.get(selector) };
	initMobileNavigation(root, viewport);
	return { root, nodes, header, toggle, close, dialog, viewport };
}

const click = (node, coordinates = {}) => node.dispatchEvent(Object.assign(new Event('click', { cancelable: true }), coordinates));

test('mobile navigation opens one native modal and tracks its expanded state', () => {
	const { header, toggle, dialog, root, viewport } = fixture();
	assert.equal(header.dataset.mobileNavigation, 'ready');
	click(toggle);
	assert.equal(dialog.open, true);
	assert.equal(toggle.getAttribute('aria-expanded'), 'true');
	click(toggle);
	assert.equal(dialog.showCount, 1);
	initMobileNavigation(root, viewport);
	dialog.close();
	click(toggle);
	assert.equal(dialog.showCount, 2, 'Repeated setup must not duplicate listeners');
});

test('close button and native Escape closure both reset the trigger', () => {
	const { toggle, close, dialog } = fixture();
	click(toggle);
	click(close);
	assert.equal(dialog.open, false);
	assert.equal(toggle.getAttribute('aria-expanded'), 'false');
	click(toggle);
	dialog.close();
	assert.equal(toggle.getAttribute('aria-expanded'), 'false');
});

test('backdrop clicks close the drawer but blank space inside does not', () => {
	const { toggle, dialog } = fixture();
	click(toggle);
	click(dialog, { clientX: 150, clientY: 400 });
	assert.equal(dialog.open, true);
	click(dialog, { clientX: 350, clientY: 400 });
	assert.equal(dialog.open, false);
	assert.equal(toggle.getAttribute('aria-expanded'), 'false');
});

test('every navigation link closes the drawer without cancelling navigation', () => {
	const { toggle, dialog } = fixture();
	for (const link of dialog.links) {
		click(toggle);
		assert.equal(click(link), true);
		assert.equal(dialog.open, false);
		assert.equal(toggle.getAttribute('aria-expanded'), 'false');
	}
});

test('switching to desktop closes the drawer and prevents hidden-trigger activation', () => {
	const { toggle, dialog, viewport } = fixture();
	click(toggle);
	viewport.matches = false;
	viewport.dispatchEvent(new Event('change'));
	assert.equal(dialog.open, false);
	click(toggle);
	assert.equal(dialog.open, false);
	viewport.matches = true;
	viewport.dispatchEvent(new Event('change'));
	click(toggle);
	assert.equal(dialog.open, true);
});

test('missing elements and unsupported dialog browsers keep fallback navigation', () => {
	assert.doesNotThrow(() => initMobileNavigation({ querySelector: () => null }, { matches: true }));
	const { root, header, dialog, viewport } = fixture();
	delete header.dataset.mobileNavigation;
	dialog.showModal = undefined;
	initMobileNavigation(root, viewport);
	assert.equal(header.dataset.mobileNavigation, undefined);
});

test('header keeps one shared route list, accessible controls and mobile-only drawer styles', () => {
	const header = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
	for (const path of ['/', '/levels/', '/difficulties/', '/versions/', '/plates/', '/hall-of-fame/', '/planner/']) {
		assert.equal(header.split(`path: '${path}'`).length - 1, 1);
	}
	assert.equal(header.match(/links\.map\(/g).length, 2);
	assert.match(header, /aria-controls="mobile-navigation-dialog"/);
	assert.match(header, /aria-haspopup="dialog"/);
	assert.match(header, /<dialog[^>]+aria-label="Navigation"/);
	assert.match(header, /aria-label="Close navigation"/);
	assert.match(header, /max-width: 720px/);
	assert.match(header, /mobile-menu-toggle \{ display: none; \}/);
	assert.match(header, /prefers-reduced-motion: reduce/);
	assert.match(header, /html:has\(#mobile-navigation-dialog\[open\]\)/);
});
