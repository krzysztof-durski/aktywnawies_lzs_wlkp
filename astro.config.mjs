// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  // Astro otherwise inlines small client scripts directly into the HTML
  // (Vite's default assetsInlineLimit), which our CSP script-src (no
  // 'unsafe-inline') then blocks in production. Forcing them to always
  // stay external .js files keeps them within 'self' with no CSP hash juggling.
  vite: {
    build: {
      assetsInlineLimit: 0
    }
  }
});