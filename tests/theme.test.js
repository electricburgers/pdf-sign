// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { resolveTheme, nextThemePref, applyTheme, normalizeThemePref } from '../src/lib/theme.js';

describe('theme', () => {
  it('follows the system when the preference is system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
  it('lets an explicit preference override the system', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('cycles system -> light -> dark -> system', () => {
    expect(nextThemePref('system')).toBe('light');
    expect(nextThemePref('light')).toBe('dark');
    expect(nextThemePref('dark')).toBe('system');
  });
  it('sets data-theme on the root for an explicit preference', () => {
    applyTheme(document, 'dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
  it('removes data-theme when following the system', () => {
    applyTheme(document, 'dark');
    applyTheme(document, 'system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
  it('treats unknown preferences as system', () => {
    expect(normalizeThemePref('purple')).toBe('system');
    expect(normalizeThemePref(null)).toBe('system');
  });
});
