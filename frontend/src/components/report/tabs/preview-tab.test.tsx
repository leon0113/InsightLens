import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PREVIEW_PAGE_SIZE, PreviewTab } from './preview-tab';

const preview = {
  columns: ['id', 'note'],
  rows: Array.from({ length: 30 }, (_, i) => [
    String(i + 1),
    i === 0 ? null : `row ${i + 1}`,
  ]),
};

describe('PreviewTab', () => {
  it('pages through the rows and marks empty cells', async () => {
    render(<PreviewTab preview={preview} />);

    expect(screen.getAllByRole('row')).toHaveLength(PREVIEW_PAGE_SIZE + 1);
    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getAllByRole('row')).toHaveLength(30 - PREVIEW_PAGE_SIZE + 1);
    expect(screen.getByText('Rows 26 to 30 of 30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
