// ============================================================
// FILE: astro.config.mjs
// Phase 0 — Foundation
// Phase 5 — Ask Builder: added SSR + Node adapter for /api/ask-builder
// ============================================================
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
});
