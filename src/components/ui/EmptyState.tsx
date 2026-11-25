// ABOUTME: Empty and error panels shared by every data view; error variant has role="alert" and an optional retry.
// ABOUTME: Keeps the three data states (loading / empty / error) visually consistent.
import type { ReactNode } from 'react';
import { Button } from './Button.tsx';

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-linen-strong px-6 py-12 text-center">
      <h3 className="font-display text-xl">{title}</h3>
      {message && <p className="max-w-md text-sm text-sage">{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-sm border border-danger/40 bg-milk px-6 py-10 text-center">
      <h3 className="font-display text-xl text-danger">Something went wrong</h3>
      <p className="max-w-md text-sm text-sage">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
