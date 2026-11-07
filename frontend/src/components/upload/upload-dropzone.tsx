'use client';

import { FileUp } from 'lucide-react';
import { useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { MAX_UPLOAD_BYTES } from '@/lib/config';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

const EMPTY_FILE = 'file-empty';

/** Turns react-dropzone's rejection codes into one sentence for the user. */
export function rejectionMessage(rejections: FileRejection[]): string {
  if (rejections.length > 1) return 'Drop one file at a time.';
  const code = rejections[0]?.errors[0]?.code;
  switch (code) {
    case 'file-invalid-type':
      return 'Only .csv files are accepted.';
    case 'file-too-large':
      return `The file is larger than the ${formatBytes(MAX_UPLOAD_BYTES)} limit.`;
    case EMPTY_FILE:
      return 'The file is empty.';
    default:
      return 'This file cannot be uploaded.';
  }
}

export function UploadDropzone({ onFile }: { onFile: (file: File) => void }) {
  const [error, setError] = useState<string | null>(null);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    maxSize: MAX_UPLOAD_BYTES,
    multiple: false,
    validator: (file) =>
      file.size === 0
        ? { code: EMPTY_FILE, message: 'The file is empty.' }
        : null,
    onDropAccepted: (files) => {
      setError(null);
      onFile(files[0]!);
    },
    onDropRejected: (rejections) => setError(rejectionMessage(rejections)),
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps({
          'aria-label': 'Choose a CSV file to upload',
          'aria-describedby': error ? 'upload-error' : 'upload-hint',
        })}
        className={cn(
          'bg-card flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors',
          'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
          isDragActive
            ? 'border-primary bg-primary-soft/40'
            : 'hover:border-primary/50 border-border',
          error && !isDragActive && 'border-critical/50',
        )}
      >
        <input {...getInputProps()} />
        <span className="bg-primary-soft text-primary-strong flex size-12 items-center justify-center rounded-full">
          <FileUp className="size-5" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <p className="text-base font-medium">
            {isDragActive
              ? 'Drop the file to upload it'
              : 'Drag a CSV file here'}
          </p>
          <p className="text-muted-foreground text-sm">
            or{' '}
            <span className="text-primary font-medium">browse your files</span>
          </p>
        </div>
        <p id="upload-hint" className="text-muted-foreground text-xs">
          One .csv file, up to {formatBytes(MAX_UPLOAD_BYTES)}
        </p>
      </div>
      {error && (
        <p id="upload-error" role="alert" className="text-critical text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
