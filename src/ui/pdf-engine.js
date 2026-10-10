// pdf.js wrapper: loading, page measurement and cancellable, cached rendering.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { createLru } from '../lib/lru.js';

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
  return { doc, aspects };
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
