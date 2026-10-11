// Fonts offered for the typed date. Verdana and Times New Roman are system
// fonts; Open Sans and Noto Serif are bundled so they look the same everywhere.
export const DATE_FONTS = [
  { id: 'verdana', label: 'Verdana', short: 'Verdana', family: "Verdana, 'DejaVu Sans', Geneva, sans-serif" },
  { id: 'times', label: 'Times New Roman', short: 'Times', family: "'Times New Roman', Times, 'Liberation Serif', serif" },
  { id: 'open-sans', label: 'Open Sans (sans serif)', short: 'Open Sans', family: "'Open Sans', sans-serif" },
  { id: 'noto-serif', label: 'Noto Serif (open serif)', short: 'Noto Serif', family: "'Noto Serif', serif" },
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
  // Cut by character (not UTF-16 unit) so an emoji is never split, then trim again.
  return [...String(text || '').replace(/\s+/g, ' ').trim()].slice(0, max).join('').trim();
}

export function defaultDateText(now = new Date(), locale) {
  return now.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

const pad2 = (n) => String(n).padStart(2, '0');

// Value for <input type="date"> (yyyy-mm-dd) in local time.
export function toDateInputValue(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// A picker value (yyyy-mm-dd) as a local Date, or null if it isn't a real date.
// Parsed as local parts so the day never shifts with the time zone.
export function parseDateInput(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export const DATE_FORMATS = [
  { id: 'long', label: 'Long' },
  { id: 'medium', label: 'Medium' },
  { id: 'numeric', label: 'Numbers' },
  { id: 'iso', label: 'Year first' },
  { id: 'dmy', label: 'Day first' },
];
export const DEFAULT_DATE_FORMAT = 'long';

export function formatDate(date, formatId = DEFAULT_DATE_FORMAT, locale) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  switch (formatId) {
    case 'medium':
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    case 'numeric':
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'numeric', day: 'numeric' });
    case 'iso':
      return toDateInputValue(date);
    case 'dmy':
      return `${date.getDate()} ${date.toLocaleDateString(locale, { month: 'short' })} ${date.getFullYear()}`;
    default:
      return defaultDateText(date, locale);
  }
}

// A picker value as display text in the chosen format, or '' if it isn't a real date.
export function dateFromInputValue(value, locale, formatId = DEFAULT_DATE_FORMAT) {
  return formatDate(parseDateInput(value), formatId, locale);
}

// The format and font the date dialog remembers; anything unknown becomes the default.
export function normalizeDatePrefs(raw) {
  const prefs = raw && typeof raw === 'object' ? raw : {};
  return {
    format: DATE_FORMATS.some((f) => f.id === prefs.format) ? prefs.format : DEFAULT_DATE_FORMAT,
    font: DATE_FONTS.some((f) => f.id === prefs.font) ? prefs.font : DEFAULT_DATE_FONT,
  };
}

// Fraction of the page width that renders `imageWidthPx` (drawn at `fontPx`)
// at roughly DEFAULT_FONT_PT on a Letter page.
export function defaultDateWidth(imageWidthPx, fontPx) {
  return (imageWidthPx * (DEFAULT_FONT_PT / fontPx)) / LETTER_WIDTH_PT;
}
