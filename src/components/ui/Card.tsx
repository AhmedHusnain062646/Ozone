// ABOUTME: Milk surface with a 1px linen hairline border; `graphite` is the back-of-house admin variant.
// ABOUTME: No drop shadows: depth comes from borders and tonal contrast.
import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/cx.ts';

export function Card({ graphite, className, ...rest }: HTMLAttributes<HTMLDivElement> & { graphite?: boolean }) {
  return (
    <div
      className={cx(
        'rounded-sm border',
        graphite ? 'on-graphite border-graphite-line bg-graphite-raised text-bone' : 'border-linen bg-milk',
        className,
      )}
      {...rest}
    />
  );
}
