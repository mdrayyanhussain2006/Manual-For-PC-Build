// ============================================================
// FILE: astro.config.mjs
// Phase 0 — Foundation
// ------------------------------------------------------------
// Bootstrap for reference (package.json is intentionally not a
// deliverable of this prompt):
//   npm create astro@latest -- --template minimal
//   npm install tailwindcss @tailwindcss/vite
//   drop these files in, then: npm run dev
// ============================================================
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [tailwindcss()],
});
