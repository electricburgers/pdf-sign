// Draws the checkmark and X stamps as vector strokes (no fonts needed).
const SIZE = 192;

const SHAPES = {
  check: { label: 'Checkmark', draw: (c) => { c.moveTo(34, 104); c.lineTo(80, 150); c.lineTo(160, 44); } },
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

export function renderStamp(shape) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const c = canvas.getContext('2d');
  c.strokeStyle = '#111111';
  c.lineWidth = 22;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  SHAPES[shape].draw(c);
  c.stroke();
  return { dataUrl: canvas.toDataURL('image/png'), width: SIZE, height: SIZE };
}
