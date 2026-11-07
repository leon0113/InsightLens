'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

type DeleteDatasetButtonProps = {
  id: string;
  name: string;
  onDeleted?: () => void;
  variant?: 'icon' | 'text';
};

export function DeleteDatasetButton({
  id,
  name,
  onDeleted,
  variant = 'icon',
}: DeleteDatasetButtonProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const deletion = useMutation({
    mutationFn: () => api.datasets.remove(id),
    onSuccess: () => {
      setOpen(false);
      // Only the lists refresh: refetching this dataset itself would answer 404.
      queryClient.invalidateQueries({ queryKey: queryKeys.datasetLists });
      onDeleted?.();
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) deletion.reset();
      }}
    >
      <AlertDialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${name}`}
          >
            <Trash2 />
          </Button>
        ) : (
          <Button variant="outline">
            <Trash2 aria-hidden="true" />
            Delete dataset
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this dataset?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-foreground font-mono break-all">{name}</span>{' '}
            and its report will be removed for good.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deletion.isError && (
          <p role="alert" className="text-destructive text-sm">
            {deletion.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletion.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => deletion.mutate()}
            disabled={deletion.isPending}
          >
            {deletion.isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
