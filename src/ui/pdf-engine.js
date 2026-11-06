// pdf.js wrapper: loading, page measurement and cancellable, cached rendering.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { createLru } from '../lib/lru.js';
import { fieldFractions } from '../lib/fields.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const MAX_CANVAS_PIXELS = 4_000_000; // stay well under iOS Safari's canvas limits

// Up to 3 rendered pages are kept so flipping back and forth is instant.
// Evicted canvases are shrunk to 0×0, which releases their memory right away.
const cache = createLru(3, (canvas) => {
  canvas.width = 0;
  canvas.height = 0;
});

export async function loadDocument(bytes) {
  // pdf.js transfers (detaches) the buffer it gets, so hand it a copy.
  const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
  // Measure every page concurrently instead of one after another.
  const aspects = await Promise.all(
    Array.from({ length: doc.numPages }, async (_, i) => {
      const vp = (await doc.getPage(i + 1)).getViewport({ scale: 1 });
      return vp.width / vp.height;
    }),
  );
  cache.clear();
  fieldCache.clear();
  return { doc, aspects };
}

const fieldCache = new Map(); // page index -> fields (read once per page)

// Fillable text and signature fields on a page, as fractions of the displayed page.
export async function pageFields(doc, index) {
  if (fieldCache.has(index)) return fieldCache.get(index);
  const page = await doc.getPage(index + 1);
  const vp = page.getViewport({ scale: 1 });
  const annotations = await page.getAnnotations({ intent: 'display' });
  const fields = annotations
    .filter((a) => a.subtype === 'Widget' && a.rect && !a.readOnly && (a.fieldType === 'Tx' || a.fieldType === 'Sig'))
    .map((a) => ({
      name: a.fieldName || '',
      type: a.fieldType,
      rect: fieldFractions(vp.convertToViewportRectangle(a.rect), vp.width, vp.height),
    }))
    .filter((f) => f.rect.width > 0.005 && f.rect.height > 0.005);
  fieldCache.set(index, fields);
  return fields;
}

// Pictures of pages with black boxes burned in, for redaction. `bytes` is a PDF
// whose form fields are already baked in; rects are fractions of the displayed page.
// Rendered big enough to stay sharp (about 240 dpi) within the canvas limits.
const RASTER_SCALE = 3.3;
const MAX_RASTER_PIXELS = 12_000_000;

export async function rasterizePages(bytes, jobs) {
  const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
  const out = new Map();
  try {
    for (const { page: index, rects } of jobs) {
      const page = await doc.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(RASTER_SCALE, Math.sqrt(MAX_RASTER_PIXELS / (base.width * base.height)));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      ctx.fillStyle = '#000000';
      for (const r of rects) {
        // Round outward by a pixel so no sliver of the original shows at an edge.
        const x = Math.floor(r.x * canvas.width) - 1;
        const y = Math.floor(r.y * canvas.height) - 1;
        ctx.fillRect(x, y, Math.ceil(r.width * canvas.width) + 3, Math.ceil(r.height * canvas.height) + 3);
      }
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error(`Page ${index + 1} couldn't be redacted.`);
      out.set(index, new Uint8Array(await blob.arrayBuffer()));
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await doc.loadingTask.destroy();
  }
  return out;
}

export async function pageSize(doc, index) {
  const vp = (await doc.getPage(index + 1)).getViewport({ scale: 1 });
  return { width: vp.width, height: vp.height };
}

let active = null; // { key, task }

function pixelScaleFor(size, cssScale) {
  let scale = cssScale * (globalThis.devicePixelRatio || 1);
  const pixels = size.width * size.height * scale * scale;
  if (pixels > MAX_CANVAS_PIXELS) scale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);
  return Math.round(scale * 1000) / 1000;
}

// Renders page `index` at `cssScale` and resolves with a canvas, or null if
// a newer render superseded this one. Cached pages return immediately.
export async function renderPage(doc, index, cssScale, size) {
  const pixelScale = pixelScaleFor(size, cssScale);
  const key = `${index}@${pixelScale}`;
  const cached = cache.get(key);
  if (cached) return cached;

  // A different page is wanted now: stop the old render instead of letting
  // renders queue up and freeze the UI.
  if (active && active.key !== key) active.task.cancel();

  const page = await doc.getPage(index + 1);
  const viewport = page.getViewport({ scale: pixelScale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const task = page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport });
  active = { key, task };
  try {
    await task.promise;
  } catch (err) {
    canvas.width = 0;
    canvas.height = 0;
    if (err && err.name === 'RenderingCancelledException') return null;
    throw err;
  } finally {
    if (active && active.task === task) active = null;
  }
  cache.set(key, canvas);
  return canvas;
}
