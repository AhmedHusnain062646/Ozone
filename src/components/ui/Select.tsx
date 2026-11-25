// ABOUTME: Labelled native <select> styled like Input; native element keeps full keyboard and screen-reader support.
// ABOUTME: Options are passed as { value, label } pairs.
import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cx } from '../../lib/cx.ts';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  error?: string;
  hideLabel?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, error, hideLabel, id, className, ...rest },
  ref,
) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={selectId} className={cx('label-caps mb-1 block text-sage', hideLabel && 'sr-only')}>
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        className={cx(
          'min-h-12 w-full rounded-sm border bg-milk px-4 text-ink focus:border-teal focus:outline-none focus-visible:ring-1 focus-visible:ring-teal',
          error ? 'border-danger' : 'border-linen-strong',
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
