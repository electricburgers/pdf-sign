// Hosting on GitHub Pages: as a project site (https://user.github.io/repo/) or
// on a custom domain at the root. One build has to work in both places, so
// nothing may assume the app lives at "/".
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { read } from './helpers/html.js';
import { CSP_DIRECTIVES, cspForMeta } from '../src/lib/csp.js';

const manifest = JSON.parse(read('public/manifest.webmanifest'));
const sw = read('src/sw.template.js');

describe('paths that work under a sub-folder', () => {
  it('builds with relative asset URLs', () => {
    expect(read('vite.config.js')).toMatch(/base:\s*'\.\/'/);
  });

  it('uses relative manifest start_url, scope and icon paths', () => {
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    for (const icon of manifest.icons) expect(icon.src, icon.src).not.toMatch(/^\//);
  });

  it('registers the service worker relative to the page', () => {
    expect(read('src/main.js')).toMatch(/register\('\.\/sw\.js'\)/);
  });

  it('keeps the service worker free of root-absolute URLs', () => {
    expect(sw).not.toMatch(/['"`]\/['"`]/); // a bare '/' key
    expect(sw).not.toMatch(/pathname === '\//);
    expect(sw).toMatch(/self\.registration\.scope/);
  });

  it('lists precached files relative to the worker, not to the site root', () => {
    const config = read('vite.config.js');
    expect(config).not.toMatch(/`\/\$\{f\}`/);
    expect(config).toMatch(/'\.\/'/);
  });
});

describe('security policy outside nginx', () => {
  const nginx = read('nginx.conf');
  const fromNginx = /Content-Security-Policy "([^"]+)"/.exec(nginx)[1].split(';').map((d) => d.trim()).filter(Boolean);

  it('puts the same Content-Security-Policy in a meta tag at build time', () => {
    expect(read('vite.config.js')).toMatch(/Content-Security-Policy/);
    expect(cspForMeta()).toContain("default-src 'self'");
  });

  it('matches nginx apart from frame-ancestors, which a meta tag cannot set', () => {
    expect(CSP_DIRECTIVES.filter((d) => !d.startsWith('frame-ancestors'))).toEqual(fromNginx.filter((d) => !d.startsWith('frame-ancestors')));
    expect(cspForMeta()).not.toContain('frame-ancestors');
  });

  it('still allows what the app needs: its own scripts, blob workers and data images', () => {
    const csp = cspForMeta();
    expect(csp).toMatch(/worker-src 'self' blob:/);
    expect(csp).toMatch(/img-src 'self' data: blob:/);
    expect(csp).toMatch(/object-src 'none'/);
  });
});

describe('deploy workflow', () => {
  const file = '.github/workflows/pages.yml';
  const yml = existsSync(new URL(`../${file}`, import.meta.url)) ? read(file) : '';

  it('exists', () => {
    expect(yml).not.toBe('');
  });

  it('runs on pushes to main and by hand', () => {
    expect(yml).toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
    expect(yml).toMatch(/workflow_dispatch:/);
  });

  it('asks only for the permissions Pages needs', () => {
    expect(yml).toMatch(/pages:\s*write/);
    expect(yml).toMatch(/id-token:\s*write/);
    expect(yml).toMatch(/contents:\s*read/);
  });

  it('tests and builds before publishing the dist folder', () => {
    expect(yml.indexOf('npm ci')).toBeGreaterThan(-1);
    expect(yml.indexOf('npm test')).toBeGreaterThan(yml.indexOf('npm ci'));
    expect(yml.indexOf('npm run build')).toBeGreaterThan(yml.indexOf('npm test'));
    expect(yml).toMatch(/upload-pages-artifact@v\d+[\s\S]*path:\s*dist/);
    expect(yml).toMatch(/deploy-pages@v\d+/);
  });

  it('never puts repository variables straight into a shell command', () => {
    for (const line of yml.split('\n').filter((l) => /^\s*run:/.test(l))) expect(line).not.toMatch(/\$\{\{/);
  });
});

describe('docs', () => {
  it('explains both ways to host on Pages', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/GitHub Pages/);
    expect(readme).toMatch(/custom domain/i);
    expect(readme).toMatch(/<repo>|project site/i);
  });
});
