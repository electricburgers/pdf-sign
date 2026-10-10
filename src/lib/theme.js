const PREFS = ['system', 'light', 'dark'];

export function normalizeThemePref(pref) {
  return PREFS.includes(pref) ? pref : 'system';
}

export function resolveTheme(pref, systemDark) {
  const p = normalizeThemePref(pref);
  if (p === 'system') return systemDark ? 'dark' : 'light';
  return p;
}

export function nextThemePref(pref) {
  const i = PREFS.indexOf(normalizeThemePref(pref));
  return PREFS[(i + 1) % PREFS.length];
}

// Explicit choices set data-theme; "system" removes it so the CSS
// prefers-color-scheme media query takes over.
export function applyTheme(doc, pref) {
  const p = normalizeThemePref(pref);
  const root = doc.documentElement;
  if (p === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', p);
  return p;
}
