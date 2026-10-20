/**
 * @param {Document} root
 * @param {Window & typeof globalThis} environment
 */
export function initHomeReveal(root = document, environment = window) {
  const page = root.querySelector('.maimai-home');
  if (!page || page.dataset.homeRevealReady) return;
  const sections = [...page.querySelectorAll('[data-home-reveal]')];
  if (!sections.length || typeof environment.matchMedia !== 'function') return;
  const motion = environment.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || typeof environment.IntersectionObserver !== 'function') return;

  let observer;
  const reveal = (section, delay = 0) => {
    section.style.setProperty('--home-reveal-delay', `${delay}ms`);
    section.dataset.revealState = 'visible';
    observer?.unobserve(section);
  };
  const revealAll = () => {
    for (const section of sections) reveal(section);
    observer?.disconnect();
  };

  try {
    observer = new environment.IntersectionObserver((entries) => {
      entries
        .filter((entry) => entry.isIntersecting && entry.target.dataset.revealState === 'pending')
        .forEach((entry, index) => reveal(entry.target, Math.min(index, 3) * 140));
    }, { threshold: 0.12, rootMargin: '0px 0px -90px 0px' });

    // Keep the first screen visible; only off-screen sections wait for scrolling.
    for (const section of sections) {
      if (section.getBoundingClientRect().top < environment.innerHeight * 0.75) {
        reveal(section);
      } else {
        section.dataset.revealState = 'pending';
        observer.observe(section);
      }
    }

    page.addEventListener('focusin', (event) => {
      const section = event.target.closest('[data-home-reveal]');
      if (sections.includes(section) && section.dataset.revealState === 'pending') reveal(section);
    });
    motion.addEventListener('change', (event) => { if (event.matches) revealAll(); });
    environment.addEventListener('pageshow', (event) => { if (event.persisted) revealAll(); });
    page.dataset.homeRevealReady = 'true';
  } catch {
    revealAll();
  }
}
