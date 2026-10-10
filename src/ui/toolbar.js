// Add buttons plus the selection tools. The move and size buttons are the
// single-tap alternative to dragging that WCAG 2.5.7 requires.
import { state, placements, bus, KIND_LABEL } from '../app/state.js';
import { addKind, moveBy, resizeBy, remove, copyToAllPages } from '../app/actions.js';
import { $, $$ } from './dom.js';

const TAP_MOVE = 0.02; // fraction of the page per tap
const TAP_RESIZE = 0.02;
const NUDGE = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function updateAddButtons() {
  const ready = !!state.doc;
  $('#addSignature').disabled = !ready || !state.assets.signature;
  $('#addInitials').disabled = !ready || !state.assets.initials;
}

function updateSelection() {
  const p = state.selectedId && placements.get(state.selectedId);
  $('#selectionTools').hidden = !p;
  if (p) $('#selectionName').textContent = `${KIND_LABEL[p.kind]} selected on page ${p.page + 1}`;
}

function updateSummary() {
  const total = placements.size;
  const pages = placements.pagesUsed();
  $('#download').disabled = total === 0;
  $('#placeHint').hidden = total > 0;
  $('#count').textContent = total
    ? `${total} placed on ${pages} ${pages === 1 ? 'page' : 'pages'}`
    : 'Nothing placed yet';
}

export function initToolbar() {
  $('#addSignature').addEventListener('click', () => addKind('signature'));
  $('#addInitials').addEventListener('click', () => addKind('initials'));

  $$('[data-nudge]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [x, y] = NUDGE[btn.dataset.nudge];
      if (state.selectedId) moveBy(state.selectedId, x * TAP_MOVE, y * TAP_MOVE);
    });
  });
  $('#grow').addEventListener('click', () => state.selectedId && resizeBy(state.selectedId, TAP_RESIZE));
  $('#shrink').addEventListener('click', () => state.selectedId && resizeBy(state.selectedId, -TAP_RESIZE));
  $('#deleteSel').addEventListener('click', () => state.selectedId && remove(state.selectedId));
  $('#allPages').addEventListener('click', () => state.selectedId && copyToAllPages(state.selectedId));

  bus.on('assets', updateAddButtons);
  bus.on('document', updateAddButtons);
  bus.on('selection', updateSelection);
  placements.subscribe((e) => {
    if (e.type !== 'update') updateSummary(); // size only changes on add/remove/reset
    if (e.type === 'remove' || e.type === 'reset') updateSelection();
  });

  updateAddButtons();
  updateSummary();
}
