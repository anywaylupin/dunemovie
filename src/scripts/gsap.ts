import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { decryptWithin } from './reveal';

/**
 * GSAP owns every scroll-position-dependent behaviour on the page.
 *
 * Four groups:
 *
 *   1. Activation - decides which section is "current", and therefore which
 *      rail marker lights and which chapter panel shows. Runs
 *      unconditionally, including under reduced motion: this is page state,
 *      not motion.
 *
 *   2. ScrollSmoother - real physical scroll smoothing (the page eases
 *      toward the scroll position instead of snapping to it), plus the
 *      #smooth-wrapper / #smooth-content structure it requires. Created
 *      first within its motion-gated block, per GSAP's own guidance, since
 *      everything scrubbed to scroll position should measure against the
 *      smoothed scroll, not the raw one.
 *
 *   3. The section cross-dissolve and the faction cross-fade - scrubbed
 *      tweens, unchanged in substance from before.
 *
 *   4. Pins - a generic, declarative system: any element with data-pin
 *      becomes a pin trigger, so new pinned elements are a markup change,
 *      not a script change. This is what holds the faction stage in the
 *      frame; see the block itself for why CSS sticky cannot.
 *
 * Groups 2–4 sit behind gsap.matchMedia(), which - unlike a one-time
 * boolean check - keeps watching: if the person's OS motion setting changes,
 * GSAP automatically reverts and recreates what's inside to match. No reload
 * needed.
 */

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

/** Smoothing applied to scrubbed tweens, in seconds. 0 locks exactly to the
 *  scroll position; this adds a small, deliberate catch-up lag instead. */
const SCRUB = 0.4;

/* ------------------------------------------------------------------ *
 * 1. Activation
 * ------------------------------------------------------------------ */

const chapterBlock = document.querySelector<HTMLElement>('[data-slot="chapter"]');
const chapterPanels = chapterBlock?.querySelectorAll<HTMLElement>('[data-chapter-panel]');

const rail = document.querySelector<HTMLElement>('[data-slot="rail"]');
const railItems = rail?.querySelectorAll<HTMLElement>('[data-rail-item]');
const railOwnership = new Map<string, string>(
  rail ? (JSON.parse(rail.dataset.ownership ?? '[]') as [string, string][]) : [],
);

const factionPanelEls = document.querySelectorAll<HTMLElement>('[data-faction-panel]');

let activeSection = '';

/** The single place that decides what "current" means for the rail, the
 *  chapter block, and (for the three faction steps) which panel shows. */
function activate(sectionId: string, chapterId?: string) {
  if (sectionId === activeSection) return;
  activeSection = sectionId;

  if (rail && railItems) {
    const marker = railOwnership.get(sectionId);
    rail.dataset.visible = String(Boolean(marker));

    railItems.forEach((item) => {
      const match = item.dataset.railItem === marker;
      item.toggleAttribute('data-active', match);
      if (match) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  }

  if (chapterBlock && chapterPanels) {
    const panel = chapterId
      ? chapterBlock.querySelector<HTMLElement>(`[data-chapter-panel="${chapterId}"]`)
      : null;

    chapterBlock.dataset.visible = String(Boolean(panel));

    chapterPanels.forEach((p) => {
      const match = p === panel;
      p.dataset.active = String(match);
      if (match) decryptWithin(p);
    });
  }

  // Only meaningful for the three faction steps; a no-op for everything
  // else since no element will match. This is also the accessibility path:
  // aria-hidden here is correct regardless of whether the reduced-motion
  // fade below or the plain CSS fallback ends up drawing it.
  factionPanelEls.forEach((panel) => {
    const match = panel.dataset.factionPanel === sectionId;
    panel.dataset.active = String(match);
    if (match) panel.removeAttribute('aria-hidden');
    else panel.setAttribute('aria-hidden', 'true');
  });
}

document.querySelectorAll<HTMLElement>('[data-section]').forEach((section) => {
  const id = section.dataset.section;
  if (!id) return;

  ScrollTrigger.create({
    trigger: section,
    start: 'top center',
    end: 'bottom center',
    onToggle: (self) => {
      if (self.isActive) activate(id, section.dataset.chapter);
    },
  });
});

/* ------------------------------------------------------------------ *
 * 1b. The scrollbar
 *
 * global.css hides the document's native scrollbar so that full-bleed
 * artwork gets the whole window width, which makes drawing a replacement
 * non-optional rather than decorative - and puts this outside the
 * motion-gated block below, alongside activation: someone with reduced
 * motion on still needs a scrollbar.
 *
 * Position comes from a ScrollTrigger spanning the whole page rather than
 * from a `scroll` listener, for a specific reason: with ScrollSmoother
 * running, `window.scrollY` is the *target* the page is easing toward, not
 * where it currently is. A bar reading the raw value runs ahead of the
 * content it describes. ScrollTrigger reports the smoothed position, so the
 * thumb and the artwork move together.
 * ------------------------------------------------------------------ */

const scrollbar = document.querySelector<HTMLElement>('[data-slot="scrollbar"]');
const thumb = scrollbar?.querySelector<HTMLElement>('[data-part="thumb"]');

if (scrollbar && thumb) {
  /** Travel available to the thumb: the track minus the thumb itself. */
  const travel = () => scrollbar.clientHeight - thumb.offsetHeight;

  const setThumbHeight = () => {
    const page = ScrollTrigger.maxScroll(window) + window.innerHeight;
    // min-height in CSS is the floor; this is the proportion of the page in
    // view, which is what makes it a scrollbar rather than a progress meter.
    thumb.style.height = `${(window.innerHeight / page) * scrollbar.clientHeight}px`;
  };

  const setThumbPosition = (progress: number) => {
    thumb.style.transform = `translateY(${progress * travel()}px)`;
  };

  setThumbHeight();

  const tracker = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => setThumbPosition(self.progress),
    onRefresh: (self) => {
      setThumbHeight();
      setThumbPosition(self.progress);
    },
  });

  /** The one place that knows how to move the page, smoothed or not. */
  const scrollTo = (position: number) => {
    const smoother = ScrollSmoother.get();
    const max = ScrollTrigger.maxScroll(window);
    const clamped = Math.min(max, Math.max(0, position));

    // The smoother owns the scroll position while it exists; writing to
    // window.scrollTo behind its back gets reverted on its next tick.
    if (smoother) smoother.scrollTop(clamped);
    else window.scrollTo(0, clamped);
  };

  /* --- drag ------------------------------------------------------- */

  let dragOffset = 0;

  const positionFor = (clientY: number) =>
    ((clientY - scrollbar.getBoundingClientRect().top - dragOffset) / travel()) *
    ScrollTrigger.maxScroll(window);

  const onPointerMove = (event: PointerEvent) => scrollTo(positionFor(event.clientY));

  const endDrag = (event: PointerEvent) => {
    thumb.removeAttribute('data-dragging');
    thumb.releasePointerCapture(event.pointerId);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
  };

  thumb.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    // Grab the thumb where it was actually grabbed, so it does not jump to
    // centre itself under the cursor on the first move.
    dragOffset = event.clientY - thumb.getBoundingClientRect().top;
    thumb.setAttribute('data-dragging', '');
    thumb.setPointerCapture(event.pointerId);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  });

  /* --- click the track -------------------------------------------- */

  scrollbar.addEventListener('pointerdown', (event) => {
    if (event.target === thumb || thumb.contains(event.target as Node)) return;
    // Centre the thumb on the click, the way a track click behaves once the
    // page is long enough that paging would take all day.
    dragOffset = thumb.offsetHeight / 2;
    scrollTo(positionFor(event.clientY));
  });

  window.addEventListener('resize', () => {
    setThumbHeight();
    setThumbPosition(tracker.progress);
  });
}

/* ------------------------------------------------------------------ *
 * 2–4. Smoother, scrubbed tweens, pins - all motion-gated
 * ------------------------------------------------------------------ */

gsap.matchMedia().add(
  { motionOk: '(prefers-reduced-motion: no-preference)' },
  (context) => {
    const { motionOk } = context.conditions as { motionOk: boolean };
    if (!motionOk) return;

    // Create the smoother first - everything scrubbed below should measure
    // against the smoothed scroll position, not the raw one.
    ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.3,
      // Address-bar show/hide on mobile browsers otherwise reintroduces
      // exactly the kind of scroll-position jank this plugin exists to fix.
      normalizeScroll: true,
      ignoreMobileResize: true,
      // Default is false: on a touch screen, scroll lag that disconnects
      // from the finger's drag position feels wrong. Direct manipulation
      // stays direct; only wheel/trackpad gets the eased catch-up.
    });

    // Section cross-dissolve. Each section gets two independent tweens on
    // its own [data-scene] wrapper: one for entering (bottom of viewport to
    // settled), one for leaving (settled to top of viewport). For adjacent
    // equal-height sections these two ranges are the same physical scroll
    // distance as the next section's own entry, which is what produces the
    // overlap - the outgoing content is still fading as the incoming
    // content is already most of the way in.
    gsap.utils.toArray<HTMLElement>('[data-scene]').forEach((scene) => {
      const section = scene.closest<HTMLElement>('[data-section]');
      if (!section) return;

      gsap
        .timeline({
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'top 25%', scrub: SCRUB },
        })
        .fromTo(scene, { yPercent: 45, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none' });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: 'bottom 75%',
            end: 'bottom top',
            scrub: SCRUB,
          },
        })
        .fromTo(
          scene,
          { yPercent: 0, opacity: 1 },
          // See the faction cross-fade below for why this is not optional.
          { yPercent: -35, opacity: 0, ease: 'none', immediateRender: false },
        );
    });

    // The starfield drifts against the page - a long, slow move across the
    // whole document, so the band of space at each seam is never a static
    // image. This is the only thing behind the scenes that moves; the
    // scenes themselves keep their own frames.
    const starfield = document.querySelector<HTMLElement>('[data-starfield-plate]');
    if (starfield) {
      gsap.fromTo(
        starfield,
        { yPercent: -9 },
        {
          yPercent: 9,
          ease: 'none',
          scrollTrigger: { start: 0, end: 'max', scrub: 1.2 },
        },
      );
    }

    // The faction panels are NOT scrubbed. Their opacity is a plain CSS
    // transition on data-active (see Factions.astro), flipped by activate()
    // above, so one scroll gesture takes you to the next house and the panel
    // cross-fades on its own clock - rather than the house being a function
    // of exactly how far you have scrolled, which made three discrete
    // scenes feel like one long dissolve you were dragging through.
    //
    // The snap below is what makes the gesture land; ScrollTrigger's snap is
    // directional by default, so a nudge in either direction commits to the
    // next step instead of falling back to the current one.

    // Backdrop parallax. Declarative in the same way as the pins:
    // data-parallax="<n>" on a backdrop layer drifts it n% of its own
    // height against the scroll across the full time its section is on
    // screen, centred so the layer sits at its natural position when the
    // section is centred.
    //
    // ui/Backdrop.astro gives any parallaxed layer a 14–16% vertical
    // overhang precisely so this drift has somewhere to travel: the move is
    // ±n/2, so n must stay under about 24 or it will expose the section
    // edge. A negative n travels the other way, which is how the orbital
    // lines pull against the photograph behind them.
    gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((layer) => {
      const distance = Number(layer.dataset.parallax);
      if (!Number.isFinite(distance) || distance === 0) return;

      // The section is the trigger, not the layer: the layer is taller
      // than its section, so measuring against it would start the drift
      // early and end it late.
      const section = layer.closest<HTMLElement>('[data-section]');
      if (!section) return;

      gsap.fromTo(
        layer,
        { yPercent: -distance / 2 },
        {
          yPercent: distance / 2,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: SCRUB,
          },
        },
      );
    });

    // Orbits. `data-orbit="<n>"` drifts an element n% of its own height
    // against the scroll *and* grows it as it crosses, which is the pair of
    // cues that make a small round thing read as a body at a distance
    // rather than a dot on a page. The worlds in the Arrakis section carry
    // different values so they separate from each other as well as from the
    // page - a shared rate would just look like the whole group sliding.
    //
    // Deliberately its own attribute rather than more data-parallax: this
    // touches scale, and the parallax layers must not, since they are
    // full-bleed plates whose scale would expose a section edge.
    //
    // Never put this on the same element as data-anim. That CSS transitions
    // `transform`, so it would smear every scrubbed frame GSAP writes;
    // the markup wraps instead.
    gsap.utils.toArray<HTMLElement>('[data-orbit]').forEach((orb) => {
      const section = orb.closest<HTMLElement>('[data-section]');
      if (!section) return;

      const drift = Number(orb.dataset.orbit);
      if (!Number.isFinite(drift) || drift === 0) return;

      // Zoom is separate from drift and optional, because the two things
      // this is applied to have opposite constraints: the small world
      // markers have room to swell and want to, while the Arrakis globe
      // nearly fills its grid column and would push into its neighbours.
      const zoom = (Number(orb.dataset.orbitZoom) || 10) / 100;

      gsap.fromTo(
        orb,
        { yPercent: drift, scale: 1 - zoom },
        {
          yPercent: -drift,
          scale: 1 + zoom,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: SCRUB,
          },
        },
      );
    });

    // Pins. Generic and declarative: data-pin marks the trigger element
    // (the one whose start/end range defines the pin's duration);
    // data-pin-target, if present on a descendant, is what actually gets
    // pinned - otherwise the trigger pins itself. New pinned elements are a
    // markup change in the relevant .astro file, not a script change here.
    //
    // This is what holds the faction stage in the frame. CSS `position:
    // sticky` cannot do it once ScrollSmoother exists: the smoother makes
    // #smooth-wrapper `position: fixed; overflow: hidden`, which becomes the
    // sticky element's scrollport - a container that never scrolls, and so
    // never triggers the stick. A pin measures against the scroll position
    // itself and is unaffected.
    //
    // Not gated on viewport width: a pinned stage that only pins on desktop
    // is a section that behaves like a different section on a phone.
    document.querySelectorAll<HTMLElement>('[data-pin]').forEach((trigger) => {
      const target = trigger.querySelector<HTMLElement>('[data-pin-target]') ?? trigger;

      // data-pin-snap="<n>" divides the pin into n resting points and
      // settles on the nearest one, so a pinned run of steps cannot be left
      // parked between two of them. For the factions that is the difference
      // between arriving at a house and stopping on a half-dissolve of two.
      //
      // n stops means n - 1 gaps: with three factions the resting points are
      // 0, 0.5 and 1, which are exactly the scroll positions where each
      // panel is at full opacity (its enter tween has finished and its leave
      // tween has not started).
      const stops = Number(trigger.dataset.pinSnap);
      const snap =
        Number.isFinite(stops) && stops > 1
          ? {
              snapTo: 1 / (stops - 1),
              // Brisk. This is a step between two scenes, not a settle.
              duration: { min: 0.2, max: 0.4 },
              // Short enough to feel immediate, long enough not to fight a
              // wheel that is still spinning.
              delay: 0.04,
              ease: 'power2.out',
              // The default, spelled out because it is the whole behaviour:
              // snap the way the scroll was heading, so a nudge advances a
              // house instead of falling back to the one you were on.
              directional: true,
            }
          : undefined;

      ScrollTrigger.create({
        trigger,
        pin: target,
        snap,
        start: trigger.dataset.pinStart || 'top top',
        end: trigger.dataset.pinEnd || 'bottom bottom',
        // The trigger already provides real extra height via CSS (the
        // faction section is `height: 300svh`); GSAP's default spacer is
        // sized for the common case where pin === trigger and would
        // double-count that height here, leaving unwanted blank space. If a
        // future pin uses pin === trigger instead, this default is the
        // first thing to flip back to true.
        pinSpacing: trigger.dataset.pinSpacing === 'true',
      });
    });
  },
);

/* ------------------------------------------------------------------ *
 * Housekeeping
 * ------------------------------------------------------------------ */

// Reconcile every trigger against the current scroll position right away -
// covers the case where a trigger's initial condition is already true at
// creation (Hero, on a page load at scrollY 0).
ScrollTrigger.refresh();

// Web fonts and the two client:visible islands can both shift layout after
// first paint; positions depend on layout, so re-measure once things settle.
document.fonts?.ready?.then(() => ScrollTrigger.refresh());
window.addEventListener('load', () => ScrollTrigger.refresh());
