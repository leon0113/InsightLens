import { describe, expect, it } from 'vitest';
import { niceTicks } from './chart';

describe('niceTicks', () => {
  it('picks round steps inside the range', () => {
    expect(niceTicks(80, 162)).toEqual([80, 100, 120, 140, 160]);
    expect(niceTicks(1, 96)).toEqual([20, 40, 60, 80]);
  });

  it('handles small decimal ranges without floating point noise', () => {
    expect(niceTicks(0.1, 0.9)).toEqual([0.2, 0.4, 0.6, 0.8]);
  });

  it('handles negative values', () => {
    expect(niceTicks(-10, 10)).toEqual([-10, -5, 0, 5, 10]);
  });

  it('returns the single value of an empty range', () => {
    expect(niceTicks(7, 7)).toEqual([7]);
  });
});
