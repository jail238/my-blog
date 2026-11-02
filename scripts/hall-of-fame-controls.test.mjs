import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeHallOfFame } from '../src/scripts/hall-of-fame.js';

function fixture(count = 3, { initialLevel = '', initialShow = false } = {}) {
	const expand = new EventTarget();
	const collapse = new EventTarget();
	const show = Object.assign(new EventTarget(), { checked: initialShow });
	const level = Object.assign(new EventTarget(), { value: initialLevel });
	const frames = [];
	const view = Object.assign(new EventTarget(), { requestAnimationFrame(callback) { frames.push(callback); } });
	const flushFrames = () => { while (frames.length) frames.shift()(); };
	const coverage = { textContent: '' };
	const label = { textContent: '' };
	const controls = { hidden: true };
	const groups = Array.from({ length: count }, (_, index) => {
		let pending = true;
		const jackets = { appended: 0, append() { this.appended++; } };
		const template = { content: { cloneNode: () => ({}) }, remove() { pending = false; } };
		return Object.assign(new EventTarget(), {
			open: false, hidden: false, jackets,
			dataset: index < 2
				? { level: '3', perfectCount: String(1 - index), totalCount: String(2 + index) }
				: { level: '12+', perfectCount: '2', totalCount: '5' },
			querySelector(selector) {
				if (selector === '.hall-jackets') return jackets;
				if (selector === 'template[data-hall-unachieved]') return pending ? template : null;
				throw new Error(`Unexpected group selector: ${selector}`);
			},
		});
	});
	const collection = { dataset: {}, querySelectorAll: () => groups };
	const nodes = new Map([
		['.hall-controls', controls], ['#hall-collection', collection],
		['#hall-level', level], ['#hall-coverage', coverage],
		['#hall-expand-all', expand], ['#hall-collapse-all', collapse],
		['#hall-show-unachieved', show], ['[data-hall-visibility-label]', label],
	]);
	initializeHallOfFame({ querySelector: (selector) => nodes.get(selector), ownerDocument: { defaultView: view } });
	const click = (button) => button.dispatchEvent(new Event('click'));
	const setShow = (checked) => { show.checked = checked; show.dispatchEvent(new Event('change')); };
	const setOpen = (index, open) => { groups[index].open = open; groups[index].dispatchEvent(new Event('toggle')); };
	const selectLevel = (value) => { level.value = value; level.dispatchEvent(new Event('change')); };
	return { expand, collapse, show, label, controls, groups, collection, level, coverage, click, setShow, setOpen, selectLevel, view, flushFrames };
}

test('controls initialize collapsed and AP-only without hydrating unachieved jackets', () => {
	const state = fixture();
	assert.equal(state.controls.hidden, false);
	assert.equal(state.expand.disabled, false);
	assert.equal(state.collapse.disabled, true);
	assert.equal(state.show.checked, false);
	assert.equal(state.collection.dataset.showUnachieved, 'false');
	assert.equal(state.label.textContent, 'OFF');
	assert.equal(state.level.value, '');
	assert.equal(state.coverage.textContent, '3/10');
	assert.ok(state.groups.every((group) => !group.open && group.jackets.appended === 0));
});

test('expand and collapse all update every group, preserving AP-only lazy state', () => {
	const state = fixture();
	state.click(state.expand);
	assert.ok(state.groups.every((group) => group.open && group.jackets.appended === 0));
	assert.equal(state.expand.disabled, true);
	assert.equal(state.collapse.disabled, false);
	state.click(state.collapse);
	assert.ok(state.groups.every((group) => !group.open));
	assert.equal(state.expand.disabled, false);
	assert.equal(state.collapse.disabled, true);
});

test('individual native toggles keep global controls synchronized', () => {
	const state = fixture(2);
	state.setOpen(0, true);
	assert.equal(state.expand.disabled, false);
	assert.equal(state.collapse.disabled, false);
	state.setOpen(1, true);
	assert.equal(state.expand.disabled, true);
	state.setOpen(0, false);
	state.setOpen(1, false);
	assert.equal(state.collapse.disabled, true);
});

test('show unachieved hydrates only open groups and never duplicates jackets', () => {
	const state = fixture();
	state.setShow(true);
	assert.ok(state.groups.every((group) => group.jackets.appended === 0));
	assert.equal(state.collection.dataset.showUnachieved, 'true');
	assert.equal(state.label.textContent, 'ON');
	state.setOpen(1, true);
	assert.deepEqual(state.groups.map((group) => group.jackets.appended), [0, 1, 0]);
	state.setShow(false);
	assert.equal(state.collection.dataset.showUnachieved, 'false');
	assert.equal(state.label.textContent, 'OFF');
	state.setShow(true);
	state.setOpen(1, false);
	state.setOpen(1, true);
	assert.deepEqual(state.groups.map((group) => group.jackets.appended), [0, 1, 0]);
});

test('show unachieved also fills already open groups and works with global toggles', () => {
	const state = fixture();
	state.click(state.expand);
	state.setShow(true);
	assert.ok(state.groups.every((group) => group.open && group.jackets.appended === 1));
	state.click(state.collapse);
	state.click(state.expand);
	assert.ok(state.groups.every((group) => group.open && group.jackets.appended === 1));
	state.setShow(false);
	assert.equal(state.collection.dataset.showUnachieved, 'false');
});

test('absent and empty collections do not break initialization', () => {
	assert.doesNotThrow(() => initializeHallOfFame(null));
	const state = fixture(0);
	assert.equal(state.expand.disabled, true);
	assert.equal(state.collapse.disabled, true);
	assert.equal(state.coverage.textContent, '0/0');
});

test('individual levels open automatically and All levels restores collapsed full coverage', () => {
	const state = fixture();
	state.selectLevel('3');
	assert.deepEqual(state.groups.map((group) => group.hidden), [false, false, true]);
	assert.deepEqual(state.groups.map((group) => group.open), [true, true, false]);
	assert.ok(state.groups.every((group) => group.jackets.appended === 0));
	assert.equal(state.coverage.textContent, '1/5');
	state.setShow(true);
	assert.equal(state.coverage.textContent, '1/5');
	state.selectLevel('12+');
	assert.deepEqual(state.groups.map((group) => group.hidden), [true, true, false]);
	assert.deepEqual(state.groups.map((group) => group.open), [false, false, true]);
	assert.equal(state.coverage.textContent, '2/5');
	state.selectLevel('');
	assert.ok(state.groups.every((group) => !group.hidden));
	assert.ok(state.groups.every((group) => !group.open));
	assert.equal(state.coverage.textContent, '3/10');
});

test('manual folding and lazy hydration still work after automatic level expansion', () => {
	const state = fixture();
	state.setOpen(2, true);
	state.selectLevel('3');
	state.setShow(true);
	assert.deepEqual(state.groups.map((group) => group.jackets.appended), [1, 1, 0]);
	assert.equal(state.expand.disabled, true);
	state.click(state.collapse);
	assert.deepEqual(state.groups.map((group) => group.open), [false, false, false]);
	assert.equal(state.collapse.disabled, true);
	state.setShow(false);
	state.setShow(true);
	assert.ok(state.groups.every((group) => !group.open));
	state.click(state.expand);
	assert.deepEqual(state.groups.map((group) => group.open), [true, true, false]);
	assert.deepEqual(state.groups.map((group) => group.jackets.appended), [1, 1, 0]);
	state.selectLevel('12+');
	assert.equal(state.expand.disabled, true);
	assert.equal(state.collapse.disabled, false);
	assert.deepEqual(state.groups.map((group) => group.jackets.appended), [1, 1, 1]);
	state.selectLevel('');
	assert.equal(state.expand.disabled, false);
	assert.equal(state.collapse.disabled, true);
	assert.ok(state.groups.every((group) => !group.open));
	assert.deepEqual(state.groups.map((group) => group.jackets.appended), [1, 1, 1]);
});

test('empty level results disable bulk controls and recover when All levels is selected', () => {
	const state = fixture();
	state.selectLevel('15');
	assert.ok(state.groups.every((group) => group.hidden));
	assert.equal(state.coverage.textContent, '0/0');
	assert.equal(state.expand.disabled, true);
	assert.equal(state.collapse.disabled, true);
	state.selectLevel('');
	assert.equal(state.expand.disabled, false);
	assert.equal(state.coverage.textContent, '3/10');
});

test('controls restored before initialization are not reset independently of the rendered view', () => {
	const state = fixture(3, { initialLevel: '12+', initialShow: true });
	assert.equal(state.level.value, '12+');
	assert.equal(state.show.checked, true);
	assert.equal(state.coverage.textContent, '2/5');
	assert.equal(state.collection.dataset.showUnachieved, 'true');
	assert.equal(state.label.textContent, 'ON');
	assert.deepEqual(state.groups.map((group) => group.hidden), [true, true, false]);
	assert.deepEqual(state.groups.map((group) => group.open), [false, false, true]);
	assert.deepEqual(state.groups.map((group) => group.jackets.appended), [0, 0, 1]);
});

test('pageshow reconciles form values restored after the event without change events', () => {
	const state = fixture();
	state.view.dispatchEvent(new Event('pageshow'));
	state.level.value = '12+';
	state.show.checked = true;
	state.flushFrames();
	assert.equal(state.coverage.textContent, '2/5');
	assert.equal(state.collection.dataset.showUnachieved, 'true');
	assert.equal(state.label.textContent, 'ON');
	assert.deepEqual(state.groups.map((group) => group.hidden), [true, true, false]);
	assert.deepEqual(state.groups.map((group) => group.open), [false, false, true]);
	assert.deepEqual(state.groups.map((group) => group.jackets.appended), [0, 0, 1]);
});

test('history restoration to All and OFF restores full collapsed coverage and switch label', () => {
	const state = fixture();
	state.selectLevel('12+');
	state.setShow(true);
	state.view.dispatchEvent(new Event('popstate'));
	state.level.value = '';
	state.show.checked = false;
	state.flushFrames();
	assert.equal(state.coverage.textContent, '3/10');
	assert.equal(state.collection.dataset.showUnachieved, 'false');
	assert.equal(state.label.textContent, 'OFF');
	assert.ok(state.groups.every((group) => !group.hidden && !group.open));
});

test('repeated page restoration with unchanged level preserves manual folding and does not duplicate jackets', () => {
	const state = fixture();
	state.selectLevel('12+');
	state.setShow(true);
	state.click(state.collapse);
	for (let index = 0; index < 3; index++) {
		state.view.dispatchEvent(new Event('pageshow'));
		state.flushFrames();
	}
	assert.ok(state.groups.every((group) => !group.open));
	assert.equal(state.coverage.textContent, '2/5');
	assert.deepEqual(state.groups.map((group) => group.jackets.appended), [0, 0, 1]);
});

test('native input events keep level and switch state synchronized without waiting for change', () => {
	const state = fixture();
	state.level.value = '3';
	state.level.dispatchEvent(new Event('input'));
	state.show.checked = true;
	state.show.dispatchEvent(new Event('input'));
	assert.equal(state.coverage.textContent, '1/5');
	assert.equal(state.collection.dataset.showUnachieved, 'true');
	assert.equal(state.label.textContent, 'ON');
	assert.deepEqual(state.groups.map((group) => group.open), [true, true, false]);
	state.click(state.collapse);
	state.level.dispatchEvent(new Event('change'));
	assert.ok(state.groups.every((group) => !group.open));
});
