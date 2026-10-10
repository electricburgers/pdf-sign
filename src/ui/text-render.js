// Draws typed text to a PNG with the browser's own font rendering, so the
// on-page preview and the downloaded PDF match.
import { fontCss } from '../lib/dateText.js';

export const FONT_PX = 128; // drawn large so the text stays sharp when the page is zoomed
const PAD = 0.12; // breathing room around the text, in em

export async function renderText(text, fontId) {
  const font = fontCss(fontId, FONT_PX);
  try {
    await document.fonts.load(font, text);
  } catch {
    // Falls back to the next font in the stack.
  }
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = font;
  const m = ctx.measureText(text);
  const pad = Math.round(FONT_PX * PAD);
  const ascent = Math.ceil(m.actualBoundingBoxAscent || FONT_PX * 0.8);
  const descent = Math.ceil(m.actualBoundingBoxDescent || FONT_PX * 0.2);
  const width = Math.ceil(Math.max(m.width, m.actualBoundingBoxRight || 0)) + pad * 2;
  const height = ascent + descent + pad * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d');
  c.font = font;
  c.fillStyle = '#111111';
  c.textBaseline = 'alphabetic';
  c.fillText(text, pad, pad + ascent);
  return { dataUrl: canvas.toDataURL('image/png'), width, height };
}
