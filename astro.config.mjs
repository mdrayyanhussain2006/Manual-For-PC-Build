// ============================================================
// FILE: astro.config.mjs
// Phase 0 — Foundation
// Phase 5 — Ask Builder: added SSR + Vercel adapter for /api/ask-builder
// ============================================================
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
