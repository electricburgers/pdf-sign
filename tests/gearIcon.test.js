// The settings gear is an outlined eight-tooth gear with a round hub.
import { describe, it, expect } from 'vitest';
import { read, parseHtml, byId, all } from './helpers/html.js';

const button = byId(parseHtml(read('index.html')), 'settingsBtn');
const svg = all(button).find((n) => n.tag === 'svg');

describe('settings gear', () => {
  it('is a decorative 24 px icon that follows the text color', () => {
    expect(svg.attrs.viewBox).toBe('0 0 24 24');
    expect(svg.attrs['aria-hidden']).toBe('true');
    for (const part of all(svg)) expect(part.attrs.stroke).toBe('currentColor');
  });

  it('has eight teeth and a round hub', () => {
    const path = all(svg).find((n) => n.tag === 'path');
    expect(path.attrs.d.startsWith('M')).toBe(true);
    expect(path.attrs.d.endsWith('Z')).toBe(true);
    expect((path.attrs.d.match(/L/g) || []).length).toBe(8 * 4 - 1);
    expect(all(svg).some((n) => n.tag === 'circle' && n.attrs.r === '3.2')).toBe(true);
  });

  it('joins strokes with round corners so small sizes look clean', () => {
    expect(all(svg).find((n) => n.tag === 'path').attrs['stroke-linejoin']).toBe('round');
  });
});
