// ABOUTME: Labelled text input; label, hint and error are wired with htmlFor / aria-describedby / aria-invalid.
// ABOUTME: 48px minimum height and a teal focus border, per the design system.
import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cx } from '../../lib/cx.ts';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, hideLabel, id, className, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className={cx('label-caps mb-1 block text-sage', hideLabel && 'sr-only')}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'min-h-12 w-full rounded-sm border bg-milk px-4 text-ink placeholder:text-sage/70 focus:border-teal focus:outline-none focus-visible:ring-1 focus-visible:ring-teal',
          error ? 'border-danger' : 'border-linen-strong',
        )}
        {...rest}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-sage">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-err`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
