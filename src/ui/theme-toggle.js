import { applyTheme, nextThemePref, normalizeThemePref } from '../lib/theme.js';
import { storage } from '../app/state.js';
import { $ } from './dom.js';

const KEY = 'pdfsign:theme';
const LABEL = { system: 'Auto', light: 'Light', dark: 'Dark' };

function read() {
  try {
    return normalizeThemePref(storage && storage.getItem(KEY));
  } catch {
    return 'system';
  }
}

function set(pref) {
  const p = applyTheme(document, pref);
  try {
    if (storage) storage.setItem(KEY, p);
  } catch {
    /* not saved; still applied */
  }
  const btn = $('#themeBtn');
  btn.dataset.pref = p;
  $('#themeLabel').textContent = `Theme: ${LABEL[p]}`;
}

export function initThemeToggle() {
  set(read());
  $('#themeBtn').addEventListener('click', () => set(nextThemePref($('#themeBtn').dataset.pref)));
}
