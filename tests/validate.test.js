import { describe, it, expect } from 'vitest';
import {
  isPdfFile,
  isImageFile,
  isPdfBytes,
  signedFileName,
  parseDataUrl,
  checkFileSize,
} from '../src/lib/validate.js';

describe('isPdfFile', () => {
  it('accepts application/pdf', () => {
    expect(isPdfFile({ name: 'a.pdf', type: 'application/pdf' })).toBe(true);
  });
  it('falls back to the extension when the mime type is empty', () => {
    expect(isPdfFile({ name: 'Lease.PDF', type: '' })).toBe(true);
  });
  it('rejects images', () => {
    expect(isPdfFile({ name: 'a.png', type: 'image/png' })).toBe(false);
  });
});

describe('isImageFile', () => {
  it('accepts png, jpeg, webp and heic', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/heic']) {
      expect(isImageFile({ name: 'x', type })).toBe(true);
    }
  });
  it('rejects pdf and svg', () => {
    expect(isImageFile({ name: 'a.pdf', type: 'application/pdf' })).toBe(false);
    expect(isImageFile({ name: 'a.svg', type: 'image/svg+xml' })).toBe(false);
  });
});

describe('isPdfBytes', () => {
  it('detects a %PDF header', () => {
    expect(isPdfBytes(new TextEncoder().encode('%PDF-1.7\n...'))).toBe(true);
  });
  it('rejects bytes without a PDF header', () => {
    expect(isPdfBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });
});

describe('signedFileName', () => {
  it('appends -signed and keeps a .pdf extension', () => {
    expect(signedFileName('Lease.pdf')).toBe('Lease-signed.pdf');
    expect(signedFileName('SCAN.PDF')).toBe('SCAN-signed.pdf');
    expect(signedFileName('contract')).toBe('contract-signed.pdf');
  });
});

describe('parseDataUrl', () => {
  it('returns the mime type and decoded bytes', () => {
    const { mime, bytes } = parseDataUrl('data:image/png;base64,AQID');
    expect(mime).toBe('image/png');
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });
});

describe('checkFileSize', () => {
  it('flags files over the limit with a readable message', () => {
    expect(checkFileSize(10, 100).ok).toBe(true);
    const res = checkFileSize(150 * 1024 * 1024, 100 * 1024 * 1024);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/100 MB/);
  });
});

describe('validation edge cases', () => {
  it('finds the PDF header after junk, but only within the first 1 KB', () => {
    const near = new Uint8Array(600).fill(0x20);
    near.set([0x25, 0x50, 0x44, 0x46], 500);
    expect(isPdfBytes(near)).toBe(true);
    const far = new Uint8Array(2000).fill(0x20);
    far.set([0x25, 0x50, 0x44, 0x46], 1500);
    expect(isPdfBytes(far)).toBe(false);
  });

  it('is not fooled by tiny or empty files', () => {
    expect(isPdfBytes(new Uint8Array())).toBe(false);
    expect(isPdfBytes(new Uint8Array([0x25, 0x50]))).toBe(false);
  });

  it('allows a file of exactly the limit and rejects one byte more', () => {
    expect(checkFileSize(100, 100).ok).toBe(true);
    const over = checkFileSize(101, 100);
    expect(over.ok).toBe(false);
    expect(over.message).toMatch(/too large/i);
  });

  it('names signed files from the base name, whatever the extension case', () => {
    expect(signedFileName('Lease.PDF')).toBe('Lease-signed.pdf');
    expect(signedFileName('')).toBe('document-signed.pdf');
    expect(signedFileName('a.b.pdf')).toBe('a.b-signed.pdf');
  });

  it('decodes non-base64 data URLs and rejects malformed ones', () => {
    const { mime, bytes } = parseDataUrl('data:text/plain,hi%20there');
    expect(mime).toBe('text/plain');
    expect(new TextDecoder().decode(bytes)).toBe('hi there');
    expect(() => parseDataUrl('not a data url')).toThrow();
  });
});
