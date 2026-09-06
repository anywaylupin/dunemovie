/**
 * Drag-to-scroll for horizontal carousels.
 *
 * Any element with `data-drag-scroll` can be pulled sideways with a mouse.
 * Touch is left alone: the platform's own inertial scrolling is better than
 * anything reimplemented here, and hijacking it would break the flick.
 *
 * Two details make the difference between this and a demo:
 *
 *  - Scroll snapping is suspended for the duration of a drag. With
 *    `snap-mandatory` still on, the browser keeps yanking the carousel to
 *    the nearest card while the cursor is trying to place it somewhere else.
 *  - A drag that ends over a card must not also click it. The pointer is
 *    captured and a click following any real movement is swallowed in the
 *    capture phase, before it reaches the card.
 */

const CLICK_SLOP = 6;

document.querySelectorAll<HTMLElement>('[data-drag-scroll]').forEach((track) => {
  let dragging = false;
  let startX = 0;
  let startLeft = 0;
  let travelled = 0;

  const stop = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    delete track.dataset.dragging;
    // Snapping comes back on release, so letting go still settles on a card.
    track.style.scrollSnapType = '';
    try {
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  };

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || event.button !== 0) return;

    dragging = true;
    travelled = 0;
    startX = event.clientX;
    startLeft = track.scrollLeft;

    track.dataset.dragging = '';
    track.style.scrollSnapType = 'none';

    // Capture keeps the drag alive when the cursor leaves the track, but it
    // throws if the pointer is not currently active. That must not abort the
    // drag it was only meant to improve.
    try {
      track.setPointerCapture(event.pointerId);
    } catch {
      /* dragging still works, it just ends early if you leave the element */
    }
  });

  track.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    travelled = Math.max(travelled, Math.abs(dx));
    track.scrollLeft = startLeft - dx;
  });

  track.addEventListener('pointerup', stop);
  track.addEventListener('pointercancel', stop);

  // Capture phase: this has to run before the card's own handlers.
  track.addEventListener(
    'click',
    (event) => {
      if (travelled <= CLICK_SLOP) return;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  // Dragging an image or a link is the browser's default; it would fight the
  // scroll and leave a ghost image following the cursor.
  track.addEventListener('dragstart', (event) => {
    if (dragging) event.preventDefault();
  });
});
