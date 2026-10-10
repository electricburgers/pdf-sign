import { describe, it, expect } from 'vitest';
import { layoutFor, BREAKPOINTS } from '../src/lib/layout.js';

describe('layoutFor', () => {
  it('maps widths to mobile, tablet and desktop layouts', () => {
    expect(layoutFor(375)).toBe('mobile');
    expect(layoutFor(820)).toBe('tablet');
    expect(layoutFor(1440)).toBe('desktop');
  });
  it('switches exactly at the breakpoints', () => {
    expect(layoutFor(BREAKPOINTS.tablet - 1)).toBe('mobile');
    expect(layoutFor(BREAKPOINTS.tablet)).toBe('tablet');
    expect(layoutFor(BREAKPOINTS.desktop - 1)).toBe('tablet');
    expect(layoutFor(BREAKPOINTS.desktop)).toBe('desktop');
  });
});
