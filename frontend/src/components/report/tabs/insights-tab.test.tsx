import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Insight } from '@/lib/api/types';
import { InsightsTab } from './insights-tab';

const insight = (severity: Insight['severity'], title: string): Insight => ({
  rule: 'high_missing_rate',
  severity,
  title,
  message: `${title}, explained.`,
  columns: ['note'],
  metrics: [{ label: 'Missing', value: 62.5, unit: 'percent' }],
});

const insights = [
  insight('critical', 'High missing rate in note'),
  insight('warning', 'Heavy skew in amount'),
  insight('info', 'order_id looks like an identifier'),
];

describe('InsightsTab', () => {
  it('shows every insight with its numbers, and filters by severity', async () => {
    render(<InsightsTab insights={insights} />);

    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getAllByText('62.5%')).toHaveLength(3);

    await userEvent.click(screen.getByRole('button', { name: /Warnings/ }));

    const visible = screen.getAllByRole('article');
    expect(visible).toHaveLength(1);
    expect(
      within(visible[0]!).getByText('Heavy skew in amount'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Warnings/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('says so when there is nothing to report', () => {
    render(<InsightsTab insights={[]} />);
    expect(screen.getByText('No issues found')).toBeInTheDocument();
  });
});
