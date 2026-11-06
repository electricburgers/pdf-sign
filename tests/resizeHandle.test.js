import { describe, it, expect } from 'vitest';
import { read } from './helpers/html.js';

const px = (text, prop) => Number(new RegExp(`(?:^|[;\\s])${prop}:\\s*(-?\\d+)px`).exec(String(text))?.[1]);
const layer = read('src/ui/placement-layer.js');

describe('resize handle', () => {
  it('is a small dot that does not cover the item', () => {
    const css = read('src/styles/components.css');
    const handle = /\n\.handle \{([^}]*)\}/.exec(css)[1];
    expect(px(handle, 'width')).toBeLessThanOrEqual(20);
    expect(px(handle, 'height')).toBeLessThanOrEqual(20);
    expect(px(handle, 'right')).toBeLessThanOrEqual(-12); // sits outside the corner
    expect(px(handle, 'bottom')).toBeLessThanOrEqual(-12);
  });

  it('keeps a 44px touch target', () => {
    const after = /\.handle::after \{([^}]*)\}/.exec(read('src/styles/components.css'))[1];
    expect(px(after, 'width')).toBeGreaterThanOrEqual(44);
    expect(px(after, 'height')).toBeGreaterThanOrEqual(44);
  });

  it('clears the grip and tint while resizing', () => {
    const css = read('src/styles/components.css');
    expect(css).toMatch(/\.placement\.resizing \.grip \{\s*display: none/);
    expect(css).toMatch(/\.placement\.resizing \{\s*background: transparent/);
    expect(layer).toContain("classList.add('resizing')");
    expect(layer).toContain("classList.remove('resizing')");
  });

  it('moves inside the item near the page edge', () => {
    expect(layer).toContain("toggle('handle-in'");
    expect(read('src/styles/components.css')).toMatch(/\.placement\.handle-in \.handle/);
  });
});
