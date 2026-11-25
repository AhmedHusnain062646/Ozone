// ABOUTME: Right-hand slide-over panel with the same a11y behaviour as Modal (focus trap, Esc, labelled dialog).
// ABOUTME: Full width on phones, 28rem on larger screens; slide animation 300ms.
import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from './useFocusTrap.ts';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-ink/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md animate-slide-in-right flex-col border-l border-linen bg-milk shadow-float"
      >
        <header className="flex items-center justify-between border-b border-linen px-6 py-4">
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
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="border-t border-linen px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
