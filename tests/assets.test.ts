import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST, ASSET_SOURCES } from '../src/data/assets';

const publicPath = (url: string) => join(process.cwd(), 'public', url);

describe('external asset manifest', () => {
  it('uses unique stable keys and only local URLs', () => {
    const keys = ASSET_MANIFEST.map((asset) => asset.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const asset of ASSET_MANIFEST) {
      expect(asset.url).toMatch(/^assets\//);
      expect(asset.url).not.toMatch(/^https?:/);
    }
  });

  it('references packaged files and documented licenses', () => {
    for (const asset of ASSET_MANIFEST) {
      expect(existsSync(publicPath(asset.url)), asset.url).toBe(true);
      const source = ASSET_SOURCES[asset.sourceId];
      expect(source.license).toBe('CC0 1.0');
      expect(source.sourceUrl).toMatch(/^https:\/\/kenney\.nl\/assets\//);
      expect(existsSync(publicPath(source.licenseFile)), source.licenseFile).toBe(true);
    }
  });

  it('uses valid PNG frame dimensions for every spritesheet', () => {
    for (const asset of ASSET_MANIFEST) {
      if (asset.kind !== 'spritesheet') continue;
      const png = readFileSync(publicPath(asset.url));
      expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      const strideX = asset.frameWidth + (asset.spacing ?? 0);
      const strideY = asset.frameHeight + (asset.spacing ?? 0);
      expect(width).toBeGreaterThanOrEqual(asset.frameWidth);
      expect(height).toBeGreaterThanOrEqual(asset.frameHeight);
      expect(Math.floor(width / strideX)).toBeGreaterThan(0);
      expect(Math.floor(height / strideY)).toBeGreaterThan(0);
    }
  });

  it('keeps the curated payload below five megabytes', () => {
    const uniqueFiles = new Set(ASSET_MANIFEST.map((asset) => asset.url));
    const bytes = [...uniqueFiles].reduce((total, url) => total + statSync(publicPath(url)).size, 0);
    expect(bytes).toBeLessThan(5 * 1024 * 1024);
  });
});
