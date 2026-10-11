// Tablet (640-1023 px) and desktop (1024+ px) differences, checked against the
// stylesheets, plus the phone as the baseline they change.
import { describe, it, expect } from 'vitest';
import { read, cssRules, appliesAt, declaration } from './helpers/html.js';
import { BREAKPOINTS, layoutFor } from '../src/lib/layout.js';

const rules = [...cssRules(read('src/styles/components.css')), ...cssRules(read('src/styles/layout.css'))];
const PHONE = 375;
const TABLET = 800;
const DESKTOP = 1280;
const WIDE = 1600;

// Last value an exact selector gets for `prop` at a width (null if never set).
function val(selector, width, prop) {
  let v = null;
  for (const r of rules) {
    if (r.selector !== selector || !appliesAt(r.media, width)) continue;
    const d = declaration(r.body, prop);
    if (d !== null) v = d;
  }
  return v;
}
const areas = (selector, width) => (val(selector, width, 'grid-template-areas') || '').match(/[a-z]+/g) || [];
const unique = (list) => [...new Set(list)].sort();
const APP = '.app';
const NO_PDF = ".app[data-has-pdf='false']";
const OPEN = ".app[data-has-pdf='true'][data-setup='open']";
const CLOSED = ".app[data-has-pdf='true'][data-setup='closed']";
// A state's areas: its own template if it has one, else the plain .app template.
const stateAreas = (state, width) => {
  const own = state === NO_PDF || state === CLOSED ? areas(state, width) : [];
  return unique(own.length ? own : areas(APP, width));
};

describe('breakpoints', () => {
  it.each([
    [639, 'mobile'],
    [640, 'tablet'],
    [1023, 'tablet'],
    [1024, 'desktop'],
    [1439, 'desktop'],
    [2560, 'desktop'],
  ])('%ipx is %s', (width, name) => {
    expect(layoutFor(width)).toBe(name);
  });

  it('uses only breakpoints the scripts know about', () => {
    const mins = new Set();
    const maxes = new Set();
    for (const r of rules) {
      for (const m of (r.media || '').matchAll(/min-width:\s*(\d+)px/g)) mins.add(Number(m[1]));
      for (const m of (r.media || '').matchAll(/max-width:\s*(\d+)px/g)) maxes.add(Number(m[1]));
    }
    expect([...mins].sort((a, b) => a - b)).toEqual([BREAKPOINTS.tablet, BREAKPOINTS.desktop, 1440]);
    expect([...maxes].sort((a, b) => a - b)).toEqual([379, BREAKPOINTS.tablet - 1]);
  });
});

describe('page grid', () => {
  it('is one column on a phone, two on a tablet, and a fixed sidebar on a desktop', () => {
    expect(val(APP, PHONE, 'grid-template-columns')).toBe('minmax(0, 1fr)');
    expect(val(APP, TABLET, 'grid-template-columns')).toBe('minmax(0, 1.25fr) minmax(0, 1fr)');
    expect(val(APP, DESKTOP, 'grid-template-columns')).toBe('380px minmax(0, 1fr)');
  });

  it('gives very wide screens a slightly wider sidebar', () => {
    expect(val(APP, DESKTOP, 'grid-template-columns')).toBe('380px minmax(0, 1fr)');
    expect(val(APP, WIDE, 'grid-template-columns')).toBe('420px minmax(0, 1fr)');
  });

  it('adds more space around and between panels as the screen grows', () => {
    expect(val(APP, PHONE, 'gap')).toBe('12px');
    expect(val(APP, TABLET, 'gap')).toBe('16px');
    expect(val(APP, DESKTOP, 'gap')).toBe('20px');
    expect(val(APP, TABLET, 'padding')).toBe('20px 24px');
    expect(val(APP, DESKTOP, 'padding')).toBe('24px 32px');
  });

  it('pads panels more on a tablet and up than on a phone', () => {
    expect(val('.panel', PHONE, 'padding')).toBe('18px');
    expect(val('.panel', TABLET, 'padding')).toBe('22px');
  });

  it('has no named areas on a phone, so panels stack in page order', () => {
    expect(val(APP, PHONE, 'grid-template-areas')).toBeNull();
  });

  it.each([
    ['before a PDF is open', NO_PDF, TABLET, ['assets', 'pdf']],
    ['with Setup open', OPEN, TABLET, ['actions', 'assets', 'chip', 'editor', 'pdf']],
    ['with Setup closed', CLOSED, TABLET, ['actions', 'chip', 'editor']],
    ['before a PDF is open', NO_PDF, DESKTOP, ['assets', 'editor', 'pdf']],
    ['with Setup open', OPEN, DESKTOP, ['actions', 'assets', 'chip', 'editor', 'pdf']],
    ['with Setup closed', CLOSED, DESKTOP, ['actions', 'chip', 'editor']],
  ])('lays out the right panels %s at %ipx', (_label, state, width, expected) => {
    expect(stateAreas(state, width)).toEqual(expected);
  });

  it('keeps the page beside the sidebar on a desktop but under the setup on a tablet', () => {
    const tablet = (val(APP, TABLET, 'grid-template-areas') || '').match(/'[^']+'/g);
    const desktop = (val(APP, DESKTOP, 'grid-template-areas') || '').match(/'[^']+'/g);
    expect(tablet.find((row) => row.includes('editor'))).toBe("'editor editor'");
    expect(desktop.every((row) => row.includes('editor'))).toBe(true);
  });
});

describe('editor panel', () => {
  it('is hidden before a PDF on a tablet but shows an empty state on a desktop', () => {
    expect(val(`${NO_PDF} .panel-editor`, TABLET, 'display')).toBe('none');
    expect(val(`${NO_PDF} .panel-editor`, DESKTOP, 'display')).toBe('block');
  });

  it('sticks to the top of a desktop screen only', () => {
    expect(val('.panel-editor', PHONE, 'position')).toBeNull();
    expect(val('.panel-editor', TABLET, 'position')).toBeNull();
    expect(val('.panel-editor', DESKTOP, 'position')).toBe('sticky');
    expect(val('.panel-editor', DESKTOP, 'top')).toBe('84px');
  });

  it('fills the screen height only on a desktop', () => {
    expect(val('.panel-editor', TABLET, 'min-height')).toBeNull();
    expect(val('.panel-editor', DESKTOP, 'min-height')).toBe('calc(100dvh - 120px)');
  });
});

describe('tools panel', () => {
  it('is pinned to the bottom on a phone, then flows in the page', () => {
    expect(val('.panel-actions', PHONE, 'position')).toBe('sticky');
    expect(val('.panel-actions', TABLET, 'position')).toBe('static');
    expect(val('.panel-actions', DESKTOP, 'position')).toBe('static');
  });

  it('is a two-column grid on a tablet and a single column on a desktop', () => {
    expect(val('.panel-actions', TABLET, 'display')).toBe('grid');
    expect(val('.panel-actions', TABLET, 'grid-template-columns')).toBe('minmax(0, 1fr) minmax(220px, 300px)');
    expect(val('.panel-actions', DESKTOP, 'display')).toBe('flex');
    expect(val('.panel-actions', DESKTOP, 'flex-direction')).toBe('column');
  });

  it('lets the Download button sit beside the bar on a tablet and flow on a desktop', () => {
    expect(val('.panel-actions #download', TABLET, 'grid-column')).toBe('2');
    expect(val('.panel-actions #download', DESKTOP, 'grid-column')).toBe('auto');
  });

  it('shows the item count only from tablet up', () => {
    expect(val('.panel-actions .count', PHONE, 'display')).toBe('none');
    expect(val('.panel-actions .count', TABLET, 'display')).toBe('block');
  });

  it('lines the Fine-tune controls up at the start from tablet up', () => {
    expect(val('.tool-grid', PHONE, 'justify-content')).toBe('space-between');
    expect(val('.tool-grid', TABLET, 'justify-content')).toBe('flex-start');
  });

  it('drops the shadow and rounded top corners it has when pinned on a phone', () => {
    expect(val('.panel-actions', PHONE, 'box-shadow')).toMatch(/rgba/);
    expect(val('.panel-actions', TABLET, 'box-shadow')).toBe('none');
    expect(val('.panel-actions', TABLET, 'border-radius')).toBe('var(--radius-lg)');
  });
});

describe('quick bar', () => {
  it('is a row of five on every size, capped at 480px in the tablet tools panel', () => {
    for (const width of [PHONE, TABLET, DESKTOP]) expect(val('.quick-bar', width, 'grid-template-columns')).toBe('repeat(5, minmax(0, 1fr))');
    expect(val('.panel-actions .quick-bar', TABLET, 'max-width')).toBe('480px');
    expect(val('.panel-actions .quick-bar', DESKTOP, 'max-width')).toBe('none');
  });

  it('comes first in the desktop sidebar', () => {
    expect(val('.panel-actions .quick-bar', DESKTOP, 'order')).toBe('-1');
    expect(val('.panel-actions .quick-bar', TABLET, 'order')).toBeNull();
  });

  it('can stand at the side from tablet up, never on a phone', () => {
    const side = ".app[data-bar='vertical'] .stage-row > .quick-bar";
    expect(val(side, PHONE, 'width')).toBeNull();
    for (const width of [TABLET, DESKTOP]) {
      expect(val(side, width, 'width')).toBe('76px');
      expect(val(side, width, 'position')).toBe('sticky');
      expect(val(side, width, 'top')).toBe('96px');
    }
  });

  it('shows the Side bar toggle from tablet up', () => {
    expect(val('.bar-toggle', PHONE, 'display')).toBe('none');
    expect(val('.bar-toggle', TABLET, 'display')).toBe('inline-flex');
    expect(val('.bar-toggle', DESKTOP, 'display')).toBe('inline-flex');
  });
});

describe('sheets and messages', () => {
  const SHEET = "body[data-sheet='date'] #dateTool";

  it('slide up from the bottom on a phone and float centered from tablet up', () => {
    expect(val(SHEET, PHONE, 'bottom')).toBe('0');
    expect(val(SHEET, PHONE, 'width')).toBeNull();
    for (const width of [TABLET, DESKTOP]) {
      expect(val(SHEET, width, 'top')).toBe('50%');
      expect(val(SHEET, width, 'width')).toBe('min(92vw, 520px)');
      expect(val(SHEET, width, 'transform')).toBe('translate(-50%, -50%)');
    }
  });

  it('round all four corners when floating, only the top two when sliding up', () => {
    expect(val(SHEET, PHONE, 'border-radius')).toBe('var(--radius-lg) var(--radius-lg) 0 0');
    expect(val(SHEET, DESKTOP, 'border-radius')).toBe('var(--radius-lg)');
  });

  it('put toasts under the top bar on a phone only', () => {
    expect(val('.toast', PHONE, 'top')).toBe('calc(68px + env(safe-area-inset-top))');
    expect(val('.toast', TABLET, 'top')).toBeNull();
    expect(val('.toast', DESKTOP, 'bottom')).toBe('calc(20px + env(safe-area-inset-bottom))');
  });
});

describe('page preview size', () => {
  const src = read('src/ui/page-view.js');

  it('fits the page to the screen height on phones and desktops but not tablets', () => {
    expect(src).toMatch(/layout !== 'tablet'/);
  });

  it('leaves more room for chrome on a phone than on a desktop', () => {
    expect(src).toMatch(/layout === 'mobile' \? 340 : 240/);
  });

  it('allows a bigger preview on bigger screens', () => {
    expect(src).toMatch(/mobile: 1\.5, tablet: 1\.75, desktop: 2/);
  });
});
