// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Only English ships today. Adding a locale means adding it here and
  // dropping a matching file into src/content/copy/ - nothing else changes.
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    routing: { prefixDefaultLocale: false },
  },

  // Three small islands hydrate; the other ~95% of the page is static HTML.
  integrations: [preact({ compat: false, devtools: false })],

  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },

  build: {
    // One stylesheet beats a waterfall of <link>s for LCP.
    inlineStylesheets: 'auto',
  },

  vite: {
    plugins: [tailwindcss()],
    build: { cssMinify: 'lightningcss' },
  },
});
