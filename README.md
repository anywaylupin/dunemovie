# Dune - scroll-driven editorial page

Astro 7 + Tailwind 4 + GSAP (ScrollTrigger, ScrollSmoother), three Preact
islands. All artwork is placeholder; all copy lives in a content collection.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
npm run check    # astro + TypeScript diagnostics
```

## Scrolling, smoothing, and the cross-dissolve

**Physical scroll smoothing is GSAP ScrollSmoother**, not CSS. It requires a
specific two-div structure - an outer `#smooth-wrapper` and a single
`#smooth-content` child holding everything scrollable - which lives in
`Layout.astro`. Fixed-position chrome (`TopBar`, `SideRail`, the Chapter
block, the menu dialog) stays **outside** that structure on purpose: a fixed
element that ends up inside gets transformed along with the scrolled content
instead of staying put, which is a well-documented way this plugin's wrapper
pattern goes wrong if you get the nesting backwards.

`smooth: 1.3` sets the catch-up lag; `smoothTouch` is left at its default
(`false`), so touch scrolling stays direct-manipulation and only wheel/track‑
pad input gets the eased feel - a disconnect between a finger's drag position
and what's on screen reads as broken, not smooth. `normalizeScroll: true`
avoids the scroll-jank mobile browsers introduce when the address bar
shows/hides mid-scroll.

`scripts/scroll.ts` still does the one thing neither CSS nor ScrollSmoother
handles: moving focus to an anchor's target after a click, so keyboard and
screen reader users land where sighted users are looking.

**The cross-dissolve is GSAP ScrollTrigger**, unchanged in substance from
before. Each section's content wrapper (`[data-scene]`) gets two scrubbed
tweens keyed to the section itself as the trigger:

- enter: `top bottom` → `top 25%`, fading and rising in from 45% low
- leave: `bottom 75%` → `bottom top`, fading and rising out to −35%

For adjacent same-height sections these two ranges cover the same physical
scroll distance - section N's leave and section N+1's enter are, geometrically,
the same stretch of scrollbar - which is what produces the overlap: the
outgoing content is still fading as the incoming content is already most of
the way in. `scrub: 0.4` adds a small, deliberate catch-up lag rather than
locking exactly to the scroll position.

Everything in this paragraph and the pins below live inside one
`gsap.matchMedia()` call with two named conditions - `motionOk`
(`prefers-reduced-motion: no-preference`) and `desktop` (`min-width: 64rem`,
Tailwind's `lg`). ScrollSmoother is created first inside it, before anything
that should measure against the smoothed scroll position rather than the raw
one. Unlike a one-time boolean check, `matchMedia()` keeps watching - if the
OS motion setting changes, or the viewport crosses the desktop breakpoint,
GSAP automatically reverts and recreates what's inside to match, no reload
needed.

## Section seams

Every scene is a different photograph. Two photographs that each run to their
own edge meet as a hard horizontal line. Two things remove it, and it is
worth being clear about how little they do:

1. **A narrow feathered band.** `[data-feather]` in `global.css` masks each
   backdrop out over the top and bottom **8%** of its section, so neighbours
   resolve into the same darkness rather than touching. The hero uses
   `feather="bottom"` - nothing sits above it, and its own starfield band
   lives up there.
2. **A starfield behind everything.** `art/Starfield.astro`, one fixed plate
   mounted outside `#smooth-wrapper` with the rest of the chrome, drifting
   slowly across the whole document. It is only visible through that band,
   which is the point: the join reads as distance rather than as an edge.

**What this deliberately does not do is fade the artwork.** An earlier version
cross-dissolved the backdrops - each one fading to nothing and receding in Z
across the overlap. It was wrong twice over. It read as the space swallowing
the scenes instead of sitting between them, so no section owned its own frame
any more; and fading the incoming backdrop to zero removed the occlusion that
had been hiding the outgoing section's spilled content, so **text from two
sections was legible on top of itself.** That occlusion is load-bearing: the
scene tween translates content by ±45%, which pushes it past the section box
on purpose, and the next section's opaque backdrop is what stops you seeing
it. The band is the transition; the section is not.

Ordering is explicit: the starfield is `z-index: 0` and `#smooth-wrapper` is
`relative z-10`. A negative z-index on the starfield would have put it behind
the body background where it could never be seen, and `relative` is needed so
the stacking still holds under reduced motion, when ScrollSmoother never sets
its own `position: fixed` on the wrapper.

**The seams survive reduced motion.** Only the starfield drift is
motion-gated; the feathering is plain CSS and the field itself is a static
element.

## Pins

Any element can pin via markup alone - no script edit needed for a new one:

```html
<div data-pin data-pin-end="bottom bottom">
  <div data-pin-target>…the thing that actually stays put…</div>
</div>
```

`data-pin` marks the **trigger** - the element whose scroll range defines how
long the pin lasts. `data-pin-target`, if present on a descendant, is what
actually gets pinned; without it, the trigger pins itself. `data-pin-start` /
`data-pin-end` default to `'top top'` / `'bottom bottom'`.

**The faction stage is the current example.** `Factions.astro` reserves its
own scroll room in CSS (`height: 300svh`, one viewport per faction); the stage
inside it, marked `data-pin-target`, is held in the frame while all three
viewports scroll past. Pins are not gated on viewport width - a stage that
only pins on desktop is a section that behaves like a different section on a
phone.

`data-pin-snap="<n>"` divides the pin into `n` resting points and settles on
the nearest, so a pinned run of steps cannot be left parked between two of
them. `n` stops means `n - 1` gaps: with three factions the resting points
are 0, 0.5 and 1, which are exactly the scroll positions where one panel is
at full opacity - its enter tween finished, its leave tween not yet started.
Without it the section could be left showing a half-dissolve of two houses,
which is not a state either of them looks right in.

`pinSpacing` defaults to `false` here, not GSAP's own default of `true`. The
reasoning: GSAP's spacer exists to backfill the space a pinned element
*would* have occupied in normal flow, sized to that element's own height -
the common case where the pinned element and the trigger are the same node.
Here the trigger already reserves its own 300svh independently via CSS, so
the default spacer would double-count it, leaving unwanted blank space below
the pin. If a future pin uses the same element as both trigger and target,
flip `data-pin-spacing="true"` on it.

**Verified by direct execution, not just by reading the code.** GSAP's pin
mechanism converts the target to fixed positioning and applies a
`translate(0px, 0.001px)` micro-offset - a specific, recognizable technique
GSAP uses to force the browser onto a GPU-accelerated compositing layer.
Running the actual built bundle end-to-end (see **Known rough edges** for how)
showed exactly that signature on the pin target and nothing on the trigger -
concrete evidence the pin fires on the correct element, not a guess from
reading the source.


## The chapter rail

Seven markers, not seventeen. The rail is a chapter index, so it only carries
the chaptered destinations:

| # | Marker | Covers |
| --- | --- | --- |
| 01 | Home | hero |
| 02 | Description | about |
| 03 | Fractions | atreides, harkonnen, fremen |
| 04 | World | caladan |
| 05 | Dune Architecture | architecture |
| 06 | Space Orchestra | soundtrack |
| 07 | Frank Herbert | author |

Section order is untouched - the other ten sections are still there, they
simply have no marker. **On those, the rail hides itself**, using `visibility`
rather than opacity alone so its links leave the focus order with it rather
than becoming invisible tab stops.

The list lives in `nav.rail` in the copy file, where each entry names the
sections it owns. `scripts/gsap.ts` builds a section-to-marker map from it on
load, which is how three factions light one marker. The menu still lists all
seventeen.

The active marker is ringed by a scanner: two arcs turning at different speeds
in opposite directions, the outer in white, the inner in lime. Transform and
stroke only, so it composites without touching layout, and it stops entirely
under `prefers-reduced-motion`.

Each link carries its chapter name as real text, visually hidden - seven links
all called "04" would be useless to a crawler and to anyone listing the page's
links.

## The scrollbar

The document's native scrollbar is hidden (`global.css`) and replaced by
`hud/ScrollBar.astro`, driven from `scripts/gsap.ts`. The reason is the
gutter, not the styling: a classic scrollbar reserves roughly 15px of layout
width, so every full-bleed backdrop on this page stopped 15px short of the
window and artwork meant to run to the edge did not. The replacement is
`position: fixed` and overlays, so the content is the full window width -
measurably: `document.documentElement.clientWidth` now equals `innerWidth`.

It is a real scrollbar, not a progress meter. The thumb is sized to the
proportion of the page in view, can be dragged, and clicking the track jumps
to that position. It is `aria-hidden` and out of the tab order, exactly as the
native one is - keyboard scrolling never went through the scrollbar anyway.

Two details that are easy to get wrong:

- **Position comes from a page-spanning `ScrollTrigger`, not a `scroll`
  listener.** With ScrollSmoother running, `window.scrollY` is the *target*
  the page is easing toward, not where it currently is; a thumb reading the
  raw value visibly runs ahead of the content it describes. ScrollTrigger
  reports the smoothed position.
- **Dragging writes through `ScrollSmoother.get().scrollTop()`**, not
  `window.scrollTo`. While the smoother exists it owns the scroll position,
  and a write behind its back is reverted on its next tick.

It lives outside the motion-gated block, alongside activation rather than
alongside the animations: the native scrollbar is hidden unconditionally, so
someone with reduced motion on still needs this one.

## Link text

Generic anchor text is weak for search and worse for anyone reading links out
of context, so repeated calls to action name their destination in visually
hidden text: "Learn more - The Great Houses", "Buy ticket - Sandstorm Trip",
"Read ebook - Dune Messiah". `ActionButton` takes a `context` prop for this.
Social links carry their network name rather than an `aria-label` on a single
letter.

## Interaction

Hover and press states live in `global.css`, keyed on the `data-slot` and
`data-part` attributes the components already carry, rather than scattered
through class lists. Everything animates transform and opacity only, so
nothing triggers layout.

The menu button carries most of it: the offset outline slides under the frame
on hover, the bars fan out and the word tracks wider, the frame presses in on
`:active`, and the bars cross into an X while the dialog is open - driven by
`aria-expanded`, so the state is read from the accessibility tree rather than
a duplicate class. Menu entries stagger in behind the backdrop. Buttons nudge
right on hover, rail items nudge left.

All of it sits inside `prefers-reduced-motion: no-preference`.

## The faction cross-fade

Atreides, Harkonnen and Fremen share one section (`Factions.astro`): a stage
held in the frame, with three `100svh` step divs behind it standing in for
scroll distance.

**The panels are not scrubbed.** Their opacity is a plain CSS transition on
`data-active`, flipped by `activate()` in `scripts/gsap.ts`, so one scroll
gesture takes you to the next house and the panel cross-fades on its own
clock. They used to be scrubbed enter/leave tweens like the main dissolve,
and the result was that the current house was a function of exactly how far
you had scrolled: three discrete scenes felt like one long dissolve you were
dragging yourself through, and it was possible to sit indefinitely on a
half-mix of two of them.

What makes the gesture land is the snap on the pin (`data-pin-snap="3"`).
ScrollTrigger's snap is **directional** by default, which is the whole
behaviour here - a nudge in either direction commits to the next step rather
than falling back to the one you were on. It is set brisk on purpose
(`delay: 0.04`, `duration: 0.2–0.4`): this is a step between two scenes, not
a settle.

**The stage is held by GSAP's pin, not by CSS `position: sticky`,** and this
is not a preference. Sticky *cannot* work here. ScrollSmoother makes
`#smooth-wrapper` `position: fixed; overflow: hidden` and moves
`#smooth-content` by transform, which makes that wrapper the stage's nearest
scrollport - a container that never scrolls. A sticky element sticks against
its scrollport, so with nothing scrolling there it never sticks, and the stage
simply travelled up the page with everything else. A pin measures the scroll
position itself and is unaffected. The `sticky top-0` class is still on the
element as the fallback for the one case where the premise does not hold:
under reduced motion no smoother is created and no pin is created either, and
native sticky does the job on its own.

**A subtlety worth knowing if you ever put these back on a scrub.** When the
panels *were* scrubbed, each had two `fromTo()`s - one to fade in, one to
fade out - and the second needed `immediateRender: false`. A `fromTo()`
renders its *from* values the moment it is created, so without that flag the
leaving tween (created second) overwrote the entering one and stamped
`opacity: 1` on every panel whose leave range the scroll had not reached yet.
With all three stacked in one frame, that painted the last one in the DOM
over the other two: Fremen's artwork under Atreides' chapter text, at every
scroll position. The same pattern is live in the main section dissolve, where
it is invisible only because those sections are off-screen when it happens -
the flag is set there, and removing it will cost you an afternoon.

## The carousel

The Great Houses row (`GreatHouses.astro`) scrolls horizontally, and three
things make it behave like something you can actually grab:

- **`py-8` on the scroller, which is not decoration.** A box that scrolls on
  one axis cannot leave the other axis `visible` - the browser promotes it to
  a scrollport - so the cards' `hover:-translate-y-2` was being clipped off
  the top. The padding gives the lift somewhere to happen *inside* the
  scroller.
- **Mouse dragging** (`scripts/drag-scroll.ts`, `data-drag-scroll`). Touch is
  left alone: the platform's inertial scrolling is better than anything
  reimplemented here. Two details separate this from a demo - scroll snapping
  is suspended for the duration of the drag (with `snap-mandatory` still on,
  the browser keeps yanking the row to the nearest card while the cursor is
  trying to put it somewhere else), and a drag that ends over a card must not
  also *click* it, so a click following more than 6px of travel is swallowed
  in the capture phase before it reaches the card.
- **A scrollbar dressed like the rest of the page** rather than left as
  browser furniture: a 3px hairline that turns accent-red on hover, in
  `global.css` under `[data-slot='carousel']`. This is the one inner
  scrollbar the page keeps - the document's own is hidden and replaced (see
  **The scrollbar**) - because here it is the affordance that says the row
  moves.

## The Chapter block

Nine scenes render their copy through one pinned block (`hud/Chapter.astro`)
rather than each holding its own text:

`hero · about · houses · atreides · harkonnen · fremen · caladan · soundtrack · author`

Where two neighbouring scenes both have a chapter the block **never moves** -
only its text is rewritten, via decrypt, so it reads as a single element being
retyped rather than two blocks swapping. Where a neighbour has no chapter, the
block fades out. The slash indicators show position: past dim, current red,
upcoming white (and are `aria-hidden`, since the heading beside them already
says the same thing in words).

**GSAP decides when this happens, one function decides what it means.**
Every `[data-section]` - the fourteen ordinary sections and the three faction
steps alike - gets a `ScrollTrigger.create()` with no tween attached, just an
`onToggle` callback: a lightweight position watcher, functionally the same
"crossed the vertical centre" test three separate `IntersectionObserver`s used
to run independently. All three now resolve through `activate()` in
`scripts/gsap.ts`, which in one place updates the rail marker, the chapter
panel, and (for the three faction steps only) the panel's `data-active` and
`aria-hidden`. This runs **unconditionally**, including under reduced motion -
it's page state, not motion, so rail highlighting and chapter text stay
correct even when the visual tweens above are switched off.

**Placement varies by scene**, set per entry in `Page.astro`:

| Placement | Used by | Behaviour |
| --- | --- | --- |
| `bottom` | hero | sits low on the screen |
| `stretch` | the default | a full-height left column, content centred |
| `flow` | soundtrack | the slide paints its own chapter inline, and the pinned block stands down so it never covers the playlist |

Because the block occupies the left column, every section that uses it places
its own content in column two (`lg:col-start-2`) - the poster, the emblem, the
video card, the album art, the house cards.

The three factions are steps inside one pinned section, so they carry
`data-chapter` on their scroll triggers. The block does not care which is a
section and which is a step.

**On accessibility:** the pinned block is presentational - `aria-hidden`,
`pointer-events-none`, no focusable children. The real copy lives in each
section as `ChapterCopy.astro`: visually hidden, but in correct reading order,
exposed to assistive tech, available to crawlers, and visible if JavaScript
never arrives. Its call to action is a genuine link that reveals itself on
focus, so keyboard users can still reach it.

## No custom classes

Styling hooks are attributes, in the shadcn manner:

```html
<a data-slot="action-button" data-shape="slab" class="…">
<div data-texture="hatch">
<span data-watermark="Dune">          <!-- ::after content, not a text node -->
<section data-slot="section" data-section="hero" data-chapter="hero">
```

`data-shape` (`slab`, `slab-left`, `card`, `notch`), `data-texture="hatch"`,
`data-art` (`fade-left`, `fade-right`, `star-band` - the gradient masks that
stop a half-frame plate ending in a hard vertical edge), `data-feather`
(`both`, `bottom` - the horizontal equivalent, see **Section seams**),
`data-sphere` and `data-sphere-glow`, `data-anim`, `data-decrypt`, `data-stagger` and
`data-slot` are all defined in `global.css` as attribute selectors.

Behaviour is addressed the same way, so a second instance of anything works
with no script change: the transport reads `data-audio-toggle`, `-seek`,
`-time`, `-title`, `-progress`, `-step` and `-mute`; scroll-linked motion
reads `data-parallax` and `data-orbit` (plus `-zoom`); and `data-drag-scroll`
turns any horizontal scroller into one you can pull with a mouse.

There are no `@utility` blocks and no custom class names - everything else is
stock Tailwind.

## Audio

One player, two surfaces. `scripts/audio.ts` owns the `<audio>` element and
the state; the transport in the hero and the playlist in the soundtrack
section are both views onto it, so pressing play in one and picking a track
in the other drive the same thing and show the same time.

```
src/assets/audio/*           drop files here; nothing else to register
src/config/audio.ts          matches filename → track id
src/scripts/audio.ts         the element, the state, the transport API
src/scripts/audio-controls.ts binds the static markup in the hero
islands/SoundtrackPlayer.tsx the playlist view
```

**Sources are discovered, not declared.** Every file in `src/assets/audio` is
matched to a track by filename: drop `house-atreides.mp3` in and the track
whose id is `house-atreides` plays it. No registration step and no path to
keep in sync with the copy. `src/assets` rather than `public`, so Vite
fingerprints the file like every other asset.

**The repository ships with no audio, and `src/assets/audio/*` is
gitignored** (with `!.gitkeep`, so the folder survives a clone) - the score
is licensed music and none of it belongs in this project. Every track then
reports `src: null` and the transport disables itself: the play button is
`disabled` with an `aria-label` of "No audio file for this track", the
playlist rows are greyed and unclickable, and **no `<audio>` element is ever
constructed** - no request, no error event, nothing to go wrong. That is the
honest empty state, not a broken one; add a file and the same UI comes alive
with no code change.

Verified in all three shapes: with a file present, with the folder empty, and
with the folder deleted outright (the glob simply matches nothing and the
build is clean).

A **partly**-filled folder is the interesting case, and the one the project
is most likely to be in. Next/previous skip to the next track that actually
has a file - wrapping, and falling back to a plain step when nothing at all
is playable - so a single file does not strand the transport on a silent
track it cannot play. `ended` auto-advances through the same path.

Three implementation notes that are load-bearing:

- **The hero transport is not an island.** It is a play button and a
  scrubber; hydrating a component framework to run six listeners would cost
  more than the feature. It is static Astro output bound by attribute, the
  same way every other behaviour on this page works.
- **The player instance is cached on `globalThis`.** Astro compiles the
  layout's `<script>` and each island as separate entry points. They normally
  share a chunk for a module both import, but that is a bundler outcome, not
  a guarantee, and two copies of this module would mean two `<audio>`
  elements playing over each other.
- **The playlist island renders the idle state on its first client render,
  deliberately.** Preact's `hydrate()` adopts the server's DOM without
  applying props - it trusts the markup already matches. So if the first
  render described the live store (a different current track, rows no longer
  disabled), that description would be recorded as the vnode while the DOM
  still said otherwise, every later render would match that vnode, and the
  markup would stay frozen at the server's version for the life of the page.
  This is not hypothetical: with one audio file present the playlist kept
  every row disabled and left `aria-current` on track 1 while the store was
  on track 3. Rendering the idle state until `mounted` flips makes the first
  render agree with the DOM by construction, so the switch to real state is a
  genuine diff that Preact applies. The static hero transport is immune -
  it sets every attribute explicitly on each paint, with no vnode in between.

The scrubber is a real slider - `role="slider"`, live `aria-valuetext`, and
arrow / Page / Home / End keys - not a bar that only answers to a mouse.

## Islands

Roughly 95% of the page is static HTML. Three components hydrate:

| Island | Directive | Why |
| --- | --- | --- |
| `MenuIsland` | `client:idle` | needs a focus trap the moment it opens |
| `HeroGallery` | `client:visible` | tablist state, below the fold |
| `SoundtrackPlayer` | `client:visible` | playlist view onto the shared player, below the fold |

The hero's transport is deliberately **not** a fourth island - see **Audio**
above for why.

`MenuIsland` is built on native `<dialog>` + `showModal()`, which supplies the
focus trap, the inert background, Escape-to-close and focus restoration from
the platform rather than from hand-written code that drifts out of
correctness.

## Accessibility

- one `h1`, no heading level skips, every section is a labelled landmark
- `contentinfo` sits outside `main`; the two navs have distinct names
  (`Chapters`, `Section progress`)
- every control has an accessible name; every decorative `svg` is
  `aria-hidden`; the tablist implements roving tabindex with arrow/Home/End
- no text below 60% white on the near-black ground - comfortably past 4.5:1.
  Oversized background lettering is `::after` generated content, so it is
  decoration rather than unreadable text
- interactive targets are at least 44px
- `prefers-reduced-motion` stops ScrollSmoother and GSAP's scrubbed tweens and
  pins from ever being created (via `gsap.matchMedia()`), scrambles resolve
  instantly rather than cycling, and reveals render in place. The page still scrolls - just
  natively, without the smoothing layer. Rail highlighting and chapter text
  stay live regardless - that part is page state, not motion, and runs
  unconditionally

## Performance

Measured on this build (`gzip -c file | wc -c`), not estimated:

| | Raw | Gzipped |
| --- | --- | --- |
| GSAP core + ScrollTrigger + ScrollSmoother + this site's own driver code | 130 KB | 50 KB |
| Preact runtime + signals + 3 islands | 33 KB | 13 KB |
| CSS | 74 KB | 12 KB |
| **Total JS** | **163 KB** | **62 KB** |

**ScrollSmoother added roughly 13 KB raw / 4.4 KB gzipped** on top of the
ScrollTrigger-only baseline from before - a real, worthwhile-but-not-free cost
for actual physical scroll smoothing rather than the CSS `scroll-behavior:
smooth` this project shipped with previously (which eases anchor clicks but
does nothing for wheel/trackpad scrolling - that gap is what ScrollSmoother
specifically closes). If bundle size ever becomes the binding constraint,
`motion`'s vanilla `scroll()` API or Lenis (much smaller, no wrapper-div
requirement) both reproduce a comparable smoothing feel for less; ScrollSmoother
was the right call here because the brief was a GSAP portfolio piece and
because it shares one dependency and one mental model with the ScrollTrigger
code already driving everything else on the page.

Everything else already in place:

- fonts self-hosted via `@fontsource`, latin subsets, four weights, no
  third-party request and no render-blocking round trip
- the two local faces (Dune Rise, Agency FB) are hashed by Vite out of
  `src/assets/fonts`, so they are fingerprinted like any other asset
- the comics cover wall uses `content-visibility: auto` with an intrinsic size,
  so two dozen decorative tiles are skipped until they approach the viewport
- no `<audio>` element exists until someone asks to hear something, and the
  waveform advances by writing one custom property rather than re-colouring
  ninety elements four times a second
- `inlineStylesheets: 'auto'`, Lightning CSS minification, viewport prefetch
- every image goes through `astro:assets`, so the 21 source plates (17 MB of
  PNG and JPEG) ship as WebP at a few hundred KB each at most, in four widths
  with a `srcset`. Only the hero plate and the starfield band load eagerly;
  everything else is lazy
- all JS is deferred (module scripts + `client:idle`/`client:visible`
  islands); nothing blocks first paint

## Content and i18n

```
src/content/copy/en.json     every string on the page
src/content.config.ts        the Zod schema every locale must satisfy
src/i18n/copy.ts             getCopy(locale), falling back to the default
src/config/visuals.ts        colours and placement, keyed by content id
src/config/art.ts            artwork imports, keyed by the same ids
src/config/audio.ts          audio files, discovered by filename
src/config/sigils.ts         house sigil path data
```

The `player` block in the copy is worth calling out: most of it only ever
surfaces as an `aria-label`, which is exactly why it belongs in the content
file rather than hard-coded in the component. A locale that translates the
page but leaves the play button announcing itself in English is not
translated.

Sections never hard-code text; they receive a slice as a prop. Adding a
language: copy `en.json` to `fr.json` and translate the values, add `'fr'` to
`locales` in `astro.config.mjs` and `src/i18n/copy.ts`, then add
`src/pages/[locale]/index.astro` rendering the same `<Page />`. A missing key
fails the build with its path.

Visual tokens stay out of translation files - a translator never has to copy a
Tailwind class.

## Artwork

The plates live in `src/assets/images/` - processed, not `public/` - which is
what buys the WebP conversion, the `srcset` and the content hash. `sharp` is a
devDependency because Astro 7 no longer bundles it; without it the build fails
at the image-generation step rather than silently shipping originals.

Nothing imports an image directly. `src/config/art.ts` holds every `import`
and exposes three tables keyed by the same content ids used in
`src/content/copy/*.json`:

```ts
backdropArt   // full-bleed section backgrounds  → ui/Backdrop.astro
factionArt    // the layered faction panels      → art/FactionArt.astro
plateArt      // framed single images            → ui/Placeholder.astro
```

**An id with no entry falls back to the treatment that was there before** - a
gradient wash for a backdrop, a labelled dashed box for a plate. So binding
new artwork is one line in `art.ts`, and a scene still waiting for its plate
looks deliberate instead of broken. That is the honest signal for the slots
that have no artwork yet: the Arrakis globe, the Author and Caladan video
frames, the Tours posters, the Books covers and the Media stills.

`ui/Backdrop.astro` stacks four layers - the photograph, the orbital-line
overlay (`*-circles.png`, the one motif carried across every scene), the
colour wash, and a readability scrim over whichever side the chapter copy is
read against. `strength` on a `BackdropArt` entry is how strongly the
photograph reads through the wash, so a starfield can sit far back while the
hero plate sits at full strength.

### Planets

`art/Sphere.astro` plus `[data-sphere]` in `global.css`. A flat disc with a
centred radial gradient reads as paper however it is animated; what makes a
sphere is where the light is. Three layers do it: a specular highlight offset
toward the light source, a terminator opposite it, and limb darkening where
the surface curves away at the edge - all percentage-based gradients, so one
rule serves the 24px world markers and the 36rem Arrakis globe without a size
variant. The atmosphere is a separate element because the sphere clips its
own contents and the air has to bloom past the edge.

Two consequences worth knowing. `worldTint` in `visuals.ts` carries three
stops rather than two, lit face first, because the gradient is anchored
off-centre. And the world markers enter on `scale`, not `orbit`: orbit spins
them in the plane of the screen, which is precisely what made them read as
paper discs.

### Orbits

`data-orbit="<n>"` drifts an element `n`% of its own height against the
scroll **and** scales it as it crosses - `data-orbit-zoom="<pct>"` sets the
swell, defaulting to 10%. Drift and zoom together are what make a small round
thing read as a body at a distance rather than a dot on a page.

The Arrakis worlds carry 24 / 40 / 56 at 16% zoom, deliberately different, so
they separate from *each other* and not merely from the page - measured
across one section pass, 34px, 56px and 78px of travel respectively. The
globe gets 8 at 5%: it nearly fills its grid column, so a world's worth of
swell would push it into its neighbours.

Two rules, both learned the hard way:

- **Never put `data-orbit` on the same element as `data-anim`.** The reveal
  CSS transitions `transform`, so it would smear every scrubbed frame GSAP
  writes. The Arrakis markup nests three elements for exactly this reason:
  the `<li>` owns the entrance reveal, a span inside owns the orbit, and the
  sphere inside that keeps its own CSS hover scale.
- **Move the whole marker, not the planet inside its ring.** A planet
  drifting out of its own reticle reads as broken rather than as depth.

It is a separate attribute from `data-parallax` because it touches `scale`,
and the parallax layers must not - those are full-bleed plates whose scale
would expose a section edge.

### Backdrop parallax

`parallax={n}` on a `Backdrop` drifts the plate `n`% of its own height against
the scroll (the move is ±n/2), scrubbed by the same `gsap.matchMedia()` block
as everything else, so it disappears under reduced motion along with the rest.
The component gives any parallaxed layer a 14–16% vertical overhang for the
drift to travel through - **keep `n` under about 24 or the move will expose
the section edge.**

The photograph is not the only layer that moves. `Backdrop` gives the orbital
lines `-0.7n`, so they travel the **opposite** way and further. That
separation is the whole effect: a backdrop where every layer drifts together
does not read as parallax, it reads as a backdrop that is slightly late. At
the hero/about seam, measured: the hero photograph at `+36px` while its lines
sit at `-25px`.

A negative `n` is a supported value, not a hack - it is how that counter-move
is expressed.

### Fonts

Three faces, deliberately split by what each can do:

- **Dune Rise** (`font-title`) - the titling face. One weight, no `%` or `~`
  in its cmap, so it is used only for the wordmark, the oversized watermarks
  and the faction slogans, where those limits never bite.
- **Agency FB** (`font-hud`) - the tracked-out uppercase HUD readouts, which
  only ever ask for 400.
- **Saira Condensed** (`font-display` / `font-sans`) - everything needing 600
  or 700, and all body copy. Dune Rise has no such weights, and synthesising
  them looks like what it is.

Switching body copy to Agency FB is a one-token change in `global.css` if you
want the original's exact feel; it costs the real 600/700 weights to do it.

## Known rough edges

Built without a browser, but not left at "verified-compiles and hope." Every
scroll-position-dependent behaviour described above - activation, the
dissolve, the faction cross-fade, ScrollSmoother, the pin - was confirmed by
actually **executing** the real production bundle (not the source, the exact
file Vite emits) inside a headless JS engine (jsdom), with the handful of
genuinely-missing browser APIs (`matchMedia`, `IntersectionObserver`,
`ResizeObserver`, layout geometry - jsdom has no rendering engine, so none of
these exist by default) stubbed to their simplest correct behaviour. That
caught two real bugs in the test harness itself along the way (a `matchMedia`
stub that ignored the query string, a position mock that returned an
ever-incrementing value instead of a stable one per element) before producing
a trustworthy signal: 51 `ScrollTrigger` instances at the expected count
(a figure from before the artwork, the scrollbar and the faction pin landed -
the count is higher now),
correct geometry, a real inline style GSAP wrote to the real Hero element, and
- for the pin specifically - the exact `translate(0px, 0.001px)`
compositing-layer micro-offset GSAP's pin mechanism is known to apply, present
on the pin target and absent from the trigger. This is a genuinely reusable
technique for verifying scroll-driven JS without a browser in the loop; ask if
you want the harness script itself.

**If the page ever looks like plain, unsmoothed scroll with only the faction
section animating, that specific combination is the signature of
`prefers-reduced-motion` being on** - not a bug. Activation (rail, chapter
text) and the faction panels' CSS-level `data-active` opacity toggle both run
unconditionally; ScrollSmoother, the dissolve, and the pin are all gated
behind `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` and simply
never get created when that setting is on. Check OS-level reduced-motion
first if this comes up: macOS → System Settings → Accessibility → Display →
Reduce Motion; Windows → Settings → Accessibility → Visual effects.

The numbers that control the feel, all in `scripts/gsap.ts`:

- `SCRUB` (currently `0.4`) - the catch-up lag on every scrubbed tween. `0`
  locks exactly to the scroll position; higher values feel heavier and more
  deliberate.
- the `'top bottom'` / `'top 25%'` / `'bottom 75%'` / `'bottom top'` trigger
  positions - these set how much scroll distance the enter/leave phases cover,
  and therefore how pronounced the overlap between adjacent sections feels.
- `smooth: 1.3` on `ScrollSmoother.create()` - the physical scroll lag.
- `pinSpacing` on the pin system defaults to `false` for the trigger≠target
  pattern the faction stage uses; see **Pins** above for why, and flip it per
  pin via `data-pin-spacing="true"` if a future one uses the same element as
  both trigger and target.
- `SCRAMBLE_MS` (340) and `TICK_MS` (30) in `scripts/reveal.ts` - how long
  the decrypt cycles for, and how fast the glyphs turn over. The whole string
  scrambles at once and lands at once, so the duration does not depend on
  length: a heading and the paragraph under it resolve together.
- the `8%` stops in `[data-feather='both']` (`global.css`) - how wide the
  band of space between two scenes is. Longer trades scene for space, and
  past roughly 15% the sections stop owning their own frames.
- the starfield's `yPercent` range in `scripts/gsap.ts` - how present the
  space behind the page feels.
- `snap` inside the pin block in `scripts/gsap.ts` - `duration` and `delay`
  are the feel of the faction settle. Too short a delay and it fights the
  wheel; too long and it feels like the page hesitated.

No cross-browser caveat is needed for the animation engine itself - this was
the whole point of moving off the earlier CSS `animation-timeline: view()`
approach. ScrollTrigger and ScrollSmoother work identically in every evergreen
browser.

**`ScrollTrigger.refresh()` timing is the thing most likely to need attention
in practice.** It's called after `document.fonts.ready` and on `window.load`,
which covers font-swap and initial-image layout shift. It is *not* explicitly
called after the `HeroGallery` or `SoundtrackPlayer` islands finish hydrating
(`client:visible`) - if either turns out to meaningfully change its section's
height once real content replaces the placeholder styling, trigger positions
calculated before that point could drift. Watch this first if the dissolve
ever looks like it's firing at the wrong scroll position for those two
sections specifically; the fix is a `ScrollTrigger.refresh()` call after
hydration, which Astro doesn't currently signal in an event this script
listens for.

Lighthouse's accessibility score is an automated subset. The structural work
is done - verified via a DOM-ancestry-aware sweep of the built HTML, not just
a text-proximity grep - but a real audit still needs a screen reader and a
keyboard.

## Licensing

Dune is a Warner Bros. and Herbert estate property; the reference design is a
non-commercial student piece by Rolando Aguillon. Use original or licensed
artwork before putting this anywhere public.
