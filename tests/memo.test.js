import { describe, it, expect, vi } from 'vitest';
import { memoizeLast } from '../src/lib/memo.js';

describe('memoizeLast', () => {
  it('reuses the result for the same argument and recomputes when it changes', () => {
    const fn = vi.fn((s) => s.length);
    const m = memoizeLast(fn);
    expect(m('abc')).toBe(3);
    expect(m('abc')).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(m('abcd')).toBe(4);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
