/** @param {HTMLElement | null} root */
export function initializeHallOfFame(root) {
	if (!root) return;
	const controls = root.querySelector('.hall-controls');
	const collection = root.querySelector('#hall-collection');
	const expand = root.querySelector('#hall-expand-all');
	const collapse = root.querySelector('#hall-collapse-all');
	const showUnachieved = root.querySelector('#hall-show-unachieved');
	const visibilityLabel = root.querySelector('[data-hall-visibility-label]');
	const groups = [...collection.querySelectorAll('details.hall-group')];

	function hydrate(group) {
		if (!showUnachieved.checked || !group.open) return;
		const template = group.querySelector('template[data-hall-unachieved]');
		if (!template) return;
		// Keep unachieved jackets inert until their group is opened with the filter enabled.
		group.querySelector('.hall-jackets').append(template.content.cloneNode(true));
		template.remove();
	}

	function syncButtons() {
		expand.disabled = groups.every((group) => group.open);
		collapse.disabled = groups.every((group) => !group.open);
	}

	for (const group of groups) {
		group.addEventListener('toggle', () => {
			hydrate(group);
			syncButtons();
		});
	}
	expand.addEventListener('click', () => {
		for (const group of groups) {
			group.open = true;
			hydrate(group);
		}
		syncButtons();
	});
	collapse.addEventListener('click', () => {
		for (const group of groups) group.open = false;
		syncButtons();
	});
	showUnachieved.addEventListener('change', () => {
		collection.dataset.showUnachieved = String(showUnachieved.checked);
		visibilityLabel.textContent = showUnachieved.checked ? 'ON' : 'OFF';
		if (showUnachieved.checked) groups.forEach(hydrate);
	});
	showUnachieved.checked = false;
	collection.dataset.showUnachieved = 'false';
	visibilityLabel.textContent = 'OFF';
	controls.hidden = false;
	syncButtons();
}
