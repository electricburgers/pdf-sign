import { describe, it, expect } from 'vitest';
import { crc32, createZip, uniqueNames } from '../src/lib/zip.js';

const enc = (s) => new TextEncoder().encode(s);

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(enc('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe('uniqueNames', () => {
  it('numbers repeated names and leaves others alone', () => {
    expect(uniqueNames(['a.pdf', 'b.pdf', 'a.pdf', 'a.pdf', 'noext', 'noext'])).toEqual([
      'a.pdf', 'b.pdf', 'a (2).pdf', 'a (3).pdf', 'noext', 'noext (2)',
    ]);
  });
});

describe('createZip', () => {
  const files = [
    { name: 'one-signed.pdf', bytes: enc('%PDF-one') },
    { name: 'två.pdf', bytes: enc('%PDF-two-two') },
  ];
  const zip = createZip(files, new Date(2026, 9, 10, 12, 0, 0));
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

  it('ends with a valid end-of-central-directory record', () => {
    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
  });

  it('stores each file so it can be read back at the recorded offsets', () => {
    const end = zip.length - 22;
    let entry = view.getUint32(end + 16, true); // start of the central directory
    const out = [];
    for (let i = 0; i < 2; i += 1) {
      expect(view.getUint32(entry, true)).toBe(0x02014b50);
      const crc = view.getUint32(entry + 16, true);
      const size = view.getUint32(entry + 24, true);
      const nameLen = view.getUint16(entry + 28, true);
      const offset = view.getUint32(entry + 42, true);
      const name = new TextDecoder().decode(zip.slice(entry + 46, entry + 46 + nameLen));
      expect(view.getUint32(offset, true)).toBe(0x04034b50);
      const dataStart = offset + 30 + view.getUint16(offset + 26, true);
      const data = zip.slice(dataStart, dataStart + size);
      expect(crc32(data)).toBe(crc);
      out.push([name, new TextDecoder().decode(data)]);
      entry += 46 + nameLen;
    }
    expect(out).toEqual([['one-signed.pdf', '%PDF-one'], ['två.pdf', '%PDF-two-two']]);
  });

  it('can be empty', () => {
    expect(createZip([]).length).toBe(22);
  });
});
