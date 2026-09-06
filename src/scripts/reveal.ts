/**
 * Entrance animations and the decrypt effect.
 *
 * Both are attribute-driven: an element carries data-anim="<name>" and gets
 * data-inview when it arrives. The CSS in global.css decides what each name
 * means, so adding a motion is a stylesheet change, not a script change.
 */

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- staggering ------------------------------------------------------ */

/** Children of [data-stagger] inherit an increasing delay. */
function applyStagger() {
  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
    const gap = Number(group.dataset.stagger) || 90;
    [...group.children].forEach((child, i) => {
      if (child instanceof HTMLElement && !child.style.getPropertyValue('--anim-delay')) {
        child.style.setProperty('--anim-delay', `${i * gap}ms`);
      }
    });
  });
}

/* --- entrance -------------------------------------------------------- */

function setUpReveals() {
  const targets = document.querySelectorAll<HTMLElement>('[data-anim]');

  if (REDUCE_MOTION) {
    targets.forEach((el) => el.setAttribute('data-inview', ''));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-inview', '');
        observer.unobserve(entry.target);
      }
    },
    // threshold 0, not a fraction: an element taller than the viewport can
    // never present 12% of itself inside a root that has been shrunk from
    // the bottom, and the failure mode is that it stays hidden forever.
    // First pixel in is a good enough cue.
    { rootMargin: '0px 0px -8% 0px', threshold: 0 },
  );

  targets.forEach((el) => observer.observe(el));
}

/* --- decrypt --------------------------------------------------------- */

/**
 * Latin letters only — no digits, no punctuation. Two pools rather than one
 * so a scrambled character keeps the case of the character it stands in
 * for: swapping a lowercase letter for `Q` changes the silhouette of the
 * word, and a paragraph of that reads as a different block of text jumping
 * about rather than as this text resolving.
 */
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';

/** How long the whole string stays scrambled before it lands, in ms. */
const SCRAMBLE_MS = 340;

/**
 * How often a fresh set of glyphs is drawn. Redrawing every frame reads as
 * static rather than as characters cycling, so this is deliberately slower
 * than the frame rate.
 */
const TICK_MS = 30;

/**
 * Scrambles an element's text, then resolves the whole string at once.
 *
 * Every character cycles simultaneously for a fixed duration and the real
 * text snaps in when that duration ends — rather than resolving left to
 * right, which read as a progress bar and took longer the more there was to
 * say. Because the duration does not depend on length, a heading and the
 * paragraph under it land together.
 */
export function decrypt(el: HTMLElement) {
  const text = el.dataset.decryptText ?? el.textContent ?? '';
  el.dataset.decryptText = text;

  if (REDUCE_MOTION || text.length === 0) {
    el.textContent = text;
    return;
  }

  // Hold the box open so the cycling characters cannot reflow the layout.
  el.style.minHeight = `${el.getBoundingClientRect().height}px`;

  // Whitespace is left alone: it carries the shape of the text, so
  // scrambling it would turn a paragraph into one grey block. Anything that
  // is not a letter — punctuation, digits, an em dash — stays put for the
  // same reason.
  const chars = [...text];
  const scrambleFor = (char: string) => {
    if (char >= 'a' && char <= 'z') return LOWER[(Math.random() * 26) | 0];
    if (char >= 'A' && char <= 'Z') return UPPER[(Math.random() * 26) | 0];
    return char;
  };
  const started = performance.now();
  let lastTick = 0;

  const step = (now: number) => {
    if (now - started >= SCRAMBLE_MS) {
      el.textContent = text;
      el.style.minHeight = '';
      return;
    }

    if (now - lastTick >= TICK_MS) {
      lastTick = now;
      el.textContent = chars.map(scrambleFor).join('');
    }

    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

/** Runs every decrypt inside a container. Used when a faction becomes active. */
export function decryptWithin(container: ParentNode) {
  container.querySelectorAll<HTMLElement>('[data-decrypt]').forEach(decrypt);
}

function setUpDecrypt() {
  if (REDUCE_MOTION) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        decrypt(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -15% 0px', threshold: 0.4 },
  );

  // Faction panels start hidden and are driven by the scroller instead,
  // otherwise they would resolve while nobody is looking at them.
  document.querySelectorAll<HTMLElement>('[data-decrypt]').forEach((el) => {
    if (el.closest('[data-faction-panel]')) return;
    observer.observe(el);
  });
}

applyStagger();
setUpReveals();
setUpDecrypt();
