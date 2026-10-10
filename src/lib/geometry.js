// Coordinate math between the on-screen page preview and PDF user space.
//
// "Display" space: origin top-left, y grows downward, page shown with its
// /Rotate applied (as pdf.js renders it), measured in CSS px at `scale`.
// "PDF" space: origin bottom-left of the unrotated page, y grows upward, in points.
// `box` is the page's crop box {x, y, width, height} in PDF points.

export function normalizeRotation(deg) {
  if (!Number.isFinite(deg) || deg % 90 !== 0) {
    throw new Error(`Page rotation must be a multiple of 90, got ${deg}`);
  }
  return ((deg % 360) + 360) % 360;
}

export function displaySize(box, rotation, scale = 1) {
  const r = normalizeRotation(rotation);
  const swap = r === 90 || r === 270;
  return {
    width: (swap ? box.height : box.width) * scale,
    height: (swap ? box.width : box.height) * scale,
  };
}

export function displayToPdfPoint(dx, dy, { box, rotation, scale = 1 }) {
  const r = normalizeRotation(rotation);
  const a = dx / scale;
  const b = dy / scale;
  let ux;
  let uy;
  switch (r) {
    case 0:
      ux = a;
      uy = box.height - b;
      break;
    case 90:
      ux = b;
      uy = a;
      break;
    case 180:
      ux = box.width - a;
      uy = b;
      break;
    default: // 270
      ux = box.width - b;
      uy = box.height - a;
  }
  return { x: ux + box.x, y: uy + box.y };
}

export function pdfPointToDisplay(px, py, { box, rotation, scale = 1 }) {
  const r = normalizeRotation(rotation);
  const ux = px - box.x;
  const uy = py - box.y;
  let a;
  let b;
  switch (r) {
    case 0:
      a = ux;
      b = box.height - uy;
      break;
    case 90:
      a = uy;
      b = ux;
      break;
    case 180:
      a = box.width - ux;
      b = uy;
      break;
    default: // 270
      a = box.height - uy;
      b = box.width - ux;
  }
  return { x: a * scale, y: b * scale };
}

// rect is a placement in fractions (0..1) of the displayed page.
// Returns pdf-lib drawImage options. The image is anchored at the display
// bottom-left corner of the rect and rotated by the page rotation so it
// appears upright in viewers that honor /Rotate.
export function placementToDrawParams(rect, box, rotation) {
  const r = normalizeRotation(rotation);
  const size = displaySize(box, r, 1);
  const left = rect.x * size.width;
  const bottom = (rect.y + rect.height) * size.height;
  const anchor = displayToPdfPoint(left, bottom, { box, rotation: r, scale: 1 });
  return {
    x: anchor.x,
    y: anchor.y,
    width: rect.width * size.width,
    height: rect.height * size.height,
    rotate: r,
  };
}

export function fitScale(box, rotation, containerWidth, maxScale = 2) {
  const { width } = displaySize(box, rotation, 1);
  return Math.min(containerWidth / width, maxScale);
}

export function clampRect(rect) {
  const width = Math.min(Math.max(rect.width, 0), 1);
  const height = Math.min(Math.max(rect.height, 0), 1);
  return {
    x: Math.min(Math.max(rect.x, 0), 1 - width),
    y: Math.min(Math.max(rect.y, 0), 1 - height),
    width,
    height,
  };
}
