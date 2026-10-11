// Structure checks on index.html: the contract between the markup, the scripts
// and assistive technology.
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { read, parseHtml, all, byId, textOf, inside } from './helpers/html.js';

const html = read('index.html');
const page = parseHtml(html);
const nodes = all(page);
const hidden = (n) => n.attrs['aria-hidden'] === 'true' || n.attrs.type === 'hidden' || 'hidden' in n.attrs;

describe('index.html', () => {
  it('declares a language and a viewport that covers the notch', () => {
    expect(html).toMatch(/<html[^>]*\blang="en"/);
    expect(html).toMatch(/name="viewport"[^>]*viewport-fit=cover/);
  });

  it('has no duplicate ids', () => {
    const ids = nodes.map((n) => n.attrs.id).filter(Boolean);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it('points every aria-controls, aria-labelledby, aria-describedby and for at an element that exists', () => {
    const missing = [];
    for (const n of nodes) {
      for (const attr of ['aria-controls', 'aria-labelledby', 'aria-describedby', 'for']) {
        for (const id of (n.attrs[attr] || '').split(/\s+/).filter(Boolean)) if (!byId(page, id)) missing.push(`${attr}=${id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('gives every button a name a screen reader can read', () => {
    const unnamed = nodes.filter((n) => n.tag === 'button' && !n.attrs['aria-label'] && !textOf(n)).map((n) => n.attrs.id || n.attrs.class);
    expect(unnamed).toEqual([]);
  });

  it('labels every visible form control', () => {
    const labelled = (n) => {
      if (n.attrs['aria-label'] || n.attrs['aria-labelledby']) return true;
      if (n.attrs.id && nodes.some((l) => l.tag === 'label' && l.attrs.for === n.attrs.id)) return true;
      let p = n.parent;
      while (p && p.tag !== '#root') {
        if (p.tag === 'label') return true;
        p = p.parent;
      }
      return false;
    };
    const bad = nodes.filter((n) => ['input', 'select', 'textarea'].includes(n.tag) && !hidden(n) && !labelled(n)).map((n) => n.attrs.id || n.attrs.type);
    expect(bad).toEqual([]);
  });

  it('gives every image an alt attribute', () => {
    expect(nodes.filter((n) => n.tag === 'img' && !('alt' in n.attrs))).toEqual([]);
  });

  it('only looks up ids in the scripts that exist in the page', () => {
    // Elements the scripts create themselves.
    const created = new Set();
    const files = readdirSync(new URL('../src/ui/', import.meta.url)).filter((f) => f.endsWith('.js'));
    const missing = [];
    for (const f of files) {
      const src = read(`src/ui/${f}`);
      for (const m of src.matchAll(/\$\(\s*['"`]#([\w-]+)['"`]/g)) {
        if (!byId(page, m[1]) && !created.has(m[1])) missing.push(`${f}: #${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('keeps the page heading and the skip link', () => {
    expect(nodes.filter((n) => n.tag === 'h1')).toHaveLength(1);
    const skip = nodes.find((n) => n.attrs.class === 'skip-link');
    expect(skip).toBeDefined();
    expect(byId(page, skip.attrs.href.slice(1))).not.toBeNull();
  });

  it('puts every dialog under the body so nothing can clip or stack over it', () => {
    for (const d of nodes.filter((n) => n.tag === 'dialog')) expect(d.parent.tag).toBe('body');
    expect(inside(byId(page, 'settings'), byId(page, 'app'))).toBe(false);
  });
});
