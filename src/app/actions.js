// Every way of changing a placement (drag, keyboard, tap buttons) goes
// through these functions, so behavior is identical across input methods.
// Each change records an undo step first.
import { clampRect } from '../lib/geometry.js';
import { resizePlacement, defaultPlacement, applyToAllPages } from '../lib/placements.js';
import { state, placements, history, aspectOpts, imageAspect, pageAspect, select, KIND_LABEL } from './state.js';
import { announce } from '../ui/announce.js';
import { tintImage } from '../ui/tint.js';

export const ROTATE_STEP = 15;

export function addKind(kind) {
  if (!state.assets[kind] || !state.doc) return null;
  history.record();
  const p = placements.add(defaultPlacement(kind, state.pageIndex, aspectOpts(kind)));
  select(p.id);
  announce(`${KIND_LABEL[kind]} added to page ${state.pageIndex + 1}.`);
  return p;
}

export function moveTo(id, rect) {
  const p = placements.get(id);
  if (!p) return;
  placements.update(id, clampRect({ x: rect.x, y: rect.y, width: p.width, height: p.height }));
}

export function moveBy(id, dx, dy) {
  const p = placements.get(id);
  if (!p) return;
  history.record(`move:${id}`);
  moveTo(id, { x: p.x + dx, y: p.y + dy });
}

export function resizeTo(id, width, base = placements.get(id)) {
  if (!base) return;
  const [next] = resizePlacement([base], id, width, aspectOpts(base, base.page));
  placements.update(id, { x: next.x, y: next.y, width: next.width, height: next.height });
}

export function resizeBy(id, delta) {
  const p = placements.get(id);
  if (!p) return;
  history.record(`size:${id}`);
  resizeTo(id, p.width + delta, p);
}

// Tilt by `deg` clockwise; 0 straightens. Kept within -180..180.
export function rotateBy(id, deg) {
  const p = placements.get(id);
  if (!p) return;
  history.record(`rotate:${id}`);
  const next = deg === 0 ? 0 : (((((p.rotation || 0) + deg + 180) % 360) + 360) % 360) - 180;
  placements.update(id, { rotation: next });
  announce(next === 0 ? `${KIND_LABEL[p.kind]} straightened.` : `${KIND_LABEL[p.kind]} rotated to ${next} degrees.`);
}

// color: a CSS color, or null to go back to the original look.
export async function setColor(id, color) {
  const p = placements.get(id);
  if (!p) return;
  const base = p.image || state.assets[p.kind];
  if (!base) return;
  if (!color) {
    history.record();
    placements.update(id, { color: null, tint: null });
    return;
  }
  const tint = await tintImage(base.dataUrl, color);
  if (!placements.get(id)) return; // removed while the image was being made
  history.record();
  placements.update(id, { color, tint });
}

export function remove(id) {
  const p = placements.get(id);
  if (!p) return;
  history.record();
  placements.remove(id);
  if (state.selectedId === id) select(null);
  announce(`${KIND_LABEL[p.kind]} removed.`);
}

export function copyToAllPages(id) {
  const sel = placements.get(id);
  if (!sel) return;
  history.record();
  // Drop earlier identical copies so tapping twice doesn't stack duplicates. O(n).
  const kept = placements
    .all()
    .filter((p) => p.id === id || !(p.kind === sel.kind && p.x === sel.x && p.y === sel.y && p.width === sel.width));
  placements.replaceAll(
    applyToAllPages(kept, id, state.pageCount, { imageAspect: imageAspect(sel), pageAspectOf: pageAspect }),
  );
  announce(`${KIND_LABEL[sel.kind]} copied to all ${state.pageCount} pages.`);
}

// Adds a rendered image (a date, free text or a stamp) as a placement.
export function addTextItem(kind, image, text, font, width) {
  if (!state.doc) return null;
  history.record();
  const p = placements.add(
    defaultPlacement(kind, state.pageIndex, aspectOpts(image), { image, text, font, width }),
  );
  select(p.id);
  announce(`${KIND_LABEL[kind]} added to page ${state.pageIndex + 1}.`);
  return p;
}

function afterHistoryChange(message) {
  if (state.selectedId && !placements.get(state.selectedId)) select(null);
  announce(message);
}

export function undo() {
  if (history.undo()) afterHistoryChange('Undone.');
  else announce('Nothing to undo.');
}

export function redo() {
  if (history.redo()) afterHistoryChange('Redone.');
  else announce('Nothing to redo.');
}

// Keep existing placements undistorted when an image is replaced. Recolored
// copies belong to the old image, so they are dropped.
export function refitKind(kind) {
  for (const p of placements.all()) {
    if (p.kind !== kind) continue;
    if (p.tint) placements.update(p.id, { color: null, tint: null });
    resizeTo(p.id, p.width, placements.get(p.id));
  }
}

export function removeKind(kind) {
  history.record();
  for (const p of placements.all()) if (p.kind === kind) placements.remove(p.id);
  if (state.selectedId && !placements.get(state.selectedId)) select(null);
}
