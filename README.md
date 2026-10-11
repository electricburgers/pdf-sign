# PDF Sign

**Version 1.5.0 — 2026-10-10 20:45 (UTC-4)** · see [CHANGELOG.md](CHANGELOG.md)

A small self-hosted web app that does one thing: put your **signature** and **initials** images on a PDF.

- Upload your signature and initials once (photo or image); they're saved in that browser only.
- Paper background is removed automatically (adaptive, so grayish phone photos work).
- Place by dragging, by tapping the move and size buttons, or with the keyboard. "Copy to all pages" handles initials.
- Add a typed date (with the native date picker) or free text, each with its own font picker; Open Sans and Noto Serif are bundled.
- Checkmark/X stamps, color and rotation, undo/redo, optional form flattening, and "Sign other PDFs the same way" (several files download as one ZIP).
- Works offline once opened: a service worker saves the app (HTTPS or localhost needed on iPhone).
- Handles rotated pages and crop boxes correctly.
- Separate phone, tablet and desktop layouts; light, dark and auto themes.
- Meets WCAG 2.2 AA (automated contrast tests plus axe-core scans at all three sizes in both themes).
- No double-tap zoom on iPhone/iPad; pinch-zoom still works.
- 100% client-side: the PDF and images never leave your device. Served by nginx; no backend.

Built on the same libraries PDFCraft uses (pdf.js for preview, pdf-lib for writing), without PDFCraft's code.

> This adds a visible signature image, not a certificate-based digital signature.
> Built with Claude, an AI model made by Anthropic. Review every signed PDF before you send it.

## Run with Docker (port 8296)

```bash
docker compose up -d --build
```

Open `http://<host>:8296`. The image build runs the full test suite first and fails if any test fails.

On ServerYes (OrbStack):

```bash
mkdir -p ~/containers && tar -xzf pdf-sign.tar.gz -C ~/containers
cd ~/containers/pdf-sign
docker compose up -d --build
# → http://192.168.0.13:8296
```

Health check: `curl http://localhost:8296/healthz`.

## Develop

```bash
npm install
npm test        # 105 tests (vitest)
npm run dev     # http://localhost:8296
npm run build   # static site in dist/
```

## Structure

Pure, tested logic is kept apart from DOM code, and each screen component lives in its own file.

```
src/
  main.js            entry point: wires components together, no logic
  app/
    state.js         shared state, placement store, event bus
    actions.js       add / move / resize / remove / copy, used by drag, keys and buttons alike
  lib/               pure functions, all unit-tested
    geometry.js      screen ↔ PDF coordinates, rotation, crop box
    placements.js    placement model in page fractions
    placementStore.js indexed store: O(1) updates, O(k) per-page reads
    exportPdf.js     embeds images with pdf-lib
    transparency.js  background removal, early-exit ink cropping
    lru.js           page-render cache
    schedule.js      requestAnimationFrame throttle, debounce
    keyboard.js      key → action mapping
    contrast.js      WCAG contrast math + token parser
    layout.js        breakpoints (640 / 1024)
    memo.js, storage.js, validate.js, theme.js
  ui/                one module per component
    assets-panel.js  step 1: signature + initials
    pdf-picker.js    step 2: choose / drop a PDF
    pdf-engine.js    pdf.js loading, cancellable cached rendering
    page-view.js     page preview + paging
    placement-layer.js placements on the page: pointer + keyboard
    toolbar.js       add buttons, move/size buttons, summary
    download.js      export
    theme-toggle.js, announce.js, about.js, image.js, dom.js
  styles/
    tokens.css       colors (AA-tested), type, radii
    base.css         reset, focus, skip link, touch-action, reduced motion
    components.css   panels, buttons, assets, desk, placements, toast
    layout.css       mobile / tablet / desktop grids
tests/               105 vitest tests
```
