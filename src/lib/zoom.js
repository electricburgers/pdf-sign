// Zoom and pan math for the page preview. The page is scaled from its top-left
// corner, so a view is { zoom, x, y } where x and y are the (negative) shift in
// CSS pixels. Points are CSS pixels relative to the page's unzoomed top-left.
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.5;

export const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(z) ? z : 1));

const round = (n) => Math.round(n * 1000) / 1000;

// Keeps the zoomed page covering the space the unzoomed page used, so you can
// never drag it away and lose it.
export function clampView(view, page) {
  const zoom = clampZoom(view.zoom);
  const x = Math.min(0, Math.max(page.width - page.width * zoom, view.x));
  const y = Math.min(0, Math.max(page.height - page.height * zoom, view.y));
  return { zoom: round(zoom), x: round(x), y: round(y) };
}

// Zoom to `zoom` keeping the page point under `anchor` where it is.
export function zoomAbout(view, zoom, anchor, page) {
  const z = clampZoom(zoom);
  const px = (anchor.x - view.x) / view.zoom;
  const py = (anchor.y - view.y) / view.zoom;
  return clampView({ zoom: z, x: anchor.x - px * z, y: anchor.y - py * z }, page);
}

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Two fingers: `start` is the view and finger positions when the pinch began,
// `now` the current finger positions. The content under the starting midpoint
// follows the current midpoint, scaled by how far the fingers moved apart.
export function pinchView(start, now, page) {
  const d0 = distance(start.a, start.b) || 1;
  const z = clampZoom(start.view.zoom * (distance(now.a, now.b) / d0));
  const c0 = midpoint(start.a, start.b);
  const c1 = midpoint(now.a, now.b);
  const px = (c0.x - start.view.x) / start.view.zoom;
  const py = (c0.y - start.view.y) / start.view.zoom;
  return clampView({ zoom: z, x: c1.x - px * z, y: c1.y - py * z }, page);
}

export const panView = (view, dx, dy, page) => clampView({ ...view, x: view.x + dx, y: view.y + dy }, page);

export const viewTransform = (view) => (view.zoom === 1 ? '' : `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`);
