import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Not from 'astro:content' — that re-export is deprecated and goes away in
// Astro 7. Same zod, sourced directly.
import { z } from 'astro/zod';

/**
 * One JSON file per locale in src/content/copy/. The entry id is the locale
 * code, so `getEntry('copy', 'en')` returns the English page.
 *
 * The schema below is the contract every translation has to meet: add
 * src/content/copy/fr.json missing a key and the build fails with the path
 * to it, rather than shipping a half-translated page.
 */

const item = z.object({ id: z.string() });

const copy = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/copy' }),
  schema: z.object({
    meta: z.object({
      title: z.string(),
      description: z.string(),
    }),

    nav: z.object({
      skip: z.string(),
      menu: z.string(),
      close: z.string(),
      chaptersLabel: z.string(),
      progressLabel: z.string(),
      language: z.string(),
      chapters: z.array(item.extend({ label: z.string() })).min(1),
      /** the seven markers on the right-hand rail; each may cover several sections */
      rail: z
        .array(item.extend({ label: z.string(), sections: z.array(z.string()).min(1) }))
        .min(1),
    }),

    /** Transport labels. Several of these only ever surface as an
     *  aria-label, which is exactly why they belong in the copy file. */
    player: z.object({
      play: z.string(),
      pause: z.string(),
      previous: z.string(),
      next: z.string(),
      mute: z.string(),
      unmute: z.string(),
      seek: z.string(),
      unavailable: z.string(),
    }),

    hero: z.object({
      eyebrow: z.string(),
      title: z.string(),
      body: z.string(),
      cta: z.string(),
      player: z.object({
        track: z.string(),
        elapsed: z.string(),
        duration: z.string(),
      }),
    }),

    about: z.object({
      eyebrow: z.string(),
      title: z.string(),
      body: z.array(z.string()),
      cta: z.string(),
      poster: z.string(),
    }),

    houses: z.object({
      eyebrow: z.string(),
      title: z.string(),
      body: z.string(),
      cta: z.string(),
      sigil: z.string(),
      items: z.array(
        item.extend({
          kind: z.string(),
          name: z.string(),
          quote: z.string(),
        }),
      ),
    }),

    factions: z.object({
      eyebrow: z.string(),
      symbolLabel: z.string(),
      homeworldLabel: z.string(),
      sloganLabel: z.string(),
      emblem: z.string(),
      cta: z.string(),
      items: z.array(
        item.extend({
          name: z.string(),
          watermark: z.string(),
          body: z.array(z.string()),
          symbol: z.string(),
          homeworld: z.string(),
          slogan: z.string(),
        }),
      ),
    }),

    heroes: z.object({
      eyebrow: z.string(),
      quote: z.string(),
      body: z.string(),
      watchVideo: z.string(),
      featured: z.string(),
      filters: z.array(item.extend({ label: z.string(), total: z.number() })),
      cards: z.array(item.extend({ name: z.string() })),
    }),

    arrakis: z.object({
      eyebrow: z.string(),
      title: z.string(),
      body: z.string(),
      globe: z.string(),
      cta: z.string(),
      hotspot: z.string(),
      worlds: z.array(item.extend({ name: z.string() })),
      sites: z.array(item.extend({ name: z.string() })),
    }),

    caladan: z.object({
      eyebrow: z.string(),
      title: z.string(),
      body: z.array(z.string()),
      cta: z.string(),
      media: z.string(),
    }),

    architecture: z.object({
      eyebrow: z.string(),
      title: z.string(),
      body: z.string(),
      cta: z.string(),
      pillars: z.array(item.extend({ title: z.string(), tag: z.string() })),
    }),

    tours: z.object({
      eyebrow: z.string(),
      buy: z.string(),
      note: z.string(),
      items: z.array(
        item.extend({
          numeral: z.string(),
          title: z.string(),
          world: z.string(),
          price: z.string(),
        }),
      ),
    }),

    soundtrack: z.object({
      eyebrow: z.string(),
      title: z.string(),
      body: z.string(),
      cover: z.string(),
      spotify: z.string(),
      elapsed: z.string(),
      nowPlayingId: z.string(),
      tracks: z.array(
        item.extend({ n: z.number(), title: z.string(), time: z.string() }),
      ),
    }),

    author: z.object({
      eyebrow: z.string(),
      title: z.string(),
      body: z.array(z.string()),
      signature: z.string(),
      heritageLabel: z.string(),
      heritageValue: z.string(),
    }),

    books: z.object({
      eyebrow: z.string(),
      author: z.string(),
      read: z.string(),
      items: z.array(item.extend({ title: z.string() })),
    }),

    comics: z.object({
      eyebrow: z.string(),
      title: z.string(),
      body: z.string(),
      cta: z.string(),
    }),

    media: z.object({
      eyebrow: z.string(),
      items: z.array(item.extend({ title: z.string(), kind: z.string() })),
      newsletter: z.object({
        label: z.string(),
        placeholder: z.string(),
        submit: z.string(),
      }),
      follow: z.string(),
      legal: z.string(),
    }),

    credits: z.object({
      eyebrow: z.string(),
      disclaimer: z.array(z.string()),
      role: z.string(),
      name: z.string(),
      thanks: z.string(),
    }),
  }),
});

export const collections = { copy };
