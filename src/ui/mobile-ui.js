// Phone layout behavior (< 640 px wide): the bottom toolbar, the bottom sheets
// for Date / Text / More, the Setup chip, and the Fine-tune toggle. On larger
// screens none of this is active and everything sits where it always did.
import { state, bus } from '../app/state.js';
import { addKind } from '../app/actions.js';
import { toast } from './announce.js';
import { $, $$ } from './dom.js';

const phone = window.matchMedia('(max-width: 639px)');
const app = $('#app');
const backdrop = $('#sheetBackdrop');
const SHEETS = { date: '#dateTool', text: '#textTool', more: '#moreSheet' };

let opener = null;
const moved = []; // { node, placeholder } for items living in the More sheet

// Rare options live in the More sheet on phones. Moving the real elements (not
// copies) keeps their ids and listeners; they go back when the screen widens.
function relocate(toSheet) {
  if (toSheet && !moved.length) {
    const body = $('#moreBody');
    const nodes = [$('.mark-buttons'), $('#flatten').closest('label'), $('#batch'), $('#batchInput'), $('#batchHint')];
    for (const node of nodes) {
      const placeholder = document.createComment('');
      node.before(placeholder);
      body.append(node);
      moved.push({ node, placeholder });
    }
  } else if (!toSheet) {
    for (const { node, placeholder } of moved.splice(0)) placeholder.replaceWith(node);
  }
}

function focusables(root) {
  return $$('input:not([hidden]), select, button:not([disabled]), [href]', root).filter((el) => el.offsetParent !== null);
}

function closeSheet(restoreFocus = true) {
  const name = app.dataset.sheet;
  if (!name) return;
  const sheet = $(SHEETS[name]);
  sheet.removeAttribute('role');
  sheet.removeAttribute('aria-modal');
  delete app.dataset.sheet;
  backdrop.hidden = true;
  if (opener) {
    opener.setAttribute('aria-expanded', 'false');
    if (restoreFocus) opener.focus();
    opener = null;
  }
}

function openSheet(name, trigger) {
  closeSheet(false);
  const sheet = $(SHEETS[name]);
  app.dataset.sheet = name;
  backdrop.hidden = false;
  opener = trigger;
  trigger.setAttribute('aria-expanded', 'true');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  const first = focusables(sheet).find((el) => !el.hasAttribute('data-sheet-close'));
  (first || sheet).focus();
}

function setSetup(open) {
  app.dataset.setup = open ? 'open' : 'closed';
  $('#setupToggle').setAttribute('aria-expanded', String(open));
}

function onBarClick(button) {
  const what = button.dataset.mb;
  if (what === 'signature' || what === 'initials') {
    if (!state.assets[what]) {
      // Explain instead of leaving a dead button: open Setup where the upload is.
      setSetup(true);
      $('#setupToggle').scrollIntoView({ block: 'start' });
      toast(`Upload your ${what} first.`);
      return;
    }
    addKind(what);
    return;
  }
  if (app.dataset.sheet === what) closeSheet();
  else openSheet(what, button);
}

function onKeyDown(e) {
  if (!app.dataset.sheet) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeSheet();
  } else if (e.key === 'Tab') {
    const items = focusables($(SHEETS[app.dataset.sheet]));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

export function initMobileUi() {
  $$('[data-mb]').forEach((b) => b.addEventListener('click', () => onBarClick(b)));
  $$('[data-sheet-close]').forEach((b) => b.addEventListener('click', () => closeSheet()));
  backdrop.addEventListener('click', () => closeSheet());
  document.addEventListener('keydown', onKeyDown);

  // Adding something is the end of the task: close the sheet to show the page.
  for (const sel of ['#addDate', '#addText']) $(sel).addEventListener('click', () => phone.matches && closeSheet());
  $('#moreBody').addEventListener('click', (e) => {
    if (e.target.closest('[data-stamp]')) closeSheet();
  });

  $('#setupToggle').addEventListener('click', () => setSetup(app.dataset.setup !== 'open'));
  $('#fineTune').addEventListener('click', () => {
    const tools = $('#selectionTools');
    const open = !tools.hasAttribute('data-open');
    tools.toggleAttribute('data-open', open);
    $('#fineTune').setAttribute('aria-expanded', String(open));
  });

  // Once a PDF is open the setup panels fold away, unless a signature is still needed.
  bus.on('document', () => {
    $('#setupName').textContent = state.fileName;
    setSetup(!state.assets.signature);
  });

  const apply = () => {
    if (phone.matches) relocate(true);
    else {
      closeSheet(false);
      relocate(false);
    }
  };
  phone.addEventListener('change', apply);
  apply();
}
