import { defineConfig } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Emits /sw.js with every built file (and everything in public/) listed for
// precaching, so the installed app opens even when the server is down.
function serviceWorker() {
  const publicDir = new URL('./public/', import.meta.url).pathname;
  const walk = (dir, base = '') =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full, `${base}${name}/`) : [`${base}${name}`];
    });
  return {
    name: 'pdf-sign-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = new Set(Object.keys(bundle).filter((f) => f !== 'index.html'));
      const hash = createHash('sha1');
      for (const f of walk(publicDir)) {
        files.add(f);
        hash.update(f).update(readFileSync(join(publicDir, f)));
      }
      const urls = ['/', ...[...files].sort().map((f) => `/${f}`)];
      urls.forEach((u) => hash.update(u));
      const template = readFileSync(new URL('./src/sw.template.js', import.meta.url), 'utf8');
      const source = template
        .replace('__CACHE_VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__PRECACHE__', JSON.stringify(urls));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [serviceWorker()],
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
