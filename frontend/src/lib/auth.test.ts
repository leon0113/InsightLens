import { describe, expect, it } from 'vitest';
import { safeNextPath } from './auth';

describe('safeNextPath', () => {
  it('keeps paths on this site', () => {
    expect(safeNextPath('/datasets/abc?tab=insights')).toBe(
      '/datasets/abc?tab=insights',
    );
    expect(safeNextPath('/upload')).toBe('/upload');
  });

  it('falls back to the datasets page for anything else', () => {
    expect(safeNextPath(null)).toBe('/datasets');
    expect(safeNextPath('https://evil.example')).toBe('/datasets');
    expect(safeNextPath('//evil.example')).toBe('/datasets');
    expect(safeNextPath('/\\evil.example')).toBe('/datasets');
    expect(safeNextPath('datasets')).toBe('/datasets');
  });
});
