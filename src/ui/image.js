// Browser-only: decode an uploaded image, optionally strip the paper
// background, crop to the ink, and return a PNG data URL plus dimensions.
import { makeWhiteTransparent, findInkBounds, estimateThreshold } from '../lib/transparency.js';

const MAX_SIDE = 1600;

async function decode(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("Couldn't open that image. Try a PNG or JPEG.");
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function processSignatureImage(file, { removeBackground = true } = {}) {
  const img = await decode(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  let data = ctx.getImageData(0, 0, w, h);
  if (removeBackground) {
    const threshold = estimateThreshold(data.data);
    data = new ImageData(makeWhiteTransparent(data.data, { threshold, softness: 40 }), w, h);
  }

  let bounds = findInkBounds(data.data, w, h);
  if (!bounds) {
    if (removeBackground) {
      throw new Error("Couldn't find any ink in that image. Try a darker pen or a brighter photo.");
    }
    bounds = { x: 0, y: 0, width: w, height: h };
  }
  const pad = Math.round(Math.max(bounds.width, bounds.height) * 0.03);
  const cx = Math.max(0, bounds.x - pad);
  const cy = Math.max(0, bounds.y - pad);
  const cw = Math.min(w - cx, bounds.width + pad * 2);
  const ch = Math.min(h - cy, bounds.height + pad * 2);

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  ctx.putImageData(data, 0, 0);
  out.getContext('2d').drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);

  return { dataUrl: out.toDataURL('image/png'), width: cw, height: ch };
}

export function measureDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}
