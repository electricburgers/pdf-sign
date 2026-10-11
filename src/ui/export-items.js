// Turns the placements into what the exporter needs: decoded, right-sized images.
import { parseDataUrl } from '../lib/validate.js';
import { state, placements, effectiveImage } from '../app/state.js';
import { downscaleImage } from './image.js';

export async function buildExportItems() {
  const decoded = new Map(); // identical images share one decode and one embed
  const items = [];
  for (const p of placements.all()) {
    const source = effectiveImage(p);
    if (!source) throw new Error(`No ${p.kind} image has been added yet.`);
    const small = await downscaleImage(source);
    if (!decoded.has(small.dataUrl)) decoded.set(small.dataUrl, parseDataUrl(small.dataUrl));
    items.push({ ...p, image: decoded.get(small.dataUrl), imageAspect: source.width / source.height });
  }
  return items;
}

export const flattenWanted = () => document.querySelector('#flatten').checked;
export const currentFileName = () => state.fileName;
