// Geometry for the magnifier shown while an item is dragged or resized.
// All values are CSS pixels on the displayed page.

export const LOUPE_MIN_SIDE = 48;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));

// The square piece of the page the magnifier shows: centred on the item and a
// bit bigger than it, kept inside the page.
export function loupeRegion(rect, page, padding = 1.8) {
  const side = clamp(Math.max(rect.width, rect.height) * padding, LOUPE_MIN_SIDE, Math.min(page.width, page.height));
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return {
    sx: clamp(cx - side / 2, 0, page.width - side),
    sy: clamp(cy - side / 2, 0, page.height - side),
    side,
  };
}

// Which top corner the magnifier sits in: the one away from the item.
export function loupeCorner(rect, page) {
  return rect.x + rect.width / 2 < page.width / 2 ? 'right' : 'left';
}
