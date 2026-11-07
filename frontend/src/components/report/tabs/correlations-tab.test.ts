import { describe, expect, it } from 'vitest';
import { correlationColor, describeCorrelation } from './correlations-tab';

describe('correlation helpers', () => {
  it('mixes the positive or negative color by strength', () => {
    expect(correlationColor(0.86)).toBe(
      'color-mix(in oklch, var(--chart-1) 43%, var(--card))',
    );
    expect(correlationColor(-0.5)).toBe(
      'color-mix(in oklch, var(--chart-negative) 25%, var(--card))',
    );
    expect(correlationColor(null)).toBe('var(--muted)');
  });

  it('only names a direction when r is not close to zero', () => {
    expect(describeCorrelation(0.93)).toBe('Rise together');
    expect(describeCorrelation(-0.4)).toBe('Move in opposite directions');
    expect(describeCorrelation(-0.03)).toBe('Little or no linear relationship');
  });
});
