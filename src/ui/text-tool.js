// Free text: type anything, pick a font (separate from the date's), and place
// it on the page like a signature.
import { DATE_FONTS, DEFAULT_DATE_FONT, MAX_FREE_TEXT_CHARS, fontCss, cleanDateText, defaultDateWidth } from '../lib/dateText.js';
import { state, bus } from '../app/state.js';
import { addTextItem } from '../app/actions.js';
import { renderText, FONT_PX } from './text-render.js';
import { toast } from './announce.js';
import { $ } from './dom.js';

const clean = (text) => cleanDateText(text, MAX_FREE_TEXT_CHARS);

export function initTextTool() {
  const input = $('#freeText');
  const select = $('#textFont');
  const preview = $('#textPreview');
  const button = $('#addText');
  input.maxLength = MAX_FREE_TEXT_CHARS;
  for (const f of DATE_FONTS) {
    const opt = new Option(f.label, f.id);
    opt.style.fontFamily = f.family;
    select.add(opt);
  }
  select.value = DEFAULT_DATE_FONT;

  const updateButton = () => {
    button.disabled = !state.doc || !clean(input.value);
  };
  const syncPreview = () => {
    preview.textContent = clean(input.value) || 'Preview';
    preview.style.font = fontCss(select.value, 20);
  };

  input.addEventListener('input', () => {
    updateButton();
    syncPreview();
  });
  select.addEventListener('change', syncPreview);
  button.addEventListener('click', async () => {
    const text = clean(input.value);
    if (!text || !state.doc) return;
    try {
      const image = await renderText(text, select.value);
      addTextItem('text', image, text, select.value, defaultDateWidth(image.width, FONT_PX));
    } catch {
      toast("Couldn't add that text.", { error: true });
    }
  });

  bus.on('document', updateButton);
  syncPreview();
  updateButton();
}
