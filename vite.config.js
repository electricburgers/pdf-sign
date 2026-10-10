import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_RELEASE_DATE__: JSON.stringify(pkg.releaseDate),
    // Stamped each time Vite starts a build or dev server.
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    // pdf.js is large by nature; it is cached after the first visit.
    chunkSizeWarningLimit: 1500,
  },
  server: { port: 8296, host: true },
  preview: { port: 8296, host: true },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
