import { describe, it, expect } from 'vitest';
import { toDateInputValue, dateFromInputValue, cleanDateText, MAX_DATE_CHARS, MAX_FREE_TEXT_CHARS } from '../src/lib/dateText.js';

describe('dateText', () => {
  it('formats a Date for the native picker in local time', () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('turns a picker value into display text without shifting the day', () => {
    expect(dateFromInputValue('2026-10-10', 'en-US')).toBe('October 10, 2026');
    expect(dateFromInputValue('2026-01-01', 'en-US')).toBe('January 1, 2026');
  });

  it('rejects empty or impossible dates', () => {
    expect(dateFromInputValue('', 'en-US')).toBe('');
    expect(dateFromInputValue('2026-02-31', 'en-US')).toBe('');
  });

  it('collapses whitespace and limits length', () => {
    expect(cleanDateText('  a   b ')).toBe('a b');
    expect(cleanDateText('x'.repeat(60))).toHaveLength(40);
  });
});

describe('edge cases', () => {
  it('limits free text to its own, longer limit', () => {
    const long = 'word '.repeat(60);
    expect(cleanDateText(long, MAX_FREE_TEXT_CHARS).length).toBeLessThanOrEqual(MAX_FREE_TEXT_CHARS);
    expect(cleanDateText('y'.repeat(500), MAX_FREE_TEXT_CHARS)).toHaveLength(MAX_FREE_TEXT_CHARS);
    expect(cleanDateText('y'.repeat(500))).toHaveLength(MAX_DATE_CHARS);
  });

  it('trims after cutting so the result never ends in a space it was cut at', () => {
    const text = cleanDateText(`${'a'.repeat(MAX_DATE_CHARS - 1)} tail`);
    expect(text).toBe('a'.repeat(MAX_DATE_CHARS - 1));
  });

  it('never splits an emoji at the limit', () => {
    const text = cleanDateText(`${'a'.repeat(MAX_DATE_CHARS - 1)}😀😀`);
    expect(text).toBe(`${'a'.repeat(MAX_DATE_CHARS - 1)}😀`);
  });

  it('treats empty, whitespace-only and non-string input as empty', () => {
    for (const v of ['', '   ', '\n\t', null, undefined]) expect(cleanDateText(v)).toBe('');
  });

  it('keeps emoji and non-Latin text intact', () => {
    expect(cleanDateText('  Ünïcode ✓ 日本語 ')).toBe('Ünïcode ✓ 日本語');
  });

  it('rejects bad picker values', () => {
    for (const v of ['abc', '2026-13-01', '2026-00-10', '2026-10-00', '2026-1-1', '2026/10/10', '0000-01-01', undefined, null]) {
      expect(dateFromInputValue(v, 'en-US')).toBe('');
    }
  });

  it('handles leap days', () => {
    expect(dateFromInputValue('2024-02-29', 'en-US')).toBe('February 29, 2024');
    expect(dateFromInputValue('2025-02-29', 'en-US')).toBe('');
  });
});
