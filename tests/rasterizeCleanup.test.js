// Regression: exporting with a redaction failed with "n.destroy is not a function"
// because pdf.js 6 documents have no destroy(); the loading task must be destroyed.
import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';

const fake = vi.hoisted(() => ({ doc: null }));
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', async (orig) => {
  const real = await orig();
  return {
    ...real,
    getDocument: (opts) => (fake.doc ? { promise: Promise.resolve(fake.doc) } : real.getDocument(opts)),
    GlobalWorkerOptions: {},
  };
});
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

describe('pdf.js document shape', () => {
  it('has no destroy() on the document, but does on its loading task', async () => {
    const bytes = await (async () => {
      const d = await PDFDocument.create();
      d.addPage([100, 100]);
      return d.save();
    })();
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    expect(typeof doc.destroy).toBe('undefined');
    expect(typeof doc.loadingTask.destroy).toBe('function');
    await doc.loadingTask.destroy();
  });
});

describe('rasterizePages cleanup', () => {
  it('destroys the loading task, with a document that has no destroy()', async () => {
    const destroy = vi.fn(async () => {});
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ fillRect() {}, set fillStyle(v) {} }),
      toBlob: (cb) => cb({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }),
    };
    const page = {
      getViewport: ({ scale }) => ({ width: 100 * scale, height: 100 * scale }),
      render: () => ({ promise: Promise.resolve() }),
    };
    const doc = { getPage: async () => page, loadingTask: { destroy } };
    vi.stubGlobal('document', { createElement: () => canvas });
    fake.doc = doc;
    const { rasterizePages } = await import('../src/ui/pdf-engine.js');
    const out = await rasterizePages(new Uint8Array([1]), [{ page: 0, rects: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }] }]);
    expect(out.get(0)).toBeInstanceOf(Uint8Array);
    expect(destroy).toHaveBeenCalledTimes(1);
    fake.doc = null;
    vi.unstubAllGlobals();
  });
});
