import { defineConfig } from 'vite';

export default defineConfig({
  // './' makes the built site work from any folder (e.g. GitHub Pages).
  base: './',
  // Phaser alone is ~1.2 MB minified (~330 KB gzipped); that's expected.
  build: { chunkSizeWarningLimit: 1500 },
});
