// Redaction must remove the covered content from the file, not just paint over it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument, PDFName, PDFArray, PDFDict, StandardFonts, decodePDFRawStream, PDFRawStream } from 'pdf-lib';
import { signPdf } from '../src/lib/exportPdf.js';

const png = new Uint8Array(readFileSync(new URL('./fixtures/sig.png', import.meta.url)));
const hex = (s) => [...s].map((c) => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join('');

// Every readable byte in the file: raw bytes plus every stream, decoded.
async function everything(bytes) {
  const doc = await PDFDocument.load(bytes);
  let text = Buffer.from(bytes).toString('latin1');
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) text += Buffer.from(decodePDFRawStream(obj).decode()).toString('latin1');
    else if (typeof obj.getUnencodedContents === 'function') text += Buffer.from(obj.getUnencodedContents()).toString('latin1');
  }
  return { text, doc };
}
const leaks = (text, word) => text.includes(word) || text.includes(hex(word));

async function sample() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const one = doc.addPage([612, 792]);
  one.drawText('SECRET-123', { x: 72, y: 700, size: 14, font });
  const two = doc.addPage([612, 792]);
  two.drawText('PUBLIC-456', { x: 72, y: 700, size: 14, font });
  const field = doc.getForm().createTextField('ssn');
  field.setText('FIELDVALUE-789');
  field.addToPage(one, { x: 72, y: 600, width: 200, height: 20 });
  // A link on page 2 that points at page 1, as a table of contents would.
  const link = doc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [72, 100, 200, 120], Dest: [one.ref, 'Fit'] });
  two.node.set(PDFName.of('Annots'), doc.context.obj([doc.context.register(link)]));
  doc.setTitle('SECRET-TITLE');
  doc.setAuthor('SECRET-AUTHOR');
  return doc.save();
}

const box = { id: 'r1', kind: 'redact', page: 0, x: 0.1, y: 0.1, width: 0.5, height: 0.05 };
const fakeRasterize = (calls) => async (bytes, jobs) => {
  calls.push({ bytes, jobs });
  return new Map(jobs.map((j) => [j.page, png]));
};

describe('detector sanity', () => {
  it('finds the secrets in an unredacted file', async () => {
    const { text } = await everything(await signPdf(await sample(), [], {}));
    expect(leaks(text, 'SECRET-123')).toBe(true);
    expect(leaks(text, 'PUBLIC-456')).toBe(true);
  });
});

describe('redaction', () => {
  it('removes the covered page content, form values, links and metadata from the file', async () => {
    const calls = [];
    const out = await signPdf(await sample(), [box], {}, { rasterize: fakeRasterize(calls) });
    const { text, doc } = await everything(out);
    for (const secret of ['SECRET-123', 'FIELDVALUE-789', 'SECRET-TITLE', 'SECRET-AUTHOR']) expect(leaks(text, secret), secret).toBe(false);
    expect(doc.getTitle() || '').not.toContain('SECRET');
    expect(doc.getAuthor() || '').not.toContain('SECRET');
    expect(doc.getForm().getFields()).toHaveLength(0);
    expect(doc.getPageCount()).toBe(2);
  });
  it('keeps pages that were not redacted, text included', async () => {
    const { text } = await everything(await signPdf(await sample(), [box], {}, { rasterize: fakeRasterize([]) }));
    expect(leaks(text, 'PUBLIC-456')).toBe(true);
  });
  it('leaves exactly two page objects, so no old page is hiding in the file', async () => {
    const { doc } = await everything(await signPdf(await sample(), [box], {}, { rasterize: fakeRasterize([]) }));
    const pages = [...doc.context.enumerateIndirectObjects()].filter(([, o]) => o instanceof PDFDict && o.get(PDFName.of('Type'))?.toString() === '/Page');
    expect(pages).toHaveLength(2);
  });
  it('turns the redacted page into one picture and keeps its size', async () => {
    const out = await signPdf(await sample(), [box], {}, { rasterize: fakeRasterize([]) });
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    const xobj = doc.getPage(0).node.Resources().lookupMaybe(PDFName.of('XObject'), PDFDict);
    expect(xobj.entries()).toHaveLength(1);
    const fonts = doc.getPage(0).node.Resources().lookupMaybe(PDFName.of('Font'), PDFDict);
    expect(fonts ? fonts.entries() : []).toHaveLength(0);
  });
  it('asks for only the redacted pages, with their boxes, and gives the renderer form-free bytes', async () => {
    const calls = [];
    await signPdf(await sample(), [box, { ...box, id: 'r2', x: 0.2 }], {}, { rasterize: fakeRasterize(calls) });
    expect(calls).toHaveLength(1);
    expect(calls[0].jobs).toHaveLength(1);
    expect(calls[0].jobs[0].page).toBe(0);
    expect(calls[0].jobs[0].rects).toHaveLength(2);
    expect((await PDFDocument.load(calls[0].bytes)).getForm().getFields()).toHaveLength(0);
  });
  it('swaps a rotated page for an upright picture the size it looks', async () => {
    const d = await PDFDocument.create();
    d.addPage([400, 600]).setRotation({ type: 'degrees', angle: 90 });
    const out = await signPdf(await d.save(), [box], {}, { rasterize: fakeRasterize([]) });
    const size = (await PDFDocument.load(out)).getPage(0).getSize();
    expect(size).toEqual({ width: 600, height: 400 });
  });
  it('still draws signatures on top of a redacted page', async () => {
    const sig = { id: 's', kind: 'signature', page: 0, x: 0.5, y: 0.8, width: 0.3, height: 0.1 };
    const out = await signPdf(await sample(), [box, sig], { signature: { mime: 'image/png', bytes: png } }, { rasterize: fakeRasterize([]) });
    const xobj = (await PDFDocument.load(out)).getPage(0).node.Resources().lookupMaybe(PDFName.of('XObject'), PDFDict);
    expect(xobj.entries()).toHaveLength(2); // the page picture and the signature
  });
  it('refuses to guess if it cannot render pages', async () => {
    await expect(signPdf(await sample(), [box], {})).rejects.toThrow(/page renderer/);
  });
  it('fails instead of leaving a page unredacted', async () => {
    await expect(signPdf(await sample(), [box], {}, { rasterize: async () => new Map() })).rejects.toThrow(/couldn't be redacted/);
  });
  it('does nothing special when there are no redactions', async () => {
    const calls = [];
    await signPdf(await sample(), [], {}, { rasterize: fakeRasterize(calls) });
    expect(calls).toHaveLength(0);
  });
  it('skips redactions on pages another file does not have, like any other item', async () => {
    const skipped = [];
    const d = await PDFDocument.create();
    d.addPage([200, 200]);
    await signPdf(await d.save(), [{ ...box, page: 5 }], {}, { skipped, rasterize: fakeRasterize([]) });
    expect(skipped).toHaveLength(1);
  });
});
