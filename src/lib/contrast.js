// WCAG 2.x contrast math, plus a parser for our design-token CSS so the
// test suite can prove every text/background pair passes AA.

export function parseHex(hex) {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Not a hex color: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function channel(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function readBlock(css, openIndex) {
  const start = css.indexOf('{', openIndex) + 1;
  let depth = 1;
  let i = start;
  while (depth > 0 && i < css.length) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') depth -= 1;
    i += 1;
  }
  return css.slice(start, i - 1);
}

function readVars(block) {
  const out = {};
  for (const m of block.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

// Expects: `:root { … }`, `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { … } }`
// and `:root[data-theme='dark'] { … }`.
export function parseCssTokens(css) {
  const lightAt = css.search(/:root\s*\{/);
  const mediaAt = css.search(/@media\s*\(prefers-color-scheme:\s*dark\)/);
  const darkAt = css.search(/:root\[data-theme=['"]dark['"]\]\s*\{/);
  return {
    light: readVars(readBlock(css, lightAt)),
    darkMedia: readVars(readBlock(css, mediaAt)),
    dark: readVars(readBlock(css, darkAt)),
  };
}
