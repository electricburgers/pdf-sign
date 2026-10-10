// Type a date (or any short text), pick a font, and place it on the page.
// The text is drawn to a PNG with the browser's own font rendering, so the
// preview and the downloaded PDF match.
import { DATE_FONTS, DEFAULT_DATE_FONT, fontCss, cleanDateText, defaultDateText, defaultDateWidth, toDateInputValue, dateFromInputValue } from '../lib/dateText.js';
import { state, bus } from '../app/state.js';
import { addTextItem } from '../app/actions.js';
import { renderText, FONT_PX } from './text-render.js';
import { toast } from './announce.js';
import { $ } from './dom.js';

function updateButton() {
  $('#addDate').disabled = !state.doc || !cleanDateText($('#dateText').value);
}

export function initDateTool() {
  const input = $('#dateText');
  const select = $('#dateFont');
  const picker = $('#datePicker');
  picker.value = toDateInputValue();
  input.value = defaultDateText();
  for (const f of DATE_FONTS) {
    const opt = new Option(f.label, f.id);
    opt.style.fontFamily = f.family;
    select.add(opt);
  }
  select.value = DEFAULT_DATE_FONT;
  const preview = $('#datePreview');
  const syncPreview = () => {
    preview.textContent = cleanDateText(input.value) || 'Preview';
    preview.style.font = fontCss(select.value, 20);
  };

  input.addEventListener('input', () => {
    updateButton();
    syncPreview();
  });
  select.addEventListener('change', syncPreview);
  // Choosing a date in the native picker fills the text box; it stays editable.
  picker.addEventListener('change', () => {
    const text = dateFromInputValue(picker.value);
    if (!text) return;
    input.value = text;
    updateButton();
    syncPreview();
  });
  $('#addDate').addEventListener('click', async () => {
    const text = cleanDateText(input.value);
    if (!text || !state.doc) return;
    try {
      const image = await renderText(text, select.value);
      addTextItem('date', image, text, select.value, defaultDateWidth(image.width, FONT_PX));
    } catch {
      toast("Couldn't add that date.", { error: true });
    }
  });

  bus.on('document', updateButton);
  syncPreview();
  updateButton();
}
