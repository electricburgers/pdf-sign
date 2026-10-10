// Every way of changing a placement (drag, keyboard, tap buttons) goes
// through these functions, so behavior is identical across input methods.
import { clampRect } from '../lib/geometry.js';
import { resizePlacement, defaultPlacement, applyToAllPages } from '../lib/placements.js';
import { state, placements, aspectOpts, imageAspect, pageAspect, select, KIND_LABEL } from './state.js';
import { announce } from '../ui/announce.js';

export function addKind(kind) {
  if (!state.assets[kind] || !state.doc) return null;
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
  if (p) moveTo(id, { x: p.x + dx, y: p.y + dy });
}

export function resizeTo(id, width, base = placements.get(id)) {
  if (!base) return;
  const [next] = resizePlacement([base], id, width, aspectOpts(base.kind, base.page));
  placements.update(id, { x: next.x, y: next.y, width: next.width, height: next.height });
}

export function resizeBy(id, delta) {
  const p = placements.get(id);
  if (p) resizeTo(id, p.width + delta, p);
}

export function remove(id) {
  const p = placements.get(id);
  if (!p) return;
  placements.remove(id);
  if (state.selectedId === id) select(null);
  announce(`${KIND_LABEL[p.kind]} removed.`);
}

export function copyToAllPages(id) {
  const sel = placements.get(id);
  if (!sel) return;
  // Drop earlier identical copies so tapping twice doesn't stack duplicates. O(n).
  const kept = placements
    .all()
    .filter((p) => p.id === id || !(p.kind === sel.kind && p.x === sel.x && p.y === sel.y && p.width === sel.width));
  placements.replaceAll(
    applyToAllPages(kept, id, state.pageCount, { imageAspect: imageAspect(sel.kind), pageAspectOf: pageAspect }),
  );
  announce(`${KIND_LABEL[sel.kind]} copied to all ${state.pageCount} pages.`);
}

// Keep existing placements undistorted when an image is replaced.
export function refitKind(kind) {
  for (const p of placements.all()) if (p.kind === kind) resizeTo(p.id, p.width, p);
}

export function removeKind(kind) {
  for (const p of placements.all()) if (p.kind === kind) placements.remove(p.id);
  if (state.selectedId && !placements.get(state.selectedId)) select(null);
}
