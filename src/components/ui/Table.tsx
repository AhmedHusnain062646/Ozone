// ABOUTME: Table primitives with hairline row dividers; the wrapper scrolls horizontally inside itself so the page never does.
// ABOUTME: `graphite` switches to the admin surface. Use <Th scope> for headers; captions are required for a11y.
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cx } from '../../lib/cx.ts';

export function Table({ caption, children, graphite, className }: { caption: string; children: ReactNode; graphite?: boolean; className?: string }) {
  return (
    <div role="region" aria-label={caption} tabIndex={0} className={cx('relative w-full overflow-x-auto rounded-sm border', graphite ? 'on-graphite border-graphite-line' : 'border-linen bg-milk', className)}>
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export const THead = ({ children, graphite }: { children: ReactNode; graphite?: boolean }) => (
  <thead className={cx('border-b', graphite ? 'border-graphite-line text-bone/70' : 'border-linen text-sage')}>{children}</thead>
);

export const Tr = ({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cx('border-b border-linen/70 last:border-0 [.on-graphite_&]:border-graphite-line', className)} {...rest} />
);

export const Th = ({ className, scope = 'col', ...rest }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th scope={scope} className={cx('label-caps px-4 py-3 font-semibold', className)} {...rest} />
);

export const Td = ({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cx('px-4 py-3 align-top', className)} {...rest} />
);
