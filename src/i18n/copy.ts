import { getEntry } from 'astro:content';

export const defaultLocale = 'en';

/** Locales that have a file in src/content/copy/ and an entry in astro.config. */
export const locales = ['en'] as const;
export type Locale = (typeof locales)[number];

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (locales as readonly string[]).includes(value);

/**
 * Loads the page copy for a locale, falling back to the default so a
 * partially-added language never blanks the page.
 */
export async function getCopy(locale: string = defaultLocale) {
  const entry =
    (isLocale(locale) ? await getEntry('copy', locale) : undefined) ??
    (await getEntry('copy', defaultLocale));

  if (!entry) {
    throw new Error(
      `No copy found for "${locale}" or "${defaultLocale}". Expected src/content/copy/${defaultLocale}.json.`,
    );
  }

  return entry.data;
}

export type Copy = Awaited<ReturnType<typeof getCopy>>;
