// Form fields found in a PDF: where they are and what to put in them.

// pdf.js gives a field's rectangle in page pixels at any corner order; this
// returns it as fractions (0..1) of the displayed page.
export function fieldFractions(viewRect, pageWidth, pageHeight) {
  const [ax, ay, bx, by] = viewRect;
  const x = Math.min(ax, bx);
  const y = Math.min(ay, by);
  return {
    x: x / pageWidth,
    y: y / pageHeight,
    width: Math.abs(bx - ax) / pageWidth,
    height: Math.abs(by - ay) / pageHeight,
  };
}

// What the field is probably for, from its type and name.
export function guessKind({ name = '', type = '' } = {}) {
  const n = String(name).toLowerCase();
  if (type === 'Sig') return 'signature';
  if (/init/.test(n)) return 'initials';
  if (/date|dated|\bdob\b/.test(n)) return 'date';
  if (/sign/.test(n)) return 'signature';
  return 'signature';
}

// The biggest rectangle with the image's shape that fits inside the field
// (with a little room), centred in it. All values are fractions of the page.
export function fitInto(field, imageAspect, pageAspect, padding = 0.06) {
  const availW = field.width * (1 - padding * 2);
  const availH = field.height * (1 - padding * 2);
  // On the page, width fraction w covers w*pageAspect*H; keep image proportions.
  let width = availW;
  let height = (width * pageAspect) / imageAspect;
  if (height > availH) {
    height = availH;
    width = (height * imageAspect) / pageAspect;
  }
  return {
    x: field.x + (field.width - width) / 2,
    y: field.y + (field.height - height) / 2,
    width,
    height,
  };
}
