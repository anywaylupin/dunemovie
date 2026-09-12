/**
 * Anchor navigation.
 *
 * The easing itself is `scroll-behavior: smooth` in CSS - no scroll library,
 * nothing running per frame. This only handles what CSS cannot: moving the
 * reading position along with the viewport, so keyboard and screen reader
 * users land where sighted users are looking.
 */

document.addEventListener('click', (event) => {
  if (event.defaultPrevented) return;

  const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
    'a[href^="#"]',
  );
  if (!link) return;

  const id = link.getAttribute('href')?.slice(1);
  if (!id) return;

  const target = document.getElementById(id);
  if (!target) return;

  // Let the browser do the scrolling; just take the focus with it.
  requestAnimationFrame(() => target.focus({ preventScroll: true }));
});
