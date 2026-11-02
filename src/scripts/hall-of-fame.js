/** @param {HTMLElement | null} root */
export function initializeHallOfFame(root) {
	if (!root) return;
	const controls = root.querySelector('.hall-controls');
	const collection = root.querySelector('#hall-collection');
	const level = root.querySelector('#hall-level');
	const coverage = root.querySelector('#hall-coverage');
	const expand = root.querySelector('#hall-expand-all');
	const collapse = root.querySelector('#hall-collapse-all');
	const showUnachieved = root.querySelector('#hall-show-unachieved');
	const visibilityLabel = root.querySelector('[data-hall-visibility-label]');
	const groups = [...collection.querySelectorAll('details.hall-group')];
	const visibleGroups = () => groups.filter((group) => !group.hidden);
	let renderedLevel;

	function hydrate(group) {
		if (!showUnachieved.checked || !group.open || group.hidden) return;
		const template = group.querySelector('template[data-hall-unachieved]');
		if (!template) return;
		// Keep unachieved jackets inert until their group is opened with the filter enabled.
		group.querySelector('.hall-jackets').append(template.content.cloneNode(true));
		template.remove();
	}

	function syncButtons() {
		const visible = visibleGroups();
		expand.disabled = visible.every((group) => group.open);
		collapse.disabled = visible.every((group) => !group.open);
	}

	function filterLevel() {
		for (const group of groups) {
			group.hidden = !!level.value && group.dataset.level !== level.value;
			group.open = !!level.value && !group.hidden;
		}
		const visible = visibleGroups();
		const perfect = visible.reduce((sum, group) => sum + Number(group.dataset.perfectCount), 0);
		const total = visible.reduce((sum, group) => sum + Number(group.dataset.totalCount), 0);
		coverage.textContent = `${perfect.toLocaleString('en-US')}/${total.toLocaleString('en-US')}`;
		visible.forEach(hydrate);
		syncButtons();
		renderedLevel = level.value;
	}

	function reconcileControls() {
		collection.dataset.showUnachieved = String(showUnachieved.checked);
		visibilityLabel.textContent = showUnachieved.checked ? 'ON' : 'OFF';
		if (level.value !== renderedLevel) filterLevel();
		else {
			visibleGroups().forEach(hydrate);
			syncButtons();
		}
	}

	for (const group of groups) {
		group.addEventListener('toggle', () => {
			hydrate(group);
			syncButtons();
		});
	}
	expand.addEventListener('click', () => {
		for (const group of visibleGroups()) {
			group.open = true;
			hydrate(group);
		}
		syncButtons();
	});
	collapse.addEventListener('click', () => {
		for (const group of visibleGroups()) group.open = false;
		syncButtons();
	});
	for (const control of [level, showUnachieved]) {
		control.addEventListener('input', reconcileControls);
		control.addEventListener('change', reconcileControls);
	}
	controls.hidden = false;
	reconcileControls();
	const view = root.ownerDocument?.defaultView;
	if (view) {
		// History traversal can restore form controls after pageshow without firing change.
		const afterRestore = () => view.requestAnimationFrame(reconcileControls);
		view.addEventListener('pageshow', afterRestore);
		view.addEventListener('popstate', afterRestore);
	}
}
