import { describe, it, expect, vi, beforeEach } from 'vitest';
import { read, parseHtml, byId } from './helpers/html.js';

vi.mock('../src/ui/announce.js', () => ({ announce: () => {}, toast: () => {} }));
vi.mock('../src/ui/tint.js', () => ({ tintImage: async () => null }));

const { placements, history, state } = await import('../src/app/state.js');
const { addRedaction, resizeBoxTo, resizeTo, rotateBy, copyToAllPages } = await import('../src/app/actions.js');

beforeEach(() => {
  placements.replaceAll([]);
  history.clear();
  state.doc = {};
  state.pageIndex = 1;
  state.pageCount = 4;
  state.pageAspects = [0.75, 0.75, 1.3, 0.75];
});

describe('redaction boxes', () => {
  it('are added on the current page and can be undone', () => {
    const p = addRedaction();
    expect(p).toMatchObject({ kind: 'redact', page: 1 });
    expect(placements.size).toBe(1);
    history.undo();
    expect(placements.size).toBe(0);
  });
  it('do nothing without a document', () => {
    state.doc = null;
    expect(addRedaction()).toBeNull();
  });
  it('can take any width and height', () => {
    const p = addRedaction();
    resizeBoxTo(p.id, 0.5, 0.2);
    expect(placements.get(p.id)).toMatchObject({ width: 0.5, height: 0.2 });
  });
  it('stay on the page when resized', () => {
    const p = addRedaction();
    resizeBoxTo(p.id, 5, 5);
    const r = placements.get(p.id);
    expect(r.x + r.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(r.y + r.height).toBeLessThanOrEqual(1 + 1e-9);
  });
  it('grow in proportion with the size buttons', () => {
    const p = addRedaction();
    const before = placements.get(p.id);
    resizeTo(p.id, before.width * 1.5, before);
    const after = placements.get(p.id);
    expect(after.height / after.width).toBeCloseTo(before.height / before.width);
  });
  it('cannot be rotated', () => {
    const p = addRedaction();
    rotateBy(p.id, 15);
    expect(placements.get(p.id).rotation).toBeUndefined();
  });
  it('copy to every page at the same place and size', () => {
    const p = addRedaction();
    copyToAllPages(p.id);
    const all = placements.all();
    expect(all).toHaveLength(4);
    for (const q of all) expect([q.x, q.y, q.width, q.height]).toEqual([p.x, p.y, p.width, p.height]);
  });
});

describe('redaction wiring', () => {
  it('has a button and a plain warning in the page', () => {
    const doc = parseHtml(read('index.html'));
    expect(byId(doc, 'addRedact')).toBeTruthy();
    expect(read('index.html')).toMatch(/pictures, so their text can't be selected/);
  });
  it('is given the page renderer on every export path', () => {
    expect(read('src/ui/download.js')).toContain('rasterize');
    expect(read('src/ui/batch.js')).toContain('rasterize');
    expect(read('src/ui/pdf-engine.js')).toContain('export async function rasterizePages');
  });
  it('is sent to the exporter as a box, not a picture', () => {
    expect(read('src/ui/export-items.js')).toMatch(/kind === 'redact'/);
  });
});
