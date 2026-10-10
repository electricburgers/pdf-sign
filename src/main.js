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
initDownload();
initAssetsPanel();
