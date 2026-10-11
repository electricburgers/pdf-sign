// Checkmark and X stamps for ticking boxes on forms.
import { addTextItem } from '../app/actions.js';
import { state, bus } from '../app/state.js';
import { renderStamp, stampLabel } from './stamp-render.js';
import { $$ } from './dom.js';

const STAMP_WIDTH = 0.04; // fraction of the page width

export function initStampTool() {
  const buttons = $$('[data-stamp]');
  const update = () => buttons.forEach((b) => (b.disabled = !state.doc));
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const shape = b.dataset.stamp;
      addTextItem('stamp', renderStamp(shape), stampLabel(shape), '', STAMP_WIDTH);
    }),
  );
  bus.on('document', update);
  update();
}
