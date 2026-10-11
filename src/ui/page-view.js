// Step 3 viewer: shows the current page on the desk and handles paging.
import { displaySize, fitScale } from '../lib/geometry.js';
import { layoutFor } from '../lib/layout.js';
import { debounce } from '../lib/schedule.js';
import { state, bus, select } from '../app/state.js';
import { toast } from './announce.js';
import { $ } from './dom.js';

// Bigger previews on bigger screens.
const MAX_SCALE = { mobile: 1.5, tablet: 1.75, desktop: 2 };

let token = 0;

async function show() {
  if (!state.doc) return;
  const my = ++token;
  const index = state.pageIndex;

  // Read layout once, before any DOM writes (avoids forced reflow).
  const stage = $('#stage');
  const styles = getComputedStyle(stage);
  const available = stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const layout = layoutFor(window.innerWidth);

  try {
    const { renderPage, pageSize } = await import('./pdf-engine.js');
    const size = await pageSize(state.doc, index);
    const box = { x: 0, y: 0, width: size.width, height: size.height };
    let cssScale = fitScale(box, 0, available, MAX_SCALE[layout]);
    if (layout === 'desktop') {
      // Fit the whole page in the viewport height on desktop.
      const maxH = window.innerHeight - 240;
      cssScale = Math.min(cssScale, Math.max(0.4, maxH / size.height));
    }
    const css = displaySize(box, 0, cssScale);
    const canvas = await renderPage(state.doc, index, cssScale, size);
    if (!canvas || my !== token) return; // superseded

    // Writes.
    canvas.id = 'pageCanvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Page ${index + 1} of ${state.pageCount}`);
    canvas.style.width = `${css.width}px`;
    canvas.style.height = `${css.height}px`;
    const current = $('#pageCanvas');
    if (current !== canvas) current.replaceWith(canvas);
    const page = $('#page');
    page.style.width = `${css.width}px`;
    page.style.height = `${css.height}px`;
    state.pageDisplay = css;

    $('#pageLabel').textContent = `Page ${index + 1} of ${state.pageCount}`;
    $('#prevPage').disabled = index === 0;
    $('#nextPage').disabled = index >= state.pageCount - 1;
    bus.emit('page', index);
  } catch (err) {
    toast("This page couldn't be displayed.", { error: true });
  }
}

export function goToPage(index) {
  if (index < 0 || index >= state.pageCount || index === state.pageIndex) return;
  state.pageIndex = index;
  select(null);
  show();
}

export function initPageView() {
  $('#prevPage').addEventListener('click', () => goToPage(state.pageIndex - 1));
  $('#nextPage').addEventListener('click', () => goToPage(state.pageIndex + 1));

  bus.on('document', () => {
    $('#emptyState').hidden = true;
    $('#editorBody').hidden = false;
    show().then(() => {
      if (window.innerWidth < 1024) $('#editor').scrollIntoView({ block: 'start' });
    });
  });

  let lastWidth = window.innerWidth;
  window.addEventListener(
    'resize',
    debounce(() => {
      // iOS fires resize when the toolbar shows/hides; only re-render if the width changed.
      if (window.innerWidth === lastWidth && layoutFor(window.innerWidth) !== 'desktop') return;
      lastWidth = window.innerWidth;
      show();
    }, 150),
  );
}
