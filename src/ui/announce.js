// Visual toast plus screen-reader live regions. The toast itself is
// aria-hidden; announcements go through dedicated status/alert regions so
// they are read reliably (WCAG 4.1.3 Status Messages).
import { $ } from './dom.js';

let toastTimer;

function speak(region, message) {
  const el = $(region);
  if (!el) return;
  el.textContent = '';
  // A fresh text node on the next frame makes repeat messages re-announce.
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

export function announce(message) {
  speak('#liveStatus', message);
}

export function toast(message, { error = false } = {}) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('error', error);
  el.hidden = false;
  speak(error ? '#liveAlert' : '#liveStatus', message);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), error ? 6000 : 3000);
}
