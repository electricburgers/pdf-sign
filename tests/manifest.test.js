// The installable app: manifest, icons and the touch icon.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { read, parseHtml, all } from './helpers/html.js';

const manifest = JSON.parse(read('public/manifest.webmanifest'));
const pub = (name) => new URL(`../public/${name.replace(/^\//, '')}`, import.meta.url);
const png = (name) => {
  const b = readFileSync(pub(name));
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25], signature: b.subarray(1, 4).toString() };
};
const pngIcons = manifest.icons.filter((i) => i.type === 'image/png');

describe('web app manifest', () => {
  it('opens as its own app from wherever it is hosted (relative start_url and scope)', () => {
    expect(manifest).toMatchObject({ display: 'standalone', start_url: './', scope: './' });
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });

  it('lists icons that all exist', () => {
    for (const icon of manifest.icons) expect(existsSync(pub(icon.src)), icon.src).toBe(true);
  });

  it('declares sizes that match the real image dimensions', () => {
    for (const icon of pngIcons) {
      const { width, height, signature } = png(icon.src);
      expect(signature).toBe('PNG');
      expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
    }
  });

  it('offers regular and maskable icons at 192 and 512', () => {
    for (const purpose of ['any', 'maskable']) {
      for (const size of ['192x192', '512x512']) {
        expect(pngIcons.some((i) => i.purpose === purpose && i.sizes === size), `${purpose} ${size}`).toBe(true);
      }
    }
  });

  it('is linked from the page, with a 180 px opaque touch icon for iOS', () => {
    const links = all(parseHtml(read('index.html'))).filter((n) => n.tag === 'link');
    expect(links.some((l) => l.attrs.rel === 'manifest' && l.attrs.href === '/manifest.webmanifest')).toBe(true);
    const touch = links.find((l) => l.attrs.rel === 'apple-touch-icon');
    expect(touch.attrs.sizes).toBe('180x180');
    const info = png(touch.attrs.href);
    expect(`${info.width}x${info.height}`).toBe('180x180');
    expect(info.colorType).toBe(2); // RGB with no alpha: iOS paints transparent corners black
  });

  it('fills maskable icons edge to edge (no alpha channel)', () => {
    for (const icon of pngIcons.filter((i) => i.purpose === 'maskable')) expect(png(icon.src).colorType, icon.src).toBe(2);
  });
});
