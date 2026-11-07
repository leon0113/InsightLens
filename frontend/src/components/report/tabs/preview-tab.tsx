'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Preview } from '@/lib/api/types';
import { formatCount } from '@/lib/format';

export const PREVIEW_PAGE_SIZE = 25;

export function PreviewTab({ preview }: { preview: Preview }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(
    1,
    Math.ceil(preview.rows.length / PREVIEW_PAGE_SIZE),
  );
  const first = page * PREVIEW_PAGE_SIZE;
  const rows = preview.rows.slice(first, first + PREVIEW_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        The first {formatCount(preview.rows.length)} rows as they were read from
        the file. Long values are shortened.
      </p>
      <div
        role="region"
        aria-label="Data preview table"
        tabIndex={0}
        className="bg-card focus-visible:ring-ring/50 max-h-[34rem] overflow-auto rounded-xl border outline-none focus-visible:ring-3"
      >
        <table className="w-full text-sm">
          <thead className="bg-card sticky top-0 z-10 shadow-[inset_0_-1px_0_var(--border)]">
            <tr>
              <th
                scope="col"
                className="text-muted-foreground w-12 px-3 py-2.5 text-right font-mono text-xs font-normal"
              >
                <span className="sr-only">Row number</span>#
              </th>
              {preview.columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-3 py-2.5 text-left font-mono text-xs font-medium whitespace-nowrap"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, index) => (
              <tr key={first + index} className="hover:bg-accent/40">
                <td className="text-muted-foreground px-3 py-2 text-right font-mono text-xs tabular-nums">
                  {formatCount(first + index + 1)}
                </td>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="max-w-64 truncate px-3 py-2 font-mono text-xs"
                    title={cell ?? undefined}
                  >
                    {cell === null ? (
                      <span className="text-muted-foreground italic">
                        empty
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <nav
          aria-label="Preview pages"
          className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <p className="tabular-nums">
            Rows {formatCount(first + 1)} to {formatCount(first + rows.length)}{' '}
            of {formatCount(preview.rows.length)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
