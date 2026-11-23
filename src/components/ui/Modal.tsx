// ABOUTME: Accessible modal dialog: portal, aria-modal, labelled by its title, focus trap, Esc and backdrop close.
// ABOUTME: Max radius 6px and the ambient float shadow from the design system; enter animation <= 250ms.
import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/cx.ts';
import { useFocusTrap } from './useFocusTrap.ts';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  graphite?: boolean;
}

const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-5xl' };

export function Modal({ open, onClose, title, children, size = 'md', graphite }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[92dvh] w-full animate-rise flex-col overflow-hidden rounded-t-lg border shadow-float sm:rounded-lg',
          widths[size],
          graphite ? 'on-graphite border-graphite-line bg-graphite text-bone' : 'border-linen bg-milk text-ink',
        )}
      >
        <header className={cx('flex items-center justify-between gap-4 border-b px-6 py-4', graphite ? 'border-graphite-line' : 'border-linen')}>
          <h2 id={titleId} className="font-display text-2xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-sm hover:bg-linen/40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
