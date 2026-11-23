// ABOUTME: Renders the loading / error / empty / content states of a TanStack Query result in one place.
// ABOUTME: Every data view uses it so none can forget a state.
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { EmptyState, ErrorState } from './EmptyState.tsx';
import { Skeleton } from './Skeleton.tsx';

interface Props<T> {
  query: UseQueryResult<T>;
  isEmpty?: (data: T) => boolean;
  empty?: { title: string; message?: string; action?: ReactNode };
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}

export function QueryBoundary<T>({ query, isEmpty, empty, skeleton, children }: Props<T>) {
  if (query.isPending) {
    return (
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading</span>
        {skeleton ?? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </div>
    );
  }
  if (query.isError) {
    return <ErrorState message={query.error instanceof Error ? query.error.message : 'Unexpected error'} onRetry={() => void query.refetch()} />;
  }
  if (isEmpty?.(query.data) && empty) return <EmptyState {...empty} />;
  return <>{children(query.data)}</>;
}
