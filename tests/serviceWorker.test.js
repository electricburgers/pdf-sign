import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Runs src/sw.template.js against a tiny fake service-worker environment.
function setup({ online }) {
  const store = new Map(); // cacheName -> Map(url -> body)
  const listeners = {};
  const key = (r) => new URL(typeof r === 'string' ? r : r.url, 'http://app.test').pathname;
  const caches = {
    open: async (name) => {
      if (!store.has(name)) store.set(name, new Map());
      const m = store.get(name);
      return {
        addAll: async (reqs) => reqs.forEach((r) => m.set(key(r), `saved:${key(r)}`)),
        put: async (r, res) => m.set(key(r), await res.text()),
      };
    },
    match: async (r) => {
      for (const m of store.values()) if (m.has(key(r))) return { text: async () => m.get(key(r)) };
      return undefined;
    },
    keys: async () => [...store.keys()],
    delete: async (n) => store.delete(n),
  };
  const fetch = async (r) => {
    if (!online.value) throw new TypeError('network down');
    return { ok: true, clone() { return this; }, text: async () => `live:${key(r)}` };
  };
  const self = {
    location: { origin: 'http://app.test' },
    addEventListener: (type, fn) => (listeners[type] = fn),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  };
  const src = readFileSync(new URL('../src/sw.template.js', import.meta.url), 'utf8')
    .replace('__CACHE_VERSION__', 'test')
    .replace('__PRECACHE__', JSON.stringify(['/', '/assets/app.js']));
  vm.runInNewContext(src, { self, caches, fetch, Request: class { constructor(url) { this.url = url; } }, URL, setTimeout, Promise });
  const run = (type, event) => new Promise((resolve) => {
    listeners[type]({ ...event, waitUntil: resolve, respondWith: resolve });
  });
  return { run, store };
}

describe('service worker', () => {
  it('precaches the app and serves it when the server is down', async () => {
    const online = { value: true };
    const sw = setup({ online });
    await sw.run('install', {});
    online.value = false;
    const page = await sw.run('fetch', { request: { url: 'http://app.test/', method: 'GET', mode: 'navigate' } });
    expect(await page.text()).toBe('saved:/');
    const asset = await sw.run('fetch', { request: { url: 'http://app.test/assets/app.js', method: 'GET', mode: 'no-cors' } });
    expect(await asset.text()).toBe('saved:/assets/app.js');
  });

  it('prefers the live page when the server is up', async () => {
    const online = { value: true };
    const sw = setup({ online });
    await sw.run('install', {});
    const page = await sw.run('fetch', { request: { url: 'http://app.test/', method: 'GET', mode: 'navigate' } });
    expect(await page.text()).toBe('live:/');
  });

  it('removes caches from older versions on activate', async () => {
    const sw = setup({ online: { value: true } });
    sw.store.set('pdfsign-old', new Map());
    await sw.run('install', {});
    await sw.run('activate', {});
    expect([...sw.store.keys()]).toEqual(['pdfsign-test']);
  });
});
