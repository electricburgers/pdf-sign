// Shared application state and a tiny event bus. Components read state and
// listen for events; they never reach into each other's DOM.
import { createPlacementStore } from '../lib/placementStore.js';
import { createHistory } from '../lib/history.js';
import { createAssetStore, safeLocalStorage } from '../lib/storage.js';

export const storage = safeLocalStorage();
export const assetStore = createAssetStore(storage);
export const placements = createPlacementStore();
export const history = createHistory(placements);

export const state = {
  assets: { signature: null, initials: null }, // { dataUrl, width, height }
  doc: null, // pdf.js document
  pdfBytes: null,
  fileName: 'document.pdf',
  pageCount: 0,
  pageIndex: 0,
  pageAspects: [], // displayed width / height for every page (rotation applied)
  pageDisplay: { width: 1, height: 1 }, // CSS px of the current preview
  selectedId: null,
};

const listeners = new Map();
export const bus = {
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event).delete(fn);
  },
  emit(event, payload) {
    (listeners.get(event) || []).forEach((fn) => fn(payload));
  },
};

export const KIND_LABEL = { signature: 'Signature', initials: 'Initials', date: 'Date', text: 'Text', stamp: 'Mark' };

// The image to show and export for a placement: its recolored copy if it has
// one, else its own rendered image, else the saved signature/initials.
export function effectiveImage(p) {
  return p.tint || p.image || state.assets[p.kind];
}

// Accepts a kind name or a placement (dates carry their own image).
export function imageAspect(target) {
  const a = (target && target.image) || state.assets[target && target.kind ? target.kind : target];
  return a ? a.width / a.height : 3;
}

export function pageAspect(page) {
  return state.pageAspects[page] || state.pageDisplay.width / state.pageDisplay.height;
}

export function aspectOpts(target, page = state.pageIndex) {
  return { imageAspect: imageAspect(target), pageAspect: pageAspect(page) };
}

export function select(id) {
  if (state.selectedId === id) return;
  state.selectedId = id;
  bus.emit('selection', id);
}
