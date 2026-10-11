// Placements are stored as fractions (0..1) of the displayed page so they are
// independent of zoom level. List operations are immutable.
import { clampRect } from './geometry.js';

export const KINDS = ['signature', 'initials', 'date', 'text', 'stamp'];
export const MIN_WIDTH = 0.03;
const DEFAULT_WIDTH = { signature: 0.35, initials: 0.12, stamp: 0.04 };
const DEFAULT_Y = { signature: 0.78, initials: 0.88, date: 0.7, text: 0.6, stamp: 0.5 };

let counter = 0;
function newId() {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `p${Date.now().toString(36)}${counter}${rand}`;
}

// Dates, text and stamps also carry their own rendered `image` ({ dataUrl,
// width, height }) plus the `text` and `font` it was made from. Any placement
// can have a `rotation` (clockwise degrees) and a `color`; when a color is set,
// `tint` holds the recolored copy of the image.
export function createPlacement({ kind, page, x, y, width, height, text, font, image, rotation, color, tint }) {
  if (!KINDS.includes(kind)) throw new Error(`Unknown placement kind: ${kind}`);
  if (!Number.isInteger(page) || page < 0) throw new Error(`Invalid page index: ${page}`);
  const extra = image ? { text, font, image } : {};
  if (rotation) extra.rotation = rotation;
  if (color && tint) Object.assign(extra, { color, tint });
  return { id: newId(), kind, page, ...clampRect({ x, y, width, height }), ...extra };
}

export function addPlacement(list, placement) {
  return [...list, placement];
}

export function removePlacement(list, id) {
  return list.filter((p) => p.id !== id);
}

export function updatePlacement(list, id, patch) {
  return list.map((p) => (p.id === id ? { ...p, ...patch, id: p.id } : p));
}

export function placementsForPage(list, page) {
  return list.filter((p) => p.page === page);
}

export function movePlacement(list, id, dx, dy) {
  return list.map((p) => {
    if (p.id !== id) return p;
    return { ...p, ...clampRect({ x: p.x + dx, y: p.y + dy, width: p.width, height: p.height }) };
  });
}

// Height fraction for a given width fraction so the image keeps its aspect.
// imageAspect = imgW / imgH; pageAspect = pageDisplayW / pageDisplayH.
export function heightFor(width, { imageAspect, pageAspect }) {
  return (width * pageAspect) / imageAspect;
}

export function resizePlacement(list, id, width, opts) {
  return list.map((p) => {
    if (p.id !== id) return p;
    let w = Math.max(width, MIN_WIDTH);
    w = Math.min(w, 1 - p.x);
    let h = heightFor(w, opts);
    if (p.y + h > 1) {
      h = 1 - p.y;
      w = (h * opts.imageAspect) / opts.pageAspect;
    }
    return { ...p, width: w, height: h };
  });
}

export function defaultPlacement(kind, page, opts, extra = {}) {
  const { width: customWidth, ...rest } = extra;
  const width = customWidth ?? DEFAULT_WIDTH[kind];
  const height = heightFor(width, opts);
  return createPlacement({
    ...rest,
    kind,
    page,
    x: 0.5 - width / 2,
    y: Math.min(DEFAULT_Y[kind], 1 - height),
    width,
    height,
  });
}

// Copies a placement onto every other page. With `imageAspect` and
// `pageAspectOf(page)`, the height is recomputed per page so the image is not
// stretched on pages of a different shape (e.g. a rotated landscape page).
export function applyToAllPages(list, id, pageCount, { imageAspect, pageAspectOf } = {}) {
  const source = list.find((p) => p.id === id);
  if (!source) return list;
  const copies = [];
  for (let page = 0; page < pageCount; page += 1) {
    if (page === source.page) continue;
    const { id: _ignored, ...rest } = source;
    let { width, height } = rest;
    if (imageAspect && pageAspectOf) {
      const pageAspect = pageAspectOf(page);
      height = heightFor(width, { imageAspect, pageAspect });
      if (height > 1) {
        height = 1;
        width = (height * imageAspect) / pageAspect;
      }
    }
    copies.push(createPlacement({ ...rest, page, width, height }));
  }
  return [...list, ...copies];
}
