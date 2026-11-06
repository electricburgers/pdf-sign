// Draws placements over the current page and handles pointer + keyboard input.
// Performance: only the current page's placements are in the DOM (O(k) via the
// indexed store), a single moved placement updates only its own element
// (O(1)), and pointer moves are coalesced to one update per animation frame.
import { keyToAction } from '../lib/keyboard.js';
import { rafThrottle } from '../lib/schedule.js';
import { state, placements, history, bus, select, effectiveImage, KIND_LABEL } from '../app/state.js';
import { moveTo, moveBy, resizeTo, resizeBy, remove } from '../app/actions.js';
import { showLoupe, hideLoupe } from './loupe.js';
import { $ } from './dom.js';

const elements = new Map(); // id -> element (current page only)

function styleElement(el, p) {
  el.style.left = `${p.x * 100}%`;
  el.style.top = `${p.y * 100}%`;
  el.style.width = `${p.width * 100}%`;
  el.style.height = `${p.height * 100}%`;
  el.style.transform = p.rotation ? `rotate(${p.rotation}deg)` : '';
  el.classList.toggle('handle-in', p.x + p.width > 0.9 || p.y + p.height > 0.9); // keep the resize dot on the page
  el.classList.toggle('grip-up', p.y + p.height > 0.78); // keep the grip on the page near the bottom edge
}

function createElement(p) {
  const el = document.createElement('div');
  el.className = 'placement';
  el.dataset.id = p.id;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-roledescription', 'movable image');
  el.setAttribute('aria-describedby', 'placementHelp');
  el.innerHTML = '<img alt=""><span class="handle" aria-hidden="true"></span><span class="grip" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
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
  const asset = effectiveImage(p);
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

  history.record(); // one undo step per drag
  const resizing = e.target.classList.contains('handle');
  if (resizing) el.classList.add('resizing'); // hide the grip and tint so the text stays visible
  const sx = e.clientX;
  const sy = e.clientY;
  // Read once at the start; never read layout during the drag.
  const { width: W, height: H } = state.pageDisplay;

  const apply = rafThrottle((cx, cy) => {
    const dx = (cx - sx) / W;
    const dy = (cy - sy) / H;
    if (resizing) resizeTo(id, start.width + dx, start);
    else moveTo(id, { x: start.x + dx, y: start.y + dy });
    showLoupe(placements.get(id), el.firstChild);
  });
  const onMove = (ev) => apply(ev.clientX, ev.clientY);
  const onUp = (ev) => {
    apply.cancel(); // commit the final position directly instead of waiting a frame
    const dx = (ev.clientX - sx) / W;
    const dy = (ev.clientY - sy) / H;
    if (resizing) resizeTo(id, start.width + dx, start);
    else moveTo(id, { x: start.x + dx, y: start.y + dy });
    const end = placements.get(id);
    if (end && end.x === start.x && end.y === start.y && end.width === start.width) history.drop(); // a tap, not a drag
    el.classList.remove('resizing');
    hideLoupe();
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
  // Only the previously and newly selected items change: O(1), not O(k).
  let shown = null;
  bus.on('selection', () => {
    const before = elements.get(shown);
    if (before) before.setAttribute('aria-pressed', 'false');
    shown = state.selectedId;
    const after = elements.get(shown);
    if (after) after.setAttribute('aria-pressed', 'true');
  });

  // Tapping empty page space clears the selection.
  $('#overlay').addEventListener('pointerdown', (e) => {
    if (e.target.id === 'overlay') select(null);
  });
}
