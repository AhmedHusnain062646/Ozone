// ABOUTME: ImageStorage interface plus the local-disk implementation used in development and tests.
// ABOUTME: Content type is decided by magic bytes, never by the client-supplied name or MIME type (SVG/HTML are refused).
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface StoredImage { url: string }

export interface ImageStorage {
  save(bytes: Buffer, ext: ImageExt): Promise<StoredImage>;
  remove(url: string): Promise<void>;
}

export type ImageExt = 'png' | 'jpg' | 'webp';

/** @returns the extension for a real PNG/JPEG/WebP, or undefined for anything else. */
export function sniffImage(b: Buffer): ImageExt | undefined {
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return undefined;
}

export function createLocalDiskStorage(dir: string): ImageStorage {
  return {
    async save(bytes, ext) {
      await fs.mkdir(dir, { recursive: true });
      const name = `${randomUUID()}.${ext}`;
      await fs.writeFile(path.join(dir, name), bytes, { flag: 'wx' });
      return { url: `/uploads/${name}` };
    },
    async remove(url) {
      const name = path.basename(url); // basename: a stored url can never escape the upload dir
      await fs.rm(path.join(dir, name), { force: true });
    },
  };
}
