// A small magnifier in the top corner of the page, shown while an item is
// dragged or resized, so you can line it up without your finger or the item's
// own size hiding the detail.
import { loupeRegion, loupeCorner } from '../lib/loupe.js';
import { state } from '../app/state.js';
import { $ } from './dom.js';

export function showLoupe(p, img) {
  const box = $('#loupe');
  const page = state.pageDisplay;
  const source = $('#pageCanvas');
  if (!box || !source || !img || !source.width) return;
  if (state.zoom > 1) {
    box.hidden = true; // already zoomed in: the magnifier would only get in the way
    return;
  }
  const rect = { x: p.x * page.width, y: p.y * page.height, width: p.width * page.width, height: p.height * page.height };
  const { sx, sy, side } = loupeRegion(rect, page);
  box.dataset.corner = loupeCorner(rect, page);
  box.hidden = false;

  const canvas = box.firstElementChild;
  const c = canvas.getContext('2d');
  const k = source.width / page.width; // canvas pixels per CSS pixel
  const z = canvas.width / side; // loupe pixels per CSS pixel
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.drawImage(source, sx * k, sy * k, side * k, side * k, 0, 0, canvas.width, canvas.height);

  c.save();
  c.translate((rect.x + rect.width / 2 - sx) * z, (rect.y + rect.height / 2 - sy) * z);
  if (p.rotation) c.rotate((p.rotation * Math.PI) / 180);
  const w = rect.width * z;
  const h = rect.height * z;
  try {
    c.drawImage(img, -w / 2, -h / 2, w, h);
  } catch {
    /* image not ready yet */
  }
  c.strokeStyle = '#2b52c4';
  c.lineWidth = 2;
  c.setLineDash([6, 4]);
  c.strokeRect(-w / 2, -h / 2, w, h);
  c.restore();
}

export function hideLoupe() {
  const box = $('#loupe');
  if (box) box.hidden = true;
}
