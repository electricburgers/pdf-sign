import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseHex, contrastRatio, parseCssTokens } from '../src/lib/contrast.js';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

// [foreground, background] pairs that carry text: WCAG 1.4.3 needs 4.5:1.
const TEXT_PAIRS = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surface-2'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['muted', 'surface-2'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['accent-ink', 'accent'],
  ['danger', 'surface'],
  ['danger', 'surface-2'],
  ['danger-ink', 'danger'],
  ['toast-text', 'toast-bg'],
];
// Focus indicators and control boundaries: WCAG 1.4.11 needs 3:1.
const UI_PAIRS = [
  ['focus', 'bg'],
  ['focus', 'surface'],
  ['control-border', 'surface'],
  ['control-border', 'surface-2'],
];

function check(tokens, pairs, min) {
  const failures = [];
  for (const [fg, bg] of pairs) {
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    if (!(ratio >= min)) failures.push(`${fg} on ${bg} = ${ratio.toFixed(2)}`);
  }
  return failures;
}

describe('contrast math', () => {
  it('parses short and long hex colors', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#2F5BD3')).toEqual([47, 91, 211]);
  });
  it('gives 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });
  it('is symmetric and 1:1 for identical colors', () => {
    expect(contrastRatio('#123456', '#abcdef')).toBeCloseTo(contrastRatio('#abcdef', '#123456'), 10);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });
});

describe('theme tokens', () => {
  const tokens = parseCssTokens(css);

  it('parses the light, dark media-query and dark attribute blocks', () => {
    expect(tokens.light.text).toMatch(/^#/);
    expect(tokens.dark.text).toMatch(/^#/);
    expect(Object.keys(tokens.darkMedia).length).toBeGreaterThan(10);
  });
  it('light theme meets WCAG AA for text (4.5:1) and UI (3:1)', () => {
    expect([...check(tokens.light, TEXT_PAIRS, 4.5), ...check(tokens.light, UI_PAIRS, 3)]).toEqual([]);
  });
  it('dark theme meets WCAG AA for text (4.5:1) and UI (3:1)', () => {
    expect([...check(tokens.dark, TEXT_PAIRS, 4.5), ...check(tokens.dark, UI_PAIRS, 3)]).toEqual([]);
  });
  it('keeps the system-dark and forced-dark token blocks identical', () => {
    expect(tokens.darkMedia).toEqual(tokens.dark);
  });
});
