// Date dialog: pick a date, choose a format and a font, see the result in a
// live preview, and place it on the page like a signature. The date is drawn to
// a PNG with the browser's own font rendering, so the preview and the
// downloaded PDF match.
import {
  DATE_FORMATS,
  DATE_FONTS,
  fontCss,
  fontById,
  formatDate,
  parseDateInput,
  toDateInputValue,
  normalizeDatePrefs,
  defaultDateWidth,
} from '../lib/dateText.js';
import { state, bus, storage } from '../app/state.js';
import { addTextItem } from '../app/actions.js';
import { renderText, FONT_PX } from './text-render.js';
import { toast } from './announce.js';
import { $, $$ } from './dom.js';

const PREFS_KEY = 'pdfsign:date';

function loadPrefs() {
  try {
    return normalizeDatePrefs(JSON.parse((storage && storage.getItem(PREFS_KEY)) || 'null'));
  } catch {
    return normalizeDatePrefs(null);
  }
}

function savePrefs(prefs) {
  try {
    if (storage) storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* not saved; still applied */
  }
}

const radio = (name) => $$(`input[name="${name}"]`);
const chosen = (name) => (radio(name).find((r) => r.checked) || {}).value;

export function initDateTool() {
  const picker = $('#datePicker');
  const preview = $('#datePreview');
  const add = $('#addDate');

  // Each format chip shows today's date written that way; each font chip is set in its own font.
  const formatChips = $$('input[name="dateFormat"]').map((r) => r.nextElementSibling);
  const current = () => parseDateInput(picker.value);
  const refresh = () => {
    const date = current();
    const format = chosen('dateFormat');
    DATE_FORMATS.forEach((f, i) => {
      formatChips[i].textContent = formatDate(date, f.id) || f.label;
    });
    preview.textContent = formatDate(date, format) || 'Pick a date';
    preview.style.font = fontCss(chosen('dateFont'), 28);
    add.disabled = !state.doc || !date;
    savePrefs({ format, font: chosen('dateFont') });
  };

  radio('dateFont').forEach((r) => {
    r.nextElementSibling.style.fontFamily = fontById(r.value).family;
  });
  const prefs = loadPrefs();
  for (const r of radio('dateFormat')) r.checked = r.value === prefs.format;
  for (const r of radio('dateFont')) r.checked = r.value === prefs.font;
  picker.value = toDateInputValue();

  picker.addEventListener('input', refresh);
  picker.addEventListener('change', refresh);
  $('#dateToday').addEventListener('click', () => {
    picker.value = toDateInputValue();
    refresh();
  });
  for (const r of [...radio('dateFormat'), ...radio('dateFont')]) r.addEventListener('change', refresh);

  add.addEventListener('click', async () => {
    const date = current();
    if (!date || !state.doc) return;
    const text = formatDate(date, chosen('dateFormat'));
    const font = chosen('dateFont');
    try {
      const image = await renderText(text, font);
      addTextItem('date', image, text, font, defaultDateWidth(image.width, FONT_PX));
    } catch {
      toast("Couldn't add that date.", { error: true });
    }
  });

  bus.on('document', refresh);
  refresh();
}
