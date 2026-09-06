/**
 * Colour and placement tokens, keyed by the same ids used in
 * src/content/copy/*.json. Translations carry words only — a French
 * copy file should never have to repeat a gradient.
 */

const fallback = 'from-white/15 to-white/5';

export const houseTint: Record<string, string> = {
  corrino: 'from-sky-700 to-sky-900',
  gesserit: 'from-violet-700 to-violet-950',
  harkonnen: 'from-red-700 to-red-950',
  atreides: 'from-emerald-700 to-emerald-950',
  guild: 'from-amber-600 to-amber-900',
};

export const factionWash: Record<string, string> = {
  atreides: 'from-atreides/95 via-atreides/60 to-void',
  harkonnen: 'from-harkonnen/95 via-harkonnen/50 to-void',
  fremen: 'from-fremen/95 via-fremen/50 to-void',
};

/**
 * Three stops rather than two, lit stop first: art/Sphere.astro anchors the
 * gradient off-centre at the light source, so the first stop is the lit
 * face, the middle is the body colour and the last is the terminator. A
 * two-stop list reads as a flat disc however it is positioned.
 */
export const worldTint: Record<string, string> = {
  caladan: 'from-sky-200 via-teal-600 to-emerald-950',
  'giedi-prime': 'from-violet-200 via-violet-700 to-slate-950',
  niushe: 'from-slate-100 via-slate-400 to-slate-800',
};

/** Colour of each world's air, for the rim that blooms past its edge. */
export const worldGlow: Record<string, string> = {
  caladan: 'rgba(56, 189, 172, 0.45)',
  'giedi-prime': 'rgba(139, 92, 246, 0.4)',
  niushe: 'rgba(203, 213, 225, 0.35)',
};

/** Percentage positions of the map pins on the Arrakis globe. */
export const sitePosition: Record<string, { left: string; top: string }> = {
  'great-flat': { left: '38%', top: '58%' },
  'imperial-basin': { left: '44%', top: '74%' },
  'broken-land': { left: '68%', top: '80%' },
};

export const tourVisual: Record<string, { poster: string; accent: string }> = {
  caladan: { poster: 'from-sky-700 to-slate-900', accent: 'bg-sky-600' },
  'giedi-prime': { poster: 'from-red-800 to-neutral-950', accent: 'bg-red-800' },
  arrakis: { poster: 'from-amber/80 to-neutral-900', accent: 'bg-amber' },
};

export const bookVisual: Record<
  string,
  { cover: string; accent: string; offset: string }
> = {
  dune: { cover: 'from-amber/70 to-orange-900', accent: 'bg-amber', offset: 'sm:mt-0' },
  messiah: { cover: 'from-sky-700 to-slate-900', accent: 'bg-sky-700', offset: 'sm:mt-16' },
  children: { cover: 'from-rose-600 to-rose-950', accent: 'bg-rose-700', offset: 'sm:mt-32' },
};

export const mediaTint: Record<string, string> = {
  'part-two': 'from-orange-600 to-neutral-900',
  duncan: 'from-slate-600 to-neutral-900',
  awakening: 'from-amber/60 to-sky-900',
};

/** Which pillar sits in which corner of the architecture grid. */
export const pillarPlacement: Record<string, string> = {
  agnostic: 'lg:col-start-1 lg:row-start-1',
  simplicity: 'lg:col-start-3 lg:row-start-1',
  eccentricity: 'lg:col-start-1 lg:row-start-3',
  collective: 'lg:col-start-3 lg:row-start-3',
};

export const tint = (map: Record<string, string>, id: string) => map[id] ?? fallback;
