// The quick bar (Sign, Initials, Date, Text, More) and the Setup chip are used
// at every screen size, not just on phones. Date, Text and More open as sheets
// on phones and as centered cards on tablets and desktops.
import { describe, it, expect } from 'vitest';
import { read, parseHtml, all, byId, cssRules, effective, declaration, appliesAt } from './helpers/html.js';

const page = parseHtml(read('index.html'));
const nodes = all(page);
const rules = [...cssRules(read('src/styles/components.css')), ...cssRules(read('src/styles/layout.css'))];
const WIDTHS = { phone: 375, tablet: 800, desktop: 1280 };
const first = (cls) => nodes.find((n) => (n.attrs.class || '').split(/\s+/).includes(cls));

describe('quick bar at every size', () => {
  it.each(Object.entries(WIDTHS))('is shown on a %s (%ipx)', (_name, width) => {
    const display = effective(rules, first('quick-bar'), width, 'display');
    expect(display).not.toBeNull();
    expect(display).not.toBe('none');
  });

  it('has the five buttons', () => {
    const bar = first('quick-bar');
    const kinds = all(bar).filter((n) => 'data-qb' in n.attrs).map((n) => n.attrs['data-qb']);
    expect(kinds).toEqual(['signature', 'initials', 'date', 'text', 'more']);
  });

  it.each(Object.entries(WIDTHS))('replaces the old Add buttons on a %s (%ipx)', (_name, width) => {
    expect(effective(rules, first('add-buttons'), width, 'display')).toBe('none');
  });

  it.each(Object.entries(WIDTHS))('shows the Setup chip on a %s (%ipx) once a PDF is open', (_name, width) => {
    const chip = byId(page, 'setupToggle');
    const display = effective(rules.filter((r) => !/\[data-has-pdf='false'\]/.test(r.selector)), chip, width, 'display');
    expect(display).toBe('flex');
  });
});

describe('sidebar on desktop', () => {
  it('stretches the quick bar across the sidebar instead of centering it', () => {
    const panel = first('panel-actions');
    expect(effective(rules, panel, 1280, 'display')).toBe('flex');
    expect(effective(rules, panel, 1280, 'align-items')).toBe('stretch');
  });
});

describe('sheets at every size', () => {
  it.each(['dateTool', 'textTool', 'moreSheet'])('%s is hidden until opened, at every size', (id) => {
    const node = byId(page, id);
    for (const width of Object.values(WIDTHS)) {
      const closed = rules.filter((r) => !r.selector.includes('[data-sheet='));
      expect(effective(closed, node, width, 'display'), `${id} @${width}`).toBe('none');
    }
  });

  it.each(['dateTool', 'textTool', 'moreSheet'])('%s opens as a fixed overlay at every size', (id) => {
    const open = rules.filter((r) => r.selector.includes('[data-sheet=') && r.selector.endsWith(`#${id}`));
    expect(open.length).toBeGreaterThan(0);
    for (const width of Object.values(WIDTHS)) {
      const position = open.filter((r) => appliesAt(r.media, width)).map((r) => declaration(r.body, 'position')).filter(Boolean).pop();
      expect(position, `${id} @${width}`).toBe('fixed');
    }
  });

  it('slides up from the bottom on a phone and floats in the middle on larger screens', () => {
    const sheetRules = rules.filter((r) => r.selector.includes("[data-sheet='more'] #moreSheet"));
    const top = (w) => sheetRules.filter((r) => appliesAt(r.media, w)).map((r) => declaration(r.body, 'top')).filter(Boolean).pop();
    const bottom = (w) => sheetRules.filter((r) => appliesAt(r.media, w)).map((r) => declaration(r.body, 'bottom')).filter(Boolean).pop();
    expect(bottom(375)).toBe('0');
    expect(top(375)).toBeUndefined();
    for (const w of [800, 1280]) expect(top(w)).toBe('50%');
  });

  it('works the same way at every size: no script depends on a phone-width media query', () => {
    expect(read('src/ui/quick-bar.js')).not.toMatch(/matchMedia/);
  });
});

describe('page grid with the bar', () => {
  const areaSets = rules.filter((r) => r.selector.startsWith('.app') && declaration(r.body, 'grid-template-areas'));
  const names = (r) => [...new Set([...declaration(r.body, 'grid-template-areas').matchAll(/[a-z]+/g)].map((m) => m[0]))];
  const PANELS = ['chip', 'assets', 'pdf', 'editor', 'actions'];

  it('only places panels that exist, and none twice in separate blocks', () => {
    for (const r of areaSets) for (const name of names(r)) expect(PANELS, r.selector).toContain(name);
  });

  it.each([['tablet', 800], ['desktop', 1280]])('has a layout for every state on %s', (_n, width) => {
    const at = areaSets.filter((r) => appliesAt(r.media, width) && r.media);
    const selectors = at.map((r) => r.selector);
    expect(selectors.some((s) => /data-has-pdf='false'/.test(s))).toBe(true);
    expect(selectors.some((s) => /data-setup='closed'/.test(s))).toBe(true);
    expect(selectors.some((s) => s === '.app' || /data-setup='open'/.test(s))).toBe(true);
  });

  it('folds the sidebar to just the bar and the page once Setup is closed (desktop)', () => {
    const closed = areaSets.find((r) => r.media && /min-width:\s*1024px/.test(r.media) && /data-setup='closed'/.test(r.selector));
    expect(names(closed).sort()).toEqual(['actions', 'chip', 'editor']);
  });

  it('assigns the grid areas inside the tablet-and-up query so phones stack in page order', () => {
    const assigns = rules.filter((r) => /^\.panel-(assets|pdf|editor|actions)$/.test(r.selector) && declaration(r.body, 'grid-area'));
    expect(assigns.length).toBeGreaterThan(0);
    for (const r of assigns) expect(r.media, r.selector).toMatch(/min-width:\s*640px/);
  });
});
