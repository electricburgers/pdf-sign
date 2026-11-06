// Guards for the work-saving changes: each of these used to repeat work per item.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';
import { readFileSync } from 'node:fs';
import { read } from './helpers/html.js';

vi.mock('../src/ui/announce.js', () => ({ announce: () => {}, toast: () => {} }));
vi.mock('../src/ui/tint.js', () => ({ tintImage: async () => null }));
const downscale = vi.fn(async (image) => image);
vi.mock('../src/ui/image.js', () => ({ downscaleImage: (...a) => downscale(...a) }));

const { placements, history, state } = await import('../src/app/state.js');
const { removeKind } = await import('../src/app/actions.js');
const { buildExportItems } = await import('../src/ui/export-items.js');
const { signPdf } = await import('../src/lib/exportPdf.js');
const { createPlacement } = await import('../src/lib/placements.js');

const tiny = 'data:image/png;base64,';
const item = (kind, page) => createPlacement({ kind, page, x: 0.1, y: 0.1, width: 0.2, height: 0.1 });

beforeEach(() => {
  placements.replaceAll([]);
  history.clear();
  state.assets.signature = { dataUrl: `${tiny}AAAA`, width: 10, height: 5 };
  state.assets.initials = { dataUrl: `${tiny}BBBB`, width: 10, height: 5 };
  downscale.mockClear();
});

describe('removeKind', () => {
  it('removes every item of that kind with a single change event', () => {
    for (let i = 0; i < 20; i += 1) placements.add(item('signature', i));
    placements.add(item('initials', 0));
    const events = [];
    placements.subscribe((e) => events.push(e.type));
    removeKind('signature');
    expect(placements.size).toBe(1);
    expect(placements.all()[0].kind).toBe('initials');
    expect(events).toEqual(['reset']);
  });
  it('can be undone in one step', () => {
    for (let i = 0; i < 5; i += 1) placements.add(item('signature', i));
    removeKind('signature');
    expect(placements.size).toBe(0);
    history.undo();
    expect(placements.size).toBe(5);
  });
});

describe('buildExportItems', () => {
  it('shrinks each distinct image once, even when kinds alternate', async () => {
    for (let i = 0; i < 10; i += 1) {
      placements.add(item('signature', i));
      placements.add(item('initials', i));
    }
    const items = await buildExportItems();
    expect(items).toHaveLength(20);
    expect(downscale).toHaveBeenCalledTimes(2);
  });
});

describe('signPdf', () => {
  it('reads each page box and rotation once, however many items sit on it', async () => {
    const png = new Uint8Array(readFileSync(new URL('./fixtures/sig.png', import.meta.url)));
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const bytes = await doc.save();
    const box = vi.spyOn(PDFPage.prototype, 'getCropBox');
    const rot = vi.spyOn(PDFPage.prototype, 'getRotation');
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, kind: 'signature', page: 0, x: 0.1, y: 0.05 * i, width: 0.2, height: 0.04 }));
    await signPdf(bytes, many, { signature: { mime: 'image/png', bytes: png } });
    expect(box).toHaveBeenCalledTimes(1);
    expect(rot).toHaveBeenCalledTimes(1);
    box.mockRestore();
    rot.mockRestore();
  });
});

describe('selection highlight', () => {
  it('updates only the two affected items', () => {
    const src = read('src/ui/placement-layer.js');
    expect(src).not.toMatch(/bus\.on\('selection'[\s\S]{0,80}for \(const \[id, el\] of elements\)/);
    expect(src).toContain('elements.get(shown)');
  });
});
