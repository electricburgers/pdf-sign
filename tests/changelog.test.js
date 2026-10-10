import { describe, it, expect } from 'vitest';
import { latestChanges } from '../src/lib/changelog.js';

const sample = `# Changelog

## [1.3.0] - 2026-10-10

### Added
- A \`thing\` with [a link](https://example.com).

### Changed
- Something else.

## [1.2.0] - 2026-09-01

### Added
- Old item.
`;

describe('latestChanges', () => {
  it('returns only the newest release, grouped by heading, as plain text', () => {
    expect(latestChanges(sample)).toEqual([
      { heading: 'Added', items: ['A thing with a link.'] },
      { heading: 'Changed', items: ['Something else.'] },
    ]);
  });

  it('returns nothing for empty input', () => {
    expect(latestChanges('')).toEqual([]);
  });
});
