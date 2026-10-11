// Tablet and desktop: the quick bar can stand beside the page (vertical, the
// default) or stay above the tools (horizontal). The choice is remembered. On
// phones the bar always stays at the bottom, whatever the choice.
import { BAR_KEY, normalizeBarPref, nextBarPref } from '../lib/barPref.js';
import { storage } from '../app/state.js';
import { $ } from './dom.js';

const wide = window.matchMedia('(min-width: 640px)');

function read() {
  try {
    return normalizeBarPref(storage && storage.getItem(BAR_KEY));
  } catch {
    return 'vertical';
  }
}

export function initBarPosition() {
  const app = $('#app');
  const bar = $('.quick-bar');
  const toggle = $('#barToggle');
  const row = $('#stageRow');
  const home = document.createComment('quick bar home'); // where the bar sits when horizontal
  bar.before(home);
  let pref = read();

  const apply = () => {
    app.dataset.bar = pref;
    toggle.setAttribute('aria-pressed', String(pref === 'vertical'));
    // Beside the page only on wide screens; otherwise back with the tools.
    if (pref === 'vertical' && wide.matches) row.prepend(bar);
    else home.after(bar);
  };

  toggle.addEventListener('click', () => {
    pref = nextBarPref(pref);
    try {
      if (storage) storage.setItem(BAR_KEY, pref);
    } catch {
      /* not saved; still applied */
    }
    apply();
  });
  wide.addEventListener('change', apply);
  apply();
}
