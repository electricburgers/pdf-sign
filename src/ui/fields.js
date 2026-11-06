// Form fields: shows the fillable fields of the current page and drops your
// signature, initials or today's date straight into the one you tap.
import { guessKind, fitInto } from '../lib/fields.js';
import { defaultDateText, defaultDateWidth, DEFAULT_DATE_FONT } from '../lib/dateText.js';
import { state, bus, placements as store, history, select, pageAspect } from '../app/state.js';
import { createPlacement } from '../lib/placements.js';
import { announce, toast } from './announce.js';
import { renderText } from './text-render.js';
import { $ } from './dom.js';

const LABEL = { signature: 'signature', initials: 'initials', date: 'date' };
let on = false;
let token = 0;

async function imageFor(kind) {
  if (kind === 'date') return renderText(defaultDateText(), DEFAULT_DATE_FONT);
  return state.assets[kind];
}

async function fill(field, kind) {
  const image = await imageFor(kind);
  if (!image) {
    toast(`Add your ${LABEL[kind]} first (Setup).`, { error: true });
    return;
  }
  const aspect = image.width / image.height;
  const rect = fitInto(field.rect, aspect, pageAspect(state.pageIndex));
  history.record();
  const extra = kind === 'date' ? { image, text: defaultDateText(), font: DEFAULT_DATE_FONT } : {};
  const p = store.add(createPlacement({ kind, page: state.pageIndex, ...rect, ...extra }));
  select(p.id);
  announce(`${LABEL[kind]} added to the field on page ${state.pageIndex + 1}.`);
}

async function draw() {
  const layer = $('#fieldLayer');
  const my = ++token;
  layer.replaceChildren();
  if (!on || !state.doc) return;
  const { pageFields } = await import('./pdf-engine.js');
  const fields = await pageFields(state.doc, state.pageIndex);
  if (my !== token) return; // page changed while reading
  if (!fields.length) {
    toast('No form fields on this page.');
    return;
  }
  for (const field of fields) {
    const kind = guessKind(field);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'field-hotspot';
    b.style.left = `${field.rect.x * 100}%`;
    b.style.top = `${field.rect.y * 100}%`;
    b.style.width = `${field.rect.width * 100}%`;
    b.style.height = `${field.rect.height * 100}%`;
    b.setAttribute('aria-label', `Put ${LABEL[kind]} in field ${field.name || 'without a name'}`);
    b.title = `Put ${LABEL[kind]} here`;
    b.addEventListener('click', () => fill(field, kind));
    layer.append(b);
  }
}

export function initFields() {
  const button = $('#toggleFields');
  const update = () => {
    button.disabled = !state.doc;
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? 'Hide form fields' : 'Show form fields';
  };
  button.addEventListener('click', () => {
    on = !on;
    update();
    draw();
  });
  bus.on('document', () => {
    on = false;
    update();
    draw();
  });
  bus.on('page', () => on && draw());
  update();
}
