// Fonts offered for the typed date. Verdana and Times New Roman are system
// fonts; Open Sans and Noto Serif are bundled so they look the same everywhere.
export const DATE_FONTS = [
  { id: 'verdana', label: 'Verdana', family: "Verdana, 'DejaVu Sans', Geneva, sans-serif" },
  { id: 'times', label: 'Times New Roman', family: "'Times New Roman', Times, 'Liberation Serif', serif" },
  { id: 'open-sans', label: 'Open Sans (sans serif)', family: "'Open Sans', sans-serif" },
  { id: 'noto-serif', label: 'Noto Serif (open serif)', family: "'Noto Serif', serif" },
];
export const DEFAULT_DATE_FONT = 'verdana';

// Typical body text on a US Letter page (612 pt wide), used to pick a first size.
export const DEFAULT_FONT_PT = 11;
export const LETTER_WIDTH_PT = 612;

export function fontById(id) {
  return DATE_FONTS.find((f) => f.id === id) || DATE_FONTS[0];
}

export function fontCss(id, px) {
  return `${px}px ${fontById(id).family}`;
}

export const MAX_DATE_CHARS = 40;
export const MAX_FREE_TEXT_CHARS = 120;

export function cleanDateText(text, max = MAX_DATE_CHARS) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function defaultDateText(now = new Date(), locale) {
  return now.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

const pad2 = (n) => String(n).padStart(2, '0');

// Value for <input type="date"> (yyyy-mm-dd) in local time.
export function toDateInputValue(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Turns a yyyy-mm-dd picker value into display text, or '' if it isn't a real date.
// Parsed as local parts so the day never shifts with the time zone.
export function dateFromInputValue(value, locale) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return '';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return '';
  return defaultDateText(date, locale);
}

// Fraction of the page width that renders `imageWidthPx` (drawn at `fontPx`)
// at roughly DEFAULT_FONT_PT on a Letter page.
export function defaultDateWidth(imageWidthPx, fontPx) {
  return (imageWidthPx * (DEFAULT_FONT_PT / fontPx)) / LETTER_WIDTH_PT;
}
