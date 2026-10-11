// Tiny HTML and CSS readers for structure tests. They avoid a DOM so the tests
// start fast and run anywhere. They understand this project's markup, not all of HTML.
import { readFileSync } from 'node:fs';

const VOID = new Set(['meta', 'link', 'input', 'img', 'br', 'hr', 'source', 'path', 'rect', 'circle', 'line', 'polyline', 'ellipse']);
const root = (rel) => new URL(`../../${rel}`, import.meta.url);
export const read = (rel) => readFileSync(root(rel), 'utf8');

function parseAttrs(text) {
  const attrs = {};
  for (const m of text.matchAll(/([a-zA-Z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

export function parseHtml(source) {
  const src = source.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '<$1></$1>');
  const top = { tag: '#root', attrs: {}, children: [], text: '', parent: null };
  let node = top;
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  for (let m; (m = re.exec(src)); ) {
    if (m[5] !== undefined) {
      node.text += m[5];
      continue;
    }
    const [, closing, name, rest, selfClose] = m;
    const tag = name.toLowerCase();
    if (closing) {
      let up = node;
      while (up && up.tag !== tag) up = up.parent;
      if (up && up.parent) node = up.parent;
    } else {
      const el = { tag, attrs: parseAttrs(rest), children: [], text: '', parent: node };
      node.children.push(el);
      if (!VOID.has(tag) && !selfClose) node = el;
    }
  }
  return top;
}

export function walk(node, fn) {
  for (const child of node.children) {
    fn(child);
    walk(child, fn);
  }
}
export const all = (rootNode) => {
  const out = [];
  walk(rootNode, (n) => out.push(n));
  return out;
};
export const byId = (rootNode, id) => all(rootNode).find((n) => n.attrs.id === id) || null;
export const ancestors = (node) => {
  const out = [];
  for (let p = node.parent; p && p.tag !== '#root'; p = p.parent) out.push(p);
  return out;
};
export const classes = (node) => (node.attrs.class || '').split(/\s+/).filter(Boolean);
export const textOf = (node) => (node.text + node.children.map(textOf).join(' ')).replace(/\s+/g, ' ').trim();
export const inside = (node, container) => ancestors(node).includes(container);

// ---- CSS ----
// Returns [{ selector, body, media }]; comma lists are split into separate rules.
export function cssRules(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const read = (start, end, media) => {
    let i = start;
    while (i < end) {
      const open = css.indexOf('{', i);
      if (open < 0 || open >= end) break;
      const head = css.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < end && depth) {
        if (css[j] === '{') depth += 1;
        else if (css[j] === '}') depth -= 1;
        j += 1;
      }
      const body = css.slice(open + 1, j - 1);
      if (head.startsWith('@media')) read(open + 1, j - 1, head.slice(6).trim());
      else if (!head.startsWith('@')) head.split(',').forEach((s) => rules.push({ selector: s.trim(), body, media }));
      i = j;
    }
  };
  read(0, css.length, null);
  return rules;
}

// Does a rule apply on a 375 px wide phone?
export function appliesOnPhone(media) {
  if (!media) return true;
  const min = /min-width:\s*(\d+)px/.exec(media);
  const max = /max-width:\s*(\d+)px/.exec(media);
  return (!min || Number(min[1]) <= 375) && (!max || Number(max[1]) >= 375);
}

function lastCompound(selector) {
  return selector.split(/[\s>+~]+/).filter(Boolean).pop() || '';
}

// Does the last part of a selector match this node? (Parents in the selector are ignored.)
export function matches(selector, node) {
  const comp = lastCompound(selector.replace(/::?[\w-]+(\([^)]*\))?/g, (m) => (/^:(not|is)/.test(m) ? m : '')));
  if (!comp || /:/.test(comp)) return false;
  const tag = /^[a-zA-Z][\w-]*/.exec(comp);
  if (tag && tag[0].toLowerCase() !== node.tag) return false;
  for (const m of comp.matchAll(/\.([\w-]+)/g)) if (!classes(node).includes(m[1])) return false;
  for (const m of comp.matchAll(/#([\w-]+)/g)) if (node.attrs.id !== m[1]) return false;
  for (const m of comp.matchAll(/\[([\w-]+)(?:=['"]?([^'"\]]*)['"]?)?\]/g)) {
    if (!(m[1] in node.attrs)) return false;
    if (m[2] !== undefined && node.attrs[m[1]] !== m[2]) return false;
  }
  return true;
}

export const declaration = (body, prop) => {
  const m = new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+)`, 'i').exec(body);
  return m ? m[1].trim() : null;
};

// Properties that make an element a stacking context (so its children's z-index
// can never rise above its siblings).
export function createsStackingContext(body) {
  const position = declaration(body, 'position');
  if (position === 'fixed' || position === 'sticky') return true;
  if (position && position !== 'static' && !/^auto$/i.test(declaration(body, 'z-index') || 'auto')) return true;
  for (const prop of ['transform', 'filter', 'backdrop-filter', 'perspective', 'will-change']) {
    const v = declaration(body, prop);
    if (v && v !== 'none' && v !== 'auto') return true;
  }
  const opacity = declaration(body, 'opacity');
  return opacity !== null && Number(opacity) < 1;
}
