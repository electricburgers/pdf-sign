// Draws placements over the current page and handles pointer + keyboard input.
// Performance: only the current page's placements are in the DOM (O(k) via the
// indexed store), a single moved placement updates only its own element
// (O(1)), and pointer moves are coalesced to one update per animation frame.
import { keyToAction } from '../lib/keyboard.js';
import { rafThrottle } from '../lib/schedule.js';
import { state, placements, bus, select, KIND_LABEL } from '../app/state.js';
import { moveTo, moveBy, resizeTo, resizeBy, remove } from '../app/actions.js';
import { $ } from './dom.js';

const elements = new Map(); // id -> element (current page only)

function styleElement(el, p) {
  el.style.left = `${p.x * 100}%`;
  el.style.top = `${p.y * 100}%`;
  el.style.width = `${p.width * 100}%`;
  el.style.height = `${p.height * 100}%`;
}

function createElement(p) {
  const el = document.createElement('div');
  el.className = 'placement';
  el.dataset.id = p.id;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-roledescription', 'movable image');
  el.setAttribute('aria-describedby', 'placementHelp');
  el.innerHTML = '<img alt=""><span class="handle" aria-hidden="true"></span>';
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('keydown', onKeyDown);
  el.addEventListener('focus', () => select(p.id));
  return el;
}

function sync(p) {
  let el = elements.get(p.id);
  if (!el) {
    el = createElement(p);
    $('#overlay').appendChild(el);
    elements.set(p.id, el);
  }
  const asset = p.image || state.assets[p.kind];
  const img = el.firstChild;
  if (asset && img.getAttribute('src') !== asset.dataUrl) img.src = asset.dataUrl;
  const what = p.text ? `${KIND_LABEL[p.kind]} "${p.text}"` : KIND_LABEL[p.kind];
  el.setAttribute('aria-label', `${what} on page ${p.page + 1}`);
  el.setAttribute('aria-pressed', String(p.id === state.selectedId));
  styleElement(el, p);
}

function renderPage() {
  const visible = placements.forPage(state.pageIndex);
  const keep = new Set(visible.map((p) => p.id));
  for (const [id, el] of elements) {
    if (!keep.has(id)) {
      el.remove();
      elements.delete(id);
    }
  }
  visible.forEach(sync);
}

function onPointerDown(e) {
  const el = e.currentTarget;
  const id = el.dataset.id;
  const start = placements.get(id);
  if (!start) return;
  e.preventDefault();
  select(id);
  el.focus({ preventScroll: true });
  el.setPointerCapture(e.pointerId);

  const resizing = e.target.classList.contains('handle');
  const sx = e.clientX;
  const sy = e.clientY;
  // Read once at the start; never read layout during the drag.
  const { width: W, height: H } = state.pageDisplay;

  const apply = rafThrottle((cx, cy) => {
    const dx = (cx - sx) / W;
    const dy = (cy - sy) / H;
    if (resizing) resizeTo(id, start.width + dx, start);
    else moveTo(id, { x: start.x + dx, y: start.y + dy });
  });
  const onMove = (ev) => apply(ev.clientX, ev.clientY);
  const onUp = (ev) => {
    apply.cancel(); // commit the final position directly instead of waiting a frame
    const dx = (ev.clientX - sx) / W;
    const dy = (ev.clientY - sy) / H;
    if (resizing) resizeTo(id, start.width + dx, start);
    else moveTo(id, { x: start.x + dx, y: start.y + dy });
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
  };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
}

function onKeyDown(e) {
  const id = e.currentTarget.dataset.id;
  const action = keyToAction(e);
  if (!action) return;
  e.preventDefault();
  if (action.type === 'move') moveBy(id, action.dx, action.dy);
  else if (action.type === 'resize') resizeBy(id, action.delta);
  else if (action.type === 'remove') {
    remove(id);
    $('#addSignature').focus();
  } else if (action.type === 'deselect') {
    select(null);
    e.currentTarget.blur();
  }
}

export function initPlacementLayer() {
  placements.subscribe((event) => {
    if (event.type === 'update') {
      const p = placements.get(event.id);
      if (p && p.page === state.pageIndex) sync(p); // O(1)
      return;
    }
    renderPage();
    if (event.type === 'add') {
      const el = elements.get(event.id);
      if (el) el.focus({ preventScroll: true });
    }
  });

  bus.on('page', renderPage);
  bus.on('assets', renderPage);
  bus.on('selection', () => {
    for (const [id, el] of elements) el.setAttribute('aria-pressed', String(id === state.selectedId));
  });

  // Tapping empty page space clears the selection.
  $('#overlay').addEventListener('pointerdown', (e) => {
    if (e.target.id === 'overlay') select(null);
  });
}
