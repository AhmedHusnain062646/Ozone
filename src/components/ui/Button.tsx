// ABOUTME: Button primitive: primary / secondary / ghost / danger / text variants, 48px default touch height, 4px radius.
// ABOUTME: `loading` disables the button and sets aria-busy; never use rounded-full (pills are banned by the design system).
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx.ts';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'text';
type Size = 'md' | 'sm';

const variants: Record<Variant, string> = {
  primary: 'bg-teal text-milk hover:bg-teal-hover border border-teal',
  secondary: 'bg-transparent text-ink border border-linen-strong hover:bg-milk hover:border-ink',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-linen/60',
  danger: 'bg-danger text-milk border border-danger hover:brightness-95',
  text: 'bg-transparent text-teal border border-transparent label-caps hover:underline underline-offset-4 px-0',
};
const sizes: Record<Size, string> = { md: 'min-h-12 px-6 text-sm', sm: 'min-h-9 px-3 text-xs' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        variant !== 'text' && sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
