// The entry point wires modules together by name. A rename that misses main.js
// only fails at build time, so check every import here.
import { describe, it, expect } from 'vitest';
import { read } from './helpers/html.js';
import { existsSync } from 'node:fs';

const main = read('src/main.js');
const imports = [...main.matchAll(/import\s*\{([^}]+)\}\s*from\s*'(\.[^']+)'/g)].map((m) => ({
  names: m[1].split(',').map((s) => s.trim()).filter(Boolean),
  file: m[2].replace(/^\.\//, 'src/'),
}));

describe('src/main.js', () => {
  it('imports from files that exist', () => {
    for (const { file } of imports) expect(existsSync(new URL(`../${file}`, import.meta.url)), file).toBe(true);
  });

  it('only imports names that those files export', () => {
    for (const { names, file } of imports) {
      const src = read(file);
      for (const name of names) expect(src, `${name} in ${file}`).toMatch(new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${name}\\b`));
    }
  });

  it('starts every module it imports', () => {
    for (const { names } of imports) for (const name of names) expect(main, name).toMatch(new RegExp(`\\b${name}\\(\\)`));
  });
});
