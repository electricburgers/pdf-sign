// On tablets and desktops the quick bar can stand on the side of the page
// (vertical) or sit above the tools (horizontal). Vertical is the default there.
// Phones always use the bottom bar.
import { describe, it, expect } from 'vitest';
import { read, parseHtml, all, byId, inside, cssRules, effective, declaration, appliesAt } from './helpers/html.js';
import { BAR_KEY, normalizeBarPref, nextBarPref } from '../src/lib/barPref.js';

const page = parseHtml(read('index.html'));
const rules = [...cssRules(read('src/styles/components.css')), ...cssRules(read('src/styles/layout.css'))];
const verticalRules = rules.filter((r) => r.selector.includes("[data-bar='vertical']"));

describe('bar position preference', () => {
  it('defaults to vertical and accepts only the two known values', () => {
    expect(normalizeBarPref(undefined)).toBe('vertical');
    expect(normalizeBarPref(null)).toBe('vertical');
    expect(normalizeBarPref('sideways')).toBe('vertical');
    expect(normalizeBarPref('horizontal')).toBe('horizontal');
    expect(normalizeBarPref('vertical')).toBe('vertical');
  });

  it('toggles between the two', () => {
    expect(nextBarPref('vertical')).toBe('horizontal');
    expect(nextBarPref('horizontal')).toBe('vertical');
    expect(nextBarPref('junk')).toBe('horizontal'); // junk reads as the default (vertical), so the next step is horizontal
  });

  it('is remembered under its own storage key', () => {
    expect(BAR_KEY).toBe('pdfsign:bar');
  });
});

describe('toggle button', () => {
  const toggle = byId(page, 'barToggle');

  it('lives in the editor bar and says what it does', () => {
    expect(toggle).not.toBeNull();
    expect(toggle.tag).toBe('button');
    expect(inside(toggle, all(page).find((n) => (n.attrs.class || '').split(/\s+/).includes('editor-bar')))).toBe(true);
    expect(toggle.attrs['aria-label']).toMatch(/side/i);
    expect(toggle.attrs['aria-pressed']).toBe('true');
  });

  it('is hidden on phones and shown on tablets and desktops', () => {
    expect(effective(rules, toggle, 375, 'display')).toBe('none');
    expect(effective(rules, toggle, 800, 'display')).not.toBe('none');
    expect(effective(rules, toggle, 1280, 'display')).not.toBe('none');
  });
});

describe('vertical layout', () => {
  it('starts as vertical and wraps the page in a row the bar can join', () => {
    expect(byId(page, 'app').attrs['data-bar']).toBe('vertical');
    const row = byId(page, 'stageRow');
    expect(row).not.toBeNull();
    expect(inside(byId(page, 'stage'), row)).toBe(true);
  });

  it('only applies from tablet width up, never on a phone', () => {
    expect(verticalRules.length).toBeGreaterThan(0);
    for (const r of verticalRules) expect(r.media, r.selector).toMatch(/min-width:\s*640px/);
    for (const r of verticalRules) expect(appliesAt(r.media, 375)).toBe(false);
  });

  it('stacks the buttons in one column and keeps the bar beside the page', () => {
    const bar = verticalRules.find((r) => /quick-bar$/.test(r.selector));
    expect(bar).toBeDefined();
    expect(declaration(bar.body, 'grid-template-columns')).toBe('minmax(0, 1fr)');
    const row = verticalRules.find((r) => /stage-row$/.test(r.selector));
    expect(declaration(row.body, 'display')).toBe('flex');
  });

  it('moves the bar with a script that uses the same 640px breakpoint', () => {
    const src = read('src/ui/bar-position.js');
    expect(src).toMatch(/min-width:\s*640px/);
    expect(src).toMatch(/BAR_KEY/);
  });
});
