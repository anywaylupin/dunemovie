/**
 * Artwork bindings, keyed by the same ids used in src/content/copy/*.json.
 *
 * Sibling of visuals.ts and split from it on purpose: visuals.ts holds
 * colour and placement tokens a translator or designer can edit as plain
 * strings, while everything here is a real `import` so Vite/Sharp can hash,
 * resize and re-encode the file at build time. An id with no entry falls
 * back to the gradient wash in visuals.ts, so a missing image degrades to
 * the placeholder treatment rather than a broken layout.
 *
 * Files live in src/assets/images/ (processed) rather than public/ (copied
 * verbatim) — that is what buys the WebP conversion and the srcset.
 */

import type { ImageMetadata } from 'astro';

import aboutCircles from '../assets/images/about-circles.png';
import about from '../assets/images/about.png';
import abstract from '../assets/images/abstract.png';
import atreidesCircles from '../assets/images/atreides-circles.png';
import atreidesTexture from '../assets/images/atreides-texture.jpg';
import atreides from '../assets/images/atreides.png';
import caladanCircles from '../assets/images/caladan-circles.png';
import caladan from '../assets/images/caladan.png';
import fremenCircles from '../assets/images/freeman-circles.png';
import fremen from '../assets/images/freeman.png';
import harkonnenCircles from '../assets/images/harkonen-circles.png';
import harkonnen from '../assets/images/harkonen.jpg';
import heroCircles from '../assets/images/hero-circles.png';
import hero from '../assets/images/hero.png';
import posterBase from '../assets/images/poster-base.png';
import poster from '../assets/images/poster.png';
import star from '../assets/images/star.jpg';
import vector from '../assets/images/vector.png';
import wordmark from '../assets/images/dune.png';

/** Loose artwork the sections reach for directly. */
export { abstract, poster, posterBase, star, vector, wordmark };

export interface BackdropArt {
  image: ImageMetadata;
  /** CSS object-position for the full-bleed fill */
  position?: string;
  /** thin orbital line overlay that sits above the photograph */
  circles?: ImageMetadata;
  /** 0–100, how strongly the photograph reads through the section wash */
  strength?: number;
}

/**
 * Full-bleed section backdrops. Only the scenes with a plate that actually
 * fits appear here; the rest keep the gradient wash they already had.
 */
export const backdropArt: Record<string, BackdropArt> = {
  hero: { image: hero, position: 'center top', circles: heroCircles, strength: 100 },
  about: { image: about, position: 'center top', circles: aboutCircles, strength: 90 },
  // "houses — starfield" in the original labelling, and star.jpg is the
  // starfield plate the hero section fades in at its top edge.
  houses: { image: star, position: 'center', circles: aboutCircles, strength: 45 },
  heroes: { image: star, position: 'right center', circles: atreidesCircles, strength: 35 },
  caladan: { image: caladan, position: 'center top', circles: caladanCircles, strength: 100 },
};

export interface FactionArt {
  image: ImageMetadata;
  /**
   * plate — a cut-out that occupies the right half and dissolves toward
   *         the middle, so the chapter copy on the left never sits on it
   * full  — a whole scene that covers the frame
   */
  layout: 'plate' | 'full';
  position?: string;
  /** rock texture laid across the frame in overlay blend mode */
  texture?: ImageMetadata;
  circles: ImageMetadata;
  /** house colour, as a CSS colour, washed in from the plate's side */
  tint: string;
}

/**
 * The three faction panels are built from layers rather than one flat
 * image: the plate, a rock texture, the house colour, and the orbital lines
 * over the top.
 *
 * Every plate sits on the right because the pinned Chapter block owns the
 * left column across the whole page (see hud/Chapter.astro) — a cut-out on
 * the left would be read through the paragraph text.
 */
export const factionArt: Record<string, FactionArt> = {
  atreides: {
    image: atreides,
    layout: 'plate',
    position: 'center top',
    texture: atreidesTexture,
    circles: atreidesCircles,
    tint: '#236d38',
  },
  harkonnen: {
    image: harkonnen,
    layout: 'full',
    position: 'center',
    circles: harkonnenCircles,
    tint: '#8d1030',
  },
  fremen: {
    image: fremen,
    layout: 'plate',
    position: 'center top',
    texture: atreidesTexture,
    circles: fremenCircles,
    tint: '#ffb800',
  },
};

/**
 * Stand-alone plates dropped into a Placeholder slot. Anything not listed
 * keeps the dashed box, which is the honest signal that the artwork for
 * that slot does not exist yet.
 */
export const plateArt: Record<string, ImageMetadata> = {
  /** About — the framed key-art poster, 760 × 1080 */
  poster,
  /** Heroes — Leto's portrait doubles as the featured cut-out */
  featured: atreides,
  /** Soundtrack — the score reuses the film's key art, as scores do */
  cover: poster,
};
