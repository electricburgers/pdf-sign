// Draws the checkmark and X stamps as vector strokes (no fonts needed).
const SIZE = 192;

// w and h are the picture's size; wide: how much of the page width it covers.
const SHAPES = {
  check: { label: 'Checkmark', draw: (c) => { c.moveTo(34, 104); c.lineTo(80, 150); c.lineTo(160, 44); } },
  dot: { label: 'Filled dot', fill: true, draw: (c) => { c.arc(96, 96, 56, 0, Math.PI * 2); } },
  circle: { label: 'Circle', draw: (c) => { c.arc(96, 96, 70, 0, Math.PI * 2); } },
  line: { label: 'Line', w: 384, h: 64, wide: 0.12, draw: (c) => { c.moveTo(24, 32); c.lineTo(360, 32); } },
  arrow: {
    label: 'Arrow',
    w: 288,
    h: 192,
    wide: 0.08,
    draw: (c) => {
      c.moveTo(24, 96); c.lineTo(256, 96);
      c.moveTo(184, 36); c.lineTo(256, 96); c.lineTo(184, 156);
    },
  },
  cross: {
    label: 'X mark',
    draw: (c) => {
      c.moveTo(42, 42); c.lineTo(150, 150);
      c.moveTo(150, 42); c.lineTo(42, 150);
    },
  },
};

export function stampLabel(shape) {
  return SHAPES[shape].label;
}

export const STAMP_SHAPES = Object.keys(SHAPES);

// Fraction of the page width a stamp covers when first placed.
export function stampWidth(shape) {
  return SHAPES[shape].wide ?? 0.04;
}

export function renderStamp(shape) {
  const { w = SIZE, h = SIZE, fill = false } = SHAPES[shape];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  c.strokeStyle = '#111111';
  c.fillStyle = '#111111';
  c.lineWidth = 22;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  SHAPES[shape].draw(c);
  if (fill) c.fill();
  else c.stroke();
  return { dataUrl: canvas.toDataURL('image/png'), width: w, height: h };
}
