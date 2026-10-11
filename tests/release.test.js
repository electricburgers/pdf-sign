// Release hygiene: the version, date and changelog must agree.
import { describe, it, expect } from 'vitest';
import { read } from './helpers/html.js';

const pkg = JSON.parse(read('package.json'));
const readme = read('README.md');
const changelog = read('CHANGELOG.md');
const versions = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/gm)].map((m) => ({ version: m[1], date: m[2] }));
const parts = (v) => v.split('.').map(Number);

describe('release', () => {
  it('uses a plain x.y.z version', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('shows the same version at the top of the README and the changelog', () => {
    expect(/\*\*Version (\d+\.\d+\.\d+) —/.exec(readme)[1]).toBe(pkg.version);
    expect(versions[0].version).toBe(pkg.version);
  });

  it('lists changelog versions newest first, never repeating one', () => {
    for (let i = 1; i < versions.length; i += 1) {
      const [a, b] = [parts(versions[i - 1].version), parts(versions[i].version)];
      const newer = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
      expect(newer, `${versions[i - 1].version} before ${versions[i].version}`).toBeGreaterThan(0);
    }
  });

  it('stamps the release date with a time and UTC offset', () => {
    expect(pkg.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(Number.isNaN(new Date(pkg.releaseDate).getTime())).toBe(false);
  });

  it('shows that release date and time next to the README version', () => {
    const [, date, time, offset] = /\*\*Version [\d.]+ — (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) \((UTC[+-][\d:]+)\)\*\*/.exec(readme);
    expect(pkg.releaseDate.startsWith(`${date}T${time}`)).toBe(true);
    const o = /([+-])(\d{2}):(\d{2})$/.exec(pkg.releaseDate);
    expect(offset).toBe(`UTC${o[1]}${Number(o[2])}${o[3] === '00' ? '' : `:${o[3]}`}`);
  });

  it('dates the newest changelog entry on or before the release date', () => {
    expect(versions[0].date <= pkg.releaseDate.slice(0, 10)).toBe(true);
  });
});
