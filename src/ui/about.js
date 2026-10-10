/* global __APP_VERSION__, __APP_RELEASE_DATE__, __APP_BUILD_TIME__ */
import changelog from '../../CHANGELOG.md?raw';
import { latestChanges } from '../lib/changelog.js';
import { $ } from './dom.js';

// __APP_RELEASE_DATE__ is an ISO timestamp with a UTC offset (see package.json).
export function initAbout() {
  $('#appVersion').textContent = `v${__APP_VERSION__}`;
  const time = $('#appDate');
  time.dateTime = __APP_RELEASE_DATE__;
  const when = new Date(__APP_RELEASE_DATE__);
  time.textContent = Number.isNaN(when.getTime())
    ? __APP_RELEASE_DATE__
    : when.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
  const built = $('#appBuild');
  built.dateTime = __APP_BUILD_TIME__;
  built.textContent = new Date(__APP_BUILD_TIME__).toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'long',
  });
  const root = $('#appChanges');
  for (const { heading, items } of latestChanges(changelog)) {
    const h = document.createElement('h4');
    h.textContent = heading;
    const ul = document.createElement('ul');
    for (const item of items) ul.append(Object.assign(document.createElement('li'), { textContent: item }));
    root.append(h, ul);
  }
}
