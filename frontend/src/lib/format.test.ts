import { describe, expect, it } from 'vitest';
import {
  MISSING_VALUE,
  formatBytes,
  formatCompact,
  formatCorrelation,
  formatCount,
  formatDate,
  formatDateTime,
  formatMonth,
  formatNumber,
  formatPercent,
} from './format';

describe('formatCount', () => {
  it('adds thousands separators', () => {
    expect(formatCount(3000)).toBe('3,000');
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(formatCount(0)).toBe('0');
  });
});

describe('formatNumber', () => {
  it('rounds to two decimals and drops trailing zeros', () => {
    expect(formatNumber(121.596485)).toBe('121.6');
    expect(formatNumber(53.657162)).toBe('53.66');
    expect(formatNumber(48)).toBe('48');
    expect(formatNumber(22870.4)).toBe('22,870.4');
  });

  it('keeps the sign of negative values', () => {
    expect(formatNumber(-17.125)).toBe('-17.13');
  });

  it('never prints a negative zero', () => {
    expect(formatNumber(-0.001)).toBe('0');
  });

  it('accepts a different number of decimals', () => {
    expect(formatNumber(11.0307, 4)).toBe('11.0307');
  });

  it('shows a dash for a missing value', () => {
    expect(formatNumber(null)).toBe(MISSING_VALUE);
  });
});

describe('formatPercent', () => {
  it('formats values already on a 0 to 100 scale', () => {
    expect(formatPercent(7.76)).toBe('7.76%');
    expect(formatPercent(40)).toBe('40%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(0.5)).toBe('0.5%');
  });
});

describe('formatBytes', () => {
  it('picks a binary unit', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(2424437)).toBe('2.3 MB');
    expect(formatBytes(50 * 1024 * 1024)).toBe('50 MB');
    expect(formatBytes(3 * 1024 ** 3)).toBe('3 GB');
  });
});

describe('formatCompact', () => {
  it('shortens large numbers for axis labels', () => {
    expect(formatCompact(950)).toBe('950');
    expect(formatCompact(1234)).toBe('1.2K');
    expect(formatCompact(2500000)).toBe('2.5M');
  });
});

describe('formatCorrelation', () => {
  it('always shows two decimals', () => {
    expect(formatCorrelation(0.8635)).toBe('0.86');
    expect(formatCorrelation(1)).toBe('1.00');
    expect(formatCorrelation(-0.0364)).toBe('-0.04');
    expect(formatCorrelation(-0.0019)).toBe('0.00');
  });

  it('shows a dash when r could not be computed', () => {
    expect(formatCorrelation(null)).toBe(MISSING_VALUE);
  });
});

describe('dates', () => {
  it('formats a month key', () => {
    expect(formatMonth('2025-01')).toBe('Jan 2025');
    expect(formatMonth('2026-12')).toBe('Dec 2026');
  });

  it('formats an engine timestamp without shifting the day', () => {
    expect(formatDate('2025-01-06T00:00:00')).toBe('Jan 6, 2025');
    expect(formatDate('2025-12-31T23:59:59')).toBe('Dec 31, 2025');
  });

  it('formats an API timestamp with the time in a given zone', () => {
    expect(formatDateTime('2026-11-07T14:05:00.000Z', 'UTC')).toBe(
      'Nov 7, 2026, 2:05 PM',
    );
  });
});
