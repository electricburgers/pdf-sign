// The date dialog: a live preview on top, a date field with a Today shortcut,
// format and font chips, and one Add button. (The old second text box that
// repeated the date is gone; Free text covers anything custom.)
import { describe, it, expect } from 'vitest';
import { read, parseHtml, all, byId, inside, classes, cssRules, declaration, textOf } from './helpers/html.js';
import { DATE_FORMATS, DATE_FONTS, formatDate, parseDateInput, dateFromInputValue, normalizeDatePrefs, DEFAULT_DATE_FONT } from '../src/lib/dateText.js';

const page = parseHtml(read('index.html'));
const dialog = byId(page, 'dateTool');
const inDialog = (pred) => all(dialog).filter(pred);
const rules = [...cssRules(read('src/styles/components.css')), ...cssRules(read('src/styles/layout.css'))];
const day = new Date(2026, 9, 11); // October 11, 2026

describe('formatDate', () => {
  it.each([
    ['long', 'October 11, 2026'],
    ['medium', 'Oct 11, 2026'],
    ['numeric', '10/11/2026'],
    ['iso', '2026-10-11'],
    ['dmy', '11 Oct 2026'],
  ])('formats %s as %s', (id, expected) => {
    expect(formatDate(day, id, 'en-US')).toBe(expected);
  });

  it('falls back to the long format for an unknown id and returns nothing for a bad date', () => {
    expect(formatDate(day, 'nope', 'en-US')).toBe('October 11, 2026');
    expect(formatDate(new Date('x'), 'long', 'en-US')).toBe('');
    expect(formatDate(null, 'long', 'en-US')).toBe('');
  });

  it('offers exactly the formats the dialog shows, each with a label', () => {
    expect(DATE_FORMATS.map((f) => f.id)).toEqual(['long', 'medium', 'numeric', 'iso', 'dmy']);
    for (const f of DATE_FORMATS) expect(f.label).toBeTruthy();
  });

  it('pads single-digit days in ISO but not in the day-month-year style', () => {
    const early = new Date(2026, 0, 5);
    expect(formatDate(early, 'iso', 'en-US')).toBe('2026-01-05');
    expect(formatDate(early, 'dmy', 'en-US')).toBe('5 Jan 2026');
  });
});

describe('picker values', () => {
  it('parses a real date and rejects an impossible one', () => {
    expect(parseDateInput('2026-10-11').getDate()).toBe(11);
    expect(parseDateInput('2026-02-30')).toBeNull();
    expect(parseDateInput('')).toBeNull();
  });

  it('still formats a picker value in any format', () => {
    expect(dateFromInputValue('2026-10-11', 'en-US')).toBe('October 11, 2026');
    expect(dateFromInputValue('2026-10-11', 'en-US', 'numeric')).toBe('10/11/2026');
  });
});

describe('remembered choices', () => {
  it('keeps a valid format and font', () => {
    expect(normalizeDatePrefs({ format: 'iso', font: 'noto-serif' })).toEqual({ format: 'iso', font: 'noto-serif' });
  });

  it('replaces anything unknown with the defaults', () => {
    expect(normalizeDatePrefs({ format: 'weird', font: 'comic' })).toEqual({ format: 'long', font: DEFAULT_DATE_FONT });
    expect(normalizeDatePrefs(null)).toEqual({ format: 'long', font: DEFAULT_DATE_FONT });
    expect(normalizeDatePrefs('text')).toEqual({ format: 'long', font: DEFAULT_DATE_FONT });
  });
});

describe('date dialog markup', () => {
  it('shows a preview, a native date field, and a Today button', () => {
    expect(byId(page, 'datePreview')).not.toBeNull();
    expect(inside(byId(page, 'datePreview'), dialog)).toBe(true);
    expect(byId(page, 'datePicker').attrs.type).toBe('date');
    const today = byId(page, 'dateToday');
    expect(today.tag).toBe('button');
    expect(textOf(today)).toMatch(/today/i);
  });

  it('no longer has the duplicate text box or the font drop-down', () => {
    expect(byId(page, 'dateText')).toBeNull();
    expect(byId(page, 'dateFont')).toBeNull();
  });

  it('offers a format choice as labeled radio buttons in a named group', () => {
    const group = inDialog((n) => n.tag === 'fieldset' && textOf(n).startsWith('Format'))[0];
    expect(group).toBeDefined();
    expect(all(group).some((n) => n.tag === 'legend')).toBe(true);
    const radios = all(group).filter((n) => n.tag === 'input' && n.attrs.type === 'radio');
    expect(radios.map((r) => r.attrs.value)).toEqual(DATE_FORMATS.map((f) => f.id));
    for (const r of radios) expect(r.attrs.name).toBe('dateFormat');
    expect(radios.filter((r) => 'checked' in r.attrs)).toHaveLength(1);
  });

  it('offers a font choice as radio buttons, one per bundled or system font', () => {
    const group = inDialog((n) => n.tag === 'fieldset' && textOf(n).startsWith('Font'))[0];
    expect(group).toBeDefined();
    const radios = all(group).filter((n) => n.tag === 'input' && n.attrs.type === 'radio');
    expect(radios.map((r) => r.attrs.value)).toEqual(DATE_FONTS.map((f) => f.id));
    for (const r of radios) expect(r.attrs.name).toBe('dateFont');
  });

  it('ends with the Add date button as the main action', () => {
    const last = dialog.children.filter((n) => n.tag !== 'script').pop();
    expect(last.attrs.id).toBe('addDate');
    expect(classes(last)).toContain('btn-primary');
  });
});

describe('chip styling', () => {
  const rule = (selector) => rules.filter((r) => r.selector === selector);

  it('makes every chip at least a comfortable touch target', () => {
    const heights = rule('.chip-option span').map((r) => declaration(r.body, 'min-height')).filter(Boolean);
    expect(heights.pop()).toBe('var(--tap)');
  });

  it('hides the radio visually but keeps it focusable', () => {
    const body = rule('.chip-option input').map((r) => r.body).join(';');
    expect(declaration(body, 'display')).toBeNull();
    expect(declaration(body, 'position')).toBe('absolute');
    expect(declaration(body, 'opacity')).toBe('0');
  });

  it('shows the checked chip and a visible keyboard focus ring', () => {
    expect(rule('.chip-option input:checked + span').length).toBeGreaterThan(0);
    expect(rule('.chip-option input:focus-visible + span').length).toBeGreaterThan(0);
  });
});
