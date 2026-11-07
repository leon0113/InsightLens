import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UploadDropzone } from './upload-dropzone';

const fileInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement;

describe('UploadDropzone', () => {
  it('passes a CSV file on', async () => {
    const onFile = vi.fn();
    const { container } = render(<UploadDropzone onFile={onFile} />);
    const file = new File(['a,b\n1,2\n'], 'sales.csv', { type: 'text/csv' });

    await userEvent.upload(fileInput(container), file);

    await waitFor(() => expect(onFile).toHaveBeenCalledWith(file));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects other file types with a clear message', async () => {
    const onFile = vi.fn();
    const { container } = render(<UploadDropzone onFile={onFile} />);
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });

    await userEvent.upload(fileInput(container), file, { applyAccept: false });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only .csv files are accepted.',
    );
    expect(onFile).not.toHaveBeenCalled();
  });

  it('rejects an empty file', async () => {
    const onFile = vi.fn();
    const { container } = render(<UploadDropzone onFile={onFile} />);

    await userEvent.upload(
      fileInput(container),
      new File([], 'empty.csv', { type: 'text/csv' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The file is empty.',
    );
    expect(onFile).not.toHaveBeenCalled();
  });
});
