// Settings dialog: opened by the gear in the top bar. It is a native <dialog>,
// so it gets focus trapping, Escape to close, and the top layer (no stacking
// problems) for free.
import { $ } from './dom.js';

export function initSettings() {
  const dialog = $('#settings');
  const open = () => {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };
  const close = () => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  };
  $('#settingsBtn').addEventListener('click', open);
  $('[data-settings-close]', dialog).addEventListener('click', close);
  // A tap on the dimmed area (the dialog element itself, outside its content) closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
}
