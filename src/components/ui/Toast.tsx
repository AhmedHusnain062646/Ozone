// ABOUTME: Toast provider + useToast(). Replaces browser dialogs: polite live region, auto-dismiss, manual close.
// ABOUTME: Errors use role="alert" semantics via aria-live=assertive on that toast only.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cx } from '../../lib/cx.ts';

type Tone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: Tone;
  title: string;
  message?: string;
}
interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (tone: Tone, title: string, message?: string) => {
      const id = nextId++;
      setItems((xs) => [...xs.slice(-3), { id, tone, title, message }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 5000);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(
    () => ({
      success: (t, m) => push('success', t, m),
      error: (t, m) => push('error', t, m),
      info: (t, m) => push('info', t, m),
    }),
    [push],
  );
  const icons = { success: CheckCircle2, error: XCircle, info: Info };
  const colours = { success: 'text-success', error: 'text-danger', info: 'text-info' };
  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
          {items.map((t) => {
            const Icon = icons[t.tone];
            return (
              <div
                key={t.id}
                role={t.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-sm border border-linen bg-milk p-4 text-ink shadow-float"
              >
                <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', colours[t.tone])} aria-hidden="true" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{t.title}</p>
                  {t.message && <p className="text-sage">{t.message}</p>}
                </div>
                <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-sm hover:bg-linen/50">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
