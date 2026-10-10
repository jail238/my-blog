/**
 * @param {Document} root
 * @param {MediaQueryList} viewport
 */
export function initMobileNavigation(root = document, viewport = window.matchMedia('(max-width: 720px)')) {
	const header = /** @type {HTMLElement | null} */ (root.querySelector('[data-site-header]'));
	const toggle = root.querySelector('[data-mobile-navigation-toggle]');
	const close = root.querySelector('[data-mobile-navigation-close]');
	const dialog = /** @type {HTMLDialogElement | null} */ (root.querySelector('#mobile-navigation-dialog'));
	if (!header || !toggle || !close || !dialog || typeof dialog.showModal !== 'function') return;
	if (header.dataset.mobileNavigation === 'ready') return;

	const closeNavigation = () => {
		if (dialog.open) dialog.close();
		toggle.setAttribute('aria-expanded', 'false');
	};
	toggle.addEventListener('click', () => {
		if (!viewport.matches || dialog.open) return;
		dialog.showModal();
		toggle.setAttribute('aria-expanded', 'true');
	});
	close.addEventListener('click', closeNavigation);
	dialog.addEventListener('close', () => toggle.setAttribute('aria-expanded', 'false'));
	dialog.addEventListener('click', (event) => {
		if (event.target !== dialog) return;
		const bounds = dialog.getBoundingClientRect();
		if (event.clientX < bounds.left || event.clientX >= bounds.right || event.clientY < bounds.top || event.clientY >= bounds.bottom) {
			closeNavigation();
		}
	});
	for (const link of dialog.querySelectorAll('a[href]')) link.addEventListener('click', closeNavigation);
	viewport.addEventListener('change', () => { if (!viewport.matches) closeNavigation(); });
	header.dataset.mobileNavigation = 'ready';
}
