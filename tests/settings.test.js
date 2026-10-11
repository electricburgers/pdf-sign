// The About text, release notes, disclaimer and theme switch live in a settings
// dialog opened by a gear button in the top bar.
import { describe, it, expect } from 'vitest';
import { read, parseHtml, byId, all, ancestors, inside, textOf } from './helpers/html.js';

const page = parseHtml(read('index.html'));
const header = all(page).find((n) => n.tag === 'header');
const dialog = byId(page, 'settings');

describe('settings', () => {
  it('has a gear button in the top bar that opens the settings dialog', () => {
    const button = byId(page, 'settingsBtn');
    expect(button).not.toBeNull();
    expect(inside(button, header)).toBe(true);
    expect(button.tag).toBe('button');
    expect(button.attrs['aria-label']).toMatch(/settings/i);
    expect(button.attrs['aria-haspopup']).toBe('dialog');
    expect(button.attrs['aria-controls']).toBe('settings');
  });

  it('uses a native dialog that is named by its heading', () => {
    expect(dialog).not.toBeNull();
    expect(dialog.tag).toBe('dialog');
    const heading = byId(page, dialog.attrs['aria-labelledby']);
    expect(heading).not.toBeNull();
    expect(inside(heading, dialog)).toBe(true);
    expect(textOf(heading)).toMatch(/settings/i);
  });

  it('moves the theme switch out of the top bar and into settings', () => {
    const theme = byId(page, 'themeBtn');
    expect(theme).not.toBeNull();
    expect(inside(theme, dialog)).toBe(true);
    expect(inside(theme, header)).toBe(false);
  });

  it.each(['appVersion', 'appDate', 'appBuild', 'appChanges'])('shows %s inside settings', (id) => {
    const el = byId(page, id);
    expect(el, id).not.toBeNull();
    expect(inside(el, dialog)).toBe(true);
  });

  it('includes the privacy note and the Claude disclaimer in settings', () => {
    const text = textOf(dialog);
    expect(text).toMatch(/never leave this device/i);
    expect(text).toMatch(/Built with Claude/);
    expect(text).toMatch(/Anthropic/);
  });

  it('no longer has an About footer on the page', () => {
    const outside = all(page).filter((n) => !inside(n, dialog) && n !== dialog);
    expect(outside.some((n) => n.tag === 'footer')).toBe(false);
    expect(outside.some((n) => n.attrs.id === 'aboutTitle')).toBe(false);
    expect(outside.some((n) => /disclaimer/.test(n.attrs.class || ''))).toBe(false);
  });

  it('has a Done button to close the dialog', () => {
    const done = all(dialog).find((n) => 'data-settings-close' in n.attrs);
    expect(done).toBeDefined();
    expect(done.tag).toBe('button');
  });

  it('keeps the gear button out of the dialog itself', () => {
    expect(ancestors(byId(page, 'settingsBtn')).includes(dialog)).toBe(false);
  });
});
