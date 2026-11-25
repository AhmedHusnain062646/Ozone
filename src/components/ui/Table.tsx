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

// `numeric` right-aligns money and count columns; set it on both the header and its cells.
export const Th = ({ className, scope = 'col', numeric, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) => (
  <th scope={scope} className={cx('label-caps px-4 py-2.5 font-semibold', numeric && 'text-right', className)} {...rest} />
);

export const Td = ({ className, numeric, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) => (
  <td className={cx('px-4 py-2.5 align-top', numeric && 'text-right', className)} {...rest} />
);
