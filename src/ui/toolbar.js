// Add buttons plus the selection tools. The move and size buttons are the
// single-tap alternative to dragging that WCAG 2.5.7 requires.
import { state, placements, history, bus, KIND_LABEL } from '../app/state.js';
import { addKind, moveBy, resizeBy, rotateBy, setColor, remove, copyToAllPages, undo, redo, ROTATE_STEP } from '../app/actions.js';
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
  if (!p) return;
  $('#selectionName').textContent = `${KIND_LABEL[p.kind]} selected on page ${p.page + 1}`;
  $$('[data-color]').forEach((btn) => btn.setAttribute('aria-pressed', String((btn.dataset.color || null) === (p.color || null))));
}

function updateHistoryButtons() {
  $('#undo').disabled = !history.canUndo;
  $('#redo').disabled = !history.canRedo;
}

// Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z or Ctrl+Y redoes, except while typing in a field.
function onShortcut(e) {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) undo();
  else if ((key === 'z' && e.shiftKey) || key === 'y') redo();
  else return;
  e.preventDefault();
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
  $('#rotateLeft').addEventListener('click', () => state.selectedId && rotateBy(state.selectedId, -ROTATE_STEP));
  $('#rotateRight').addEventListener('click', () => state.selectedId && rotateBy(state.selectedId, ROTATE_STEP));
  $('#rotateReset').addEventListener('click', () => state.selectedId && rotateBy(state.selectedId, 0));
  $$('[data-color]').forEach((btn) =>
    btn.addEventListener('click', () => state.selectedId && setColor(state.selectedId, btn.dataset.color || null)),
  );
  $('#undo').addEventListener('click', undo);
  $('#redo').addEventListener('click', redo);
  document.addEventListener('keydown', onShortcut);
  history.subscribe(updateHistoryButtons);
  for (const id of ['#deleteSel', '#deleteSelMobile']) {
    $(id).addEventListener('click', () => state.selectedId && remove(state.selectedId));
  }
  $('#allPages').addEventListener('click', () => state.selectedId && copyToAllPages(state.selectedId));

  bus.on('assets', updateAddButtons);
  bus.on('document', updateAddButtons);
  bus.on('selection', updateSelection);
  placements.subscribe((e) => {
    if (e.type !== 'update') updateSummary(); // size only changes on add/remove/reset
    if (e.type === 'remove' || e.type === 'reset' || (e.type === 'update' && e.id === state.selectedId)) updateSelection();
  });

  updateAddButtons();
  updateSummary();
  updateHistoryButtons();
}
