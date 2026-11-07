// One fixed locale, so the server and the browser render identical text and
// every number in the app follows the same rules.
const LOCALE = 'en-US';

export const MISSING_VALUE = '—';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'];

/** Whole counts with thousands separators: 3000 -> "3,000". */
export function formatCount(value: number): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits: 0 });
}

/**
 * Statistics such as a mean or a fence: thousands separators, at most
 * `maxDecimals` decimals and no trailing zeros. Null (no value) becomes a dash.
 */
export function formatNumber(value: number | null, maxDecimals = 2): string {
  if (value === null) return MISSING_VALUE;
  return withoutNegativeZero(
    value.toLocaleString(LOCALE, { maximumFractionDigits: maxDecimals }),
  );
}

// -0.001 rounded to two decimals prints as "-0"; a zero has no sign.
function withoutNegativeZero(text: string): string {
  return /^-0(\.0+)?$/.test(text) ? text.slice(1) : text;
}

/** The report stores percentages as 0 to 100: 7.76 -> "7.76%". */
export function formatPercent(value: number, maxDecimals = 2): string {
  return `${formatNumber(value, maxDecimals)}%`;
}

/** File and memory sizes in binary units: 2424437 -> "2.3 MB". */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const decimals = unit === 0 ? 0 : 1;
  return `${formatNumber(value, decimals)} ${BYTE_UNITS[unit]}`;
}

/** Pearson r with a fixed two decimals, so a column of values lines up. */
export function formatCorrelation(r: number | null): string {
  if (r === null) return MISSING_VALUE;
  return withoutNegativeZero(
    r.toLocaleString(LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
}

/** A report month key: "2025-01" -> "Jan 2025". */
export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-');
  return `${MONTHS[Number(monthNumber) - 1]} ${year}`;
}

/** An engine timestamp (UTC, no zone suffix): "2025-01-06T00:00:00" -> "Jan 6, 2025". */
export function formatDate(timestamp: string): string {
  const [year, month, day] = timestamp.slice(0, 10).split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/**
 * An API timestamp in the viewer's time zone: "Nov 7, 2026, 2:05 PM".
 * Only used for data fetched in the browser, so it never differs from a server render.
 */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));
}

/** Short axis labels: 1234 -> "1.2K", 2500000 -> "2.5M". */
export function formatCompact(value: number): string {
  return value.toLocaleString(LOCALE, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}
