// Regression: on the installed iPhone app, tapping an option in the "More"
// sheet only dimmed and dismissed it. The sheet lived inside the pinned bottom
// panel (position: sticky), which is its own stacking context, so the dimming
// backdrop (z-index 25) sat on top of the sheet (z-index 30 inside the panel).
// Taps hit the backdrop instead of the buttons.
import { describe, it, expect } from 'vitest';
import { read, parseHtml, byId, ancestors, all, classes, cssRules, appliesOnPhone, appliesAt, matches, declaration, createsStackingContext } from './helpers/html.js';

const page = parseHtml(read('index.html'));
const allRules = [...cssRules(read('src/styles/components.css')), ...cssRules(read('src/styles/layout.css'))];
const rules = allRules.filter((r) => appliesOnPhone(r.media));
const SHEETS = ['moreSheet', 'dateTool', 'textTool'];
const WIDTHS = [375, 800, 1280]; // phone, tablet, desktop

// The sticky editor on desktop is a stacking context too, so check every size.
const stackingAncestors = (node, width = 375) =>
  ancestors(node).filter((a) => allRules.some((r) => appliesAt(r.media, width) && matches(r.selector, a) && createsStackingContext(r.body)));

describe('bottom sheets on phones', () => {
  it('finds the sheets and the backdrop in the page', () => {
    for (const id of [...SHEETS, 'sheetBackdrop']) expect(byId(page, id), id).not.toBeNull();
  });

  it.each(SHEETS.flatMap((id) => WIDTHS.map((w) => [id, w])))('%s is not inside an element that creates a stacking context at %ipx', (id, width) => {
    const culprits = stackingAncestors(byId(page, id), width).map((a) => `${a.tag}.${classes(a).join('.')}`);
    expect(culprits).toEqual([]);
  });

  it('the sheets are positioned above the backdrop', () => {
    const z = (sel) => {
      const rule = rules.filter((r) => r.selector.endsWith(sel)).map((r) => declaration(r.body, 'z-index')).filter(Boolean).pop();
      return Number(rule);
    };
    const backdrop = z('.sheet-backdrop');
    expect(backdrop).toBeGreaterThan(0);
    for (const sel of ['#dateTool', '#textTool', '#moreSheet']) expect(z(sel)).toBeGreaterThan(backdrop);
  });

  it('the backdrop is a direct child of the page body, not nested in a panel', () => {
    expect(byId(page, 'sheetBackdrop').parent.tag).toBe('body');
  });

  it('every sheet has a Done button', () => {
    for (const id of SHEETS) {
      const sheet = byId(page, id);
      const closers = all(sheet).filter((n) => 'data-sheet-close' in n.attrs);
      expect(closers.length, id).toBeGreaterThan(0);
    }
  });

  it('every "sheet is open" rule can match: its scope element is an ancestor of the sheet', () => {
    // Moving #moreSheet out of .app left `.app[data-sheet='more'] #moreSheet` matching nothing.
    const open = rules.filter((r) => r.selector.includes('[data-sheet='));
    expect(open.length).toBeGreaterThan(0);
    for (const r of open) {
      const parts = r.selector.split(/\s+/);
      const scope = parts[0];
      const target = all(page).find((n) => matches(r.selector, n) && n.attrs.id);
      expect(target, r.selector).toBeDefined();
      const hostsScope = [target, ...ancestors(target)].slice(1).some((n) => matches(scope.replace(/\[data-sheet=[^\]]*\]/, ''), n));
      expect(hostsScope, r.selector).toBe(true);
    }
  });

  it('the stacking-context detector recognises the old bug', () => {
    expect(createsStackingContext('position: sticky; bottom: 0; z-index: 10')).toBe(true);
    expect(createsStackingContext('padding: 4px')).toBe(false);
    expect(createsStackingContext('position: relative')).toBe(false);
    expect(createsStackingContext('position: relative; z-index: 2')).toBe(true);
    expect(createsStackingContext('transform: translateY(0)')).toBe(true);
  });
});
