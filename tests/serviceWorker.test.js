import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Runs src/sw.template.js against a tiny fake service-worker environment.
function setup({ online, store = new Map(), version = 'test', files = ['/', '/assets/app.js'] }) {
  // `store` (cacheName -> Map(url -> body)) can be shared to model a browser keeping caches between versions.
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
    if (online.value === 'hang') return new Promise(() => {}); // a server that never answers
    if (!online.value) throw new TypeError('network down');
    return { ok: online.value !== 'bad', clone() { return this; }, text: async () => `live:${key(r)}` };
  };
  const self = {
    location: { origin: 'http://app.test' },
    addEventListener: (type, fn) => (listeners[type] = fn),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  };
  const src = readFileSync(new URL('../src/sw.template.js', import.meta.url), 'utf8')
    .replace('__CACHE_VERSION__', version)
    .replace('__PRECACHE__', JSON.stringify(files));
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

  it('upgrades cleanly: the new version replaces the old caches and their files', async () => {
    const store = new Map();
    const online = { value: true };
    const v1 = setup({ online, store, version: 'v1', files: ['/', '/assets/old.js'] });
    await v1.run('install', {});
    await v1.run('activate', {});
    expect([...store.keys()]).toEqual(['pdfsign-v1']);

    const v2 = setup({ online, store, version: 'v2', files: ['/', '/assets/new.js'] });
    await v2.run('install', {});
    expect([...store.keys()].sort()).toEqual(['pdfsign-v1', 'pdfsign-v2']); // both exist until activation
    await v2.run('activate', {});
    expect([...store.keys()]).toEqual(['pdfsign-v2']);
    expect([...store.get('pdfsign-v2').keys()]).toEqual(['/', '/assets/new.js']);
  });

  it('leaves unrelated caches from other apps alone', async () => {
    const store = new Map([['someone-elses-cache', new Map()]]);
    const sw = setup({ online: { value: true }, store });
    await sw.run('install', {});
    await sw.run('activate', {});
    expect([...store.keys()].sort()).toEqual(['pdfsign-test', 'someone-elses-cache']);
  });

  it('never touches other origins, non-GET requests or /healthz', async () => {
    const sw = setup({ online: { value: true } });
    await sw.run('install', {});
    const ignored = [
      { url: 'https://cdn.example/x.js', method: 'GET', mode: 'no-cors' },
      { url: 'http://app.test/', method: 'POST', mode: 'navigate' },
      { url: 'http://app.test/healthz', method: 'GET', mode: 'no-cors' },
    ];
    for (const request of ignored) {
      let handled = false;
      await Promise.race([
        sw.run('fetch', { request }).then(() => (handled = true)),
        new Promise((r) => setTimeout(r, 20)),
      ]);
      expect(handled).toBe(false);
    }
  });

  it('falls back to the saved page after 3 seconds when the server hangs', async () => {
    vi.useFakeTimers();
    try {
      const online = { value: true };
      const sw = setup({ online });
      await sw.run('install', {});
      online.value = 'hang';
      const pending = sw.run('fetch', { request: { url: 'http://app.test/', method: 'GET', mode: 'navigate' } });
      await vi.advanceTimersByTimeAsync(3000);
      expect(await (await pending).text()).toBe('saved:/');
    } finally {
      vi.useRealTimers();
    }
  });

  it('saves a file that was not precached the first time it is fetched, then serves it offline', async () => {
    const online = { value: true };
    const sw = setup({ online });
    await sw.run('install', {});
    const request = { url: 'http://app.test/assets/lazy.js', method: 'GET', mode: 'no-cors' };
    expect(await (await sw.run('fetch', { request })).text()).toBe('live:/assets/lazy.js');
    await new Promise((r) => setTimeout(r, 0)); // the copy is saved in the background
    online.value = false;
    expect(await (await sw.run('fetch', { request })).text()).toBe('live:/assets/lazy.js');
  });

  it('does not save error responses', async () => {
    const online = { value: 'bad' };
    const sw = setup({ online });
    await sw.run('install', {});
    const request = { url: 'http://app.test/assets/missing.js', method: 'GET', mode: 'no-cors' };
    await sw.run('fetch', { request });
    await new Promise((r) => setTimeout(r, 0));
    online.value = false;
    await expect(Promise.race([sw.run('fetch', { request }), new Promise((_, rej) => setTimeout(() => rej(new Error('network down')), 50))])).rejects.toThrow();
  });
});
