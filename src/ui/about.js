/* global __APP_VERSION__, __APP_RELEASE_DATE__ */
import { $ } from './dom.js';

export function initAbout() {
  $('#appVersion').textContent = `v${__APP_VERSION__}`;
  const time = $('#appDate');
  time.dateTime = __APP_RELEASE_DATE__;
  time.textContent = __APP_RELEASE_DATE__;
}
