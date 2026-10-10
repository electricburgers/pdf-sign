# Changelog

All notable changes to PDF Sign are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-10

### Added
- Separate layouts for phone, tablet and desktop. On desktop the tools sit in a sticky sidebar next to a large page preview; on phones the move, size and download controls stay pinned to the bottom of the screen.
- Tap buttons to move and resize the selected signature or initials, so dragging is never required (WCAG 2.5.7).
- Keyboard control for placed images: arrow keys move (Shift for larger steps), plus and minus resize, Delete removes, Escape deselects.
- Skip link, a page heading, screen-reader announcements for adds, removals and errors, and visible focus rings on every control.
- About section with the version, release date and a disclaimer that the app was built with Claude, an AI model made by Anthropic.
- This changelog.
- 30 new tests (105 in total), including automated WCAG AA contrast checks for both themes.

### Changed
- Double-tap no longer zooms the page on iPhone and iPad. Pinch-to-zoom still works.
- Split the app into small modules: pure logic in `src/lib`, shared state and actions in `src/app`, one file per screen component in `src/ui`, and styles in `src/styles` (tokens, base, components, layout).
- New cool-gray color palette with ink-blue accent; every text and control color meets WCAG AA contrast in light and dark mode.
- Upload buttons can now be reached with the keyboard.

### Performance
- Placements are stored in an indexed store: lookups and updates are O(1) and showing a page touches only that page's placements, instead of filtering the whole list.
- Dragging updates at most once per animation frame and only redraws the item being dragged.
- The last 3 rendered pages are cached, so flipping back is instant; evicted pages free their canvas memory immediately.
- Page renders that are no longer needed are cancelled instead of queueing up.
- Page sizes are measured in parallel when a PDF opens.
- Signature and initials images are decoded once instead of on every download.
- Ink cropping scans inward from the edges and stops early instead of reading every pixel.

## [1.0.0] - 2026-10-10

### Added
- Sign PDFs with an uploaded signature image, plus initials.
- Automatic paper-background removal and cropping for photos of signatures.
- Drag to place, corner handle to resize, copy initials to every page.
- Correct placement on rotated pages and pages with crop boxes.
- Signature and initials saved on the device; files never leave the browser.
- Light, dark and automatic themes.
- Docker image (nginx) with `compose.yml` on port 8296.
- 75 tests.
