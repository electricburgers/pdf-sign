import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument, PDFName, PDFDict, degrees, decodePDFRawStream } from 'pdf-lib';
import { signPdf } from '../src/lib/exportPdf.js';

const png = new Uint8Array(readFileSync(new URL('./fixtures/sig.png', import.meta.url)));
const jpg = new Uint8Array(readFileSync(new URL('./fixtures/initials.jpg', import.meta.url)));
const assets = {
  signature: { mime: 'image/png', bytes: png },
  initials: { mime: 'image/jpeg', bytes: jpg },
};

let threePages;
beforeAll(async () => {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  doc.addPage([612, 792]);
  doc.addPage([612, 792]).setRotation(degrees(90));
  threePages = await doc.save();
});

const sig = (page, extra = {}) => ({ id: `s${page}${Math.random()}`, kind: 'signature', page, x: 0.5, y: 0.8, width: 0.3, height: 0.1, ...extra });
const ini = (page) => ({ id: `i${page}${Math.random()}`, kind: 'initials', page, x: 0.85, y: 0.9, width: 0.1, height: 0.07 });

async function imageRefs(bytes, pageIndex) {
  const doc = await PDFDocument.load(bytes);
  const xobj = doc.getPage(pageIndex).node.Resources().lookupMaybe(PDFName.of('XObject'), PDFDict);
  if (!xobj) return [];
  return xobj.entries().map(([, ref]) => ref.toString());
}

describe('signPdf', () => {
  it('returns a valid PDF with the same number of pages', async () => {
    const out = await signPdf(threePages, [sig(0)], assets);
    expect(new TextDecoder().decode(out.slice(0, 5))).toBe('%PDF-');
    expect((await PDFDocument.load(out)).getPageCount()).toBe(3);
  });
  it('embeds the signature image on the target page', async () => {
    const out = await signPdf(threePages, [sig(1)], assets);
    expect(await imageRefs(out, 1)).toHaveLength(1);
  });
  it('leaves other pages untouched', async () => {
    const out = await signPdf(threePages, [sig(1)], assets);
    expect(await imageRefs(out, 0)).toHaveLength(0);
  });
  it('embeds a reused asset only once', async () => {
    const out = await signPdf(threePages, [sig(0), sig(1)], assets);
    const refs = [...(await imageRefs(out, 0)), ...(await imageRefs(out, 1))];
    expect(new Set(refs).size).toBe(1);
  });
  it('supports a signature and initials together (PNG + JPEG)', async () => {
    const out = await signPdf(threePages, [sig(0), ini(0)], assets);
    expect(new Set(await imageRefs(out, 0)).size).toBe(2);
  });
  it('throws a clear error when an asset is missing', async () => {
    await expect(signPdf(threePages, [ini(0)], { signature: assets.signature })).rejects.toThrow(/initials/i);
  });
  it('throws when a placement points past the last page', async () => {
    await expect(signPdf(threePages, [sig(7)], assets)).rejects.toThrow(/page/i);
  });
  it('places the image on rotated pages', async () => {
    const out = await signPdf(threePages, [sig(2)], assets);
    expect(await imageRefs(out, 2)).toHaveLength(1);
  });
});

describe('signPdf options', () => {
  it('draws a tilted item', async () => {
    const out = await signPdf(threePages, [sig(0, { rotation: 45 })], assets);
    expect(await imageRefs(out, 0)).toHaveLength(1);
  });

  it('flattens form fields when asked', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    doc.getForm().createTextField('name').addToPage(page, { x: 50, y: 700, width: 200, height: 20 });
    const withForm = await doc.save();
    expect((await PDFDocument.load(await signPdf(withForm, [sig(0)], assets))).getForm().getFields()).toHaveLength(1);
    const flat = await signPdf(withForm, [sig(0)], assets, { flatten: true });
    expect((await PDFDocument.load(flat)).getForm().getFields()).toHaveLength(0);
  });

  it('skips items on pages the file does not have when asked to collect them', async () => {
    const skipped = [];
    const out = await signPdf(threePages, [sig(0), sig(7)], assets, { skipped });
    expect(skipped).toHaveLength(1);
    expect(await imageRefs(out, 0)).toHaveLength(1);
    await expect(signPdf(threePages, [sig(7)], assets)).rejects.toThrow(/page 8/);
  });

  it('refits the height to the page shape so the image is not stretched', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([792, 612]); // landscape
    const landscape = await doc.save();
    const item = { ...sig(0, { x: 0.1, y: 0.1, width: 0.2, height: 0.5 }), imageAspect: 4 };
    const out = await signPdf(landscape, [item], assets, { refit: true });
    expect(out.length).toBeGreaterThan(0);
    // width 0.2 * 792 = 158.4pt, so a 4:1 image must be ~39.6pt tall (not 0.5 * 612).
    const page = (await PDFDocument.load(out)).getPage(0);
    const contents = page.node.Contents();
    const streams = typeof contents.asArray === 'function' ? contents.asArray().map((ref) => page.doc.context.lookup(ref)) : [contents];
    const text = streams.map((st) => new TextDecoder('latin1').decode(decodePDFRawStream(st).decode())).join('\n');
    const sizes = [...text.matchAll(/([\d.]+) 0 0 ([\d.]+) [\d.]+ [\d.]+ cm/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(sizes.some(([w, h]) => Math.abs(w - 158.4) < 0.01 && Math.abs(h - 39.6) < 0.01)).toBe(true);
  });
});
