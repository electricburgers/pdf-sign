import { describe, it, expect } from 'vitest';
import { toDateInputValue, dateFromInputValue, cleanDateText } from '../src/lib/dateText.js';

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
