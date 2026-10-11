// Entry point: wires the components together. No logic lives here.
import './styles/index.css';
import { initThemeToggle } from './ui/theme-toggle.js';
import { initAssetsPanel } from './ui/assets-panel.js';
import { initPdfPicker } from './ui/pdf-picker.js';
import { initPageView } from './ui/page-view.js';
import { initPlacementLayer } from './ui/placement-layer.js';
import { initToolbar } from './ui/toolbar.js';
import { initDateTool } from './ui/date-tool.js';
import { initTextTool } from './ui/text-tool.js';
import { initStampTool } from './ui/stamp-tool.js';
import { initBatch } from './ui/batch.js';
import { initMobileUi } from './ui/mobile-ui.js';
import { initDownload } from './ui/download.js';
import { initAbout } from './ui/about.js';

initThemeToggle();
initAbout();
initToolbar();
initPlacementLayer();
initPageView();
initPdfPicker();
initDateTool();
initTextTool();
initStampTool();
initBatch();
initMobileUi();
initDownload();
initAssetsPanel();

// Offline support: the service worker saves the app so it opens without the server.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
