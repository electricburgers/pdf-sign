// Keyboard control for a selected placement (WCAG 2.1.1 Keyboard).
// Steps are fractions of the page.

export const STEP = { small: 0.005, large: 0.05, resize: 0.01, resizeLarge: 0.05 };

const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export function keyToAction({ key, shiftKey = false }) {
  if (ARROWS[key]) {
    const step = shiftKey ? STEP.large : STEP.small;
    const [x, y] = ARROWS[key];
    return { type: 'move', dx: x * step + 0, dy: y * step + 0 };
  }
  if (key === '+' || key === '=') return { type: 'resize', delta: shiftKey && key === '+' ? STEP.resizeLarge : STEP.resize };
  if (key === '-' || key === '_') return { type: 'resize', delta: -(shiftKey ? STEP.resizeLarge : STEP.resize) };
  if (key === 'Delete' || key === 'Backspace') return { type: 'remove' };
  if (key === 'Escape') return { type: 'deselect' };
  return null;
}
