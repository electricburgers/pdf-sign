// Turns the placements into what the exporter needs: decoded, right-sized images.
import { parseDataUrl } from '../lib/validate.js';
import { state, placements, effectiveImage } from '../app/state.js';
import { downscaleImage } from './image.js';

export async function buildExportItems() {
  const decoded = new Map(); // identical images share one decode and one embed
  const shrunk = new Map(); // source data URL -> shrunk image: one decode per distinct image, not per placement
  const items = [];
  for (const p of placements.all()) {
    if (p.kind === 'redact') {
      items.push({ ...p }); // a box, not a picture
      continue;
    }
    const source = effectiveImage(p);
    if (!source) throw new Error(`No ${p.kind} image has been added yet.`);
    let small = shrunk.get(source.dataUrl);
    if (!small) shrunk.set(source.dataUrl, (small = await downscaleImage(source)));
    if (!decoded.has(small.dataUrl)) decoded.set(small.dataUrl, parseDataUrl(small.dataUrl));
    items.push({ ...p, image: decoded.get(small.dataUrl), imageAspect: source.width / source.height });
  }
  return items;
}

// Turns pages into pictures with the redaction boxes burned in (see exportPdf.js).
export const rasterize = async (bytes, jobs) => (await import('./pdf-engine.js')).rasterizePages(bytes, jobs);
export const hasRedactions = () => placements.all().some((p) => p.kind === 'redact');

export const flattenWanted = () => document.querySelector('#flatten').checked;
export const currentFileName = () => state.fileName;
