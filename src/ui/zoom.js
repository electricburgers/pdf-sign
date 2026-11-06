// Pinch, wheel and button zoom for the page preview, and one-finger panning
// while zoomed in. The page is scaled with a CSS transform; the sharp, bigger
// bitmap is drawn once the gesture settles.
import { clampView, zoomAbout, pinchView, panView, viewTransform, ZOOM_STEP, MIN_ZOOM, MAX_ZOOM } from '../lib/zoom.js';
import { debounce } from '../lib/schedule.js';
import { state, bus } from '../app/state.js';
import { $ } from './dom.js';

let view = { zoom: 1, x: 0, y: 0 };

const pageBox = () => state.pageDisplay;

function apply(next) {
  view = clampView(next, pageBox());
  state.zoom = view.zoom;
  const page = $('#page');
  page.style.transformOrigin = '0 0';
  page.style.transform = viewTransform(view);
  $('#stage').classList.toggle('zoomed', view.zoom > 1);
  $('#zoomFit').textContent = `${Math.round(view.zoom * 100)}%`;
  $('#zoomOut').disabled = !state.doc || view.zoom <= MIN_ZOOM;
  $('#zoomIn').disabled = !state.doc || view.zoom >= MAX_ZOOM;
  $('#zoomFit').disabled = !state.doc || view.zoom === 1;
  settle();
}
const settle = debounce(() => bus.emit('zoomsettled'), 300);

export function resetView() {
  view = { zoom: 1, x: 0, y: 0 };
  state.zoom = 1;
  const page = $('#page');
  page.style.transform = '';
  $('#stage').classList.remove('zoomed');
  $('#zoomFit').textContent = '100%';
  $('#zoomOut').disabled = true;
  $('#zoomIn').disabled = !state.doc;
  $('#zoomFit').disabled = true;
  settle.cancel();
}

// Client pixels -> page pixels before zoom (the page scales from its corner).
function toPage(clientX, clientY) {
  const r = $('#page').getBoundingClientRect();
  return { x: clientX - (r.left - view.x), y: clientY - (r.top - view.y) };
}
const centre = () => ({ x: pageBox().width / 2, y: pageBox().height / 2 });

export function initZoom() {
  const stage = $('#stage');
  $('#zoomIn').addEventListener('click', () => apply(zoomAbout(view, view.zoom * ZOOM_STEP, centre(), pageBox())));
  $('#zoomOut').addEventListener('click', () => apply(zoomAbout(view, view.zoom / ZOOM_STEP, centre(), pageBox())));
  $('#zoomFit').addEventListener('click', () => apply({ zoom: 1, x: 0, y: 0 }));
  bus.on('document', () => {
    resetView();
  });

  // Trackpad pinch and Ctrl + wheel on desktops.
  stage.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey || !state.doc) return;
      e.preventDefault();
      apply(zoomAbout(view, view.zoom * Math.exp(-e.deltaY / 200), toPage(e.clientX, e.clientY), pageBox()));
    },
    { passive: false },
  );

  // Two fingers: pinch to zoom and drag to pan. One finger on a placement is
  // left alone so dragging an item still works.
  let pinch = null;
  const touchPoints = (e) => [0, 1].map((i) => toPage(e.touches[i].clientX, e.touches[i].clientY));
  stage.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 2 || !state.doc) return;
      const [a, b] = touchPoints(e);
      pinch = { view: { ...view }, a, b };
    },
    { passive: true },
  );
  stage.addEventListener(
    'touchmove',
    (e) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const [a, b] = touchPoints(e);
      apply(pinchView(pinch, { a, b }, pageBox()));
    },
    { passive: false },
  );
  const endPinch = (e) => {
    if (e.touches.length < 2) pinch = null;
  };
  stage.addEventListener('touchend', endPinch, { passive: true });
  stage.addEventListener('touchcancel', endPinch, { passive: true });

  // One finger or the mouse on empty page space pans while zoomed in.
  let pan = null;
  stage.addEventListener('pointerdown', (e) => {
    if (view.zoom <= 1 || e.target.closest('.placement, .field-hotspot') || (e.pointerType === 'touch' && pinch)) return;
    pan = { id: e.pointerId, x: e.clientX, y: e.clientY };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pan || e.pointerId !== pan.id || pinch) return;
    apply(panView(view, e.clientX - pan.x, e.clientY - pan.y, pageBox()));
    pan.x = e.clientX;
    pan.y = e.clientY;
  });
  const endPan = (e) => {
    if (pan && e.pointerId === pan.id) pan = null;
  };
  stage.addEventListener('pointerup', endPan);
  stage.addEventListener('pointercancel', endPan);
}
