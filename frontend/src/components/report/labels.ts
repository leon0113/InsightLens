import {
  CalendarDays,
  Hash,
  KeyRound,
  Tags,
  ToggleLeft,
  Type,
  type LucideIcon,
} from 'lucide-react';
import type { ColumnType, InsightMetric } from '@/lib/api/types';
import { formatCount, formatNumber, formatPercent } from '@/lib/format';

export const COLUMN_TYPES: Record<
  ColumnType,
  { label: string; icon: LucideIcon; color: string; description: string }
> = {
  numeric: {
    label: 'Numeric',
    icon: Hash,
    color: 'var(--chart-1)',
    description: 'Numbers you can average and plot',
  },
  categorical: {
    label: 'Categorical',
    icon: Tags,
    color: 'var(--chart-2)',
    description: 'A limited set of repeating values',
  },
  datetime: {
    label: 'Date and time',
    icon: CalendarDays,
    color: 'var(--chart-3)',
    description: 'Dates, read from text',
  },
  boolean: {
    label: 'Boolean',
    icon: ToggleLeft,
    color: 'var(--chart-4)',
    description: 'Two values such as yes and no',
  },
  text: {
    label: 'Text',
    icon: Type,
    color: 'var(--chart-5)',
    description: 'Free text, mostly unique',
  },
  id: {
    label: 'Identifier',
    icon: KeyRound,
    color: 'var(--chart-6)',
    description: 'Unique keys that identify rows',
  },
};

export const COLUMN_TYPE_ORDER: ColumnType[] = [
  'numeric',
  'categorical',
  'datetime',
  'boolean',
  'text',
  'id',
];

const ENCODINGS: Record<string, string> = {
  'utf-8': 'UTF-8',
  'utf-8-sig': 'UTF-8 with byte order mark',
  'utf-16': 'UTF-16',
  cp1252: 'Windows-1252',
  'latin-1': 'Latin-1',
};

const DELIMITERS: Record<string, string> = {
  ',': 'Comma',
  ';': 'Semicolon',
  '\t': 'Tab',
  '|': 'Pipe',
};

export const encodingLabel = (encoding: string) =>
  ENCODINGS[encoding] ?? encoding;

export const delimiterLabel = (delimiter: string) =>
  DELIMITERS[delimiter] ?? `"${delimiter}"`;

export function formatMetric(metric: InsightMetric): string {
  if (metric.unit === 'percent') return formatPercent(metric.value);
  if (metric.unit === 'count') return formatCount(metric.value);
  return formatNumber(metric.value, 4);
}
