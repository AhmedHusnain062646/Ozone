// ABOUTME: Seller overview: headline money and workload figures plus a low-stock list, all from /api/seller/summary.
// ABOUTME: Net is what the atelier keeps after the snapshotted platform commission.
import { Link } from 'react-router';
import { cx } from '../../lib/cx.ts';
import { formatMoney } from '../../lib/format.ts';
import { useSellerSummary } from '../../lib/seller.ts';
import { Card, QueryBoundary } from '../ui/index.ts';

// A stat with a link is one to act on, so it is shown larger.
function Stat({ label, value, note, link }: { label: string; value: string; note?: string; link?: { tab: string; text: string } }) {
  return (
    <Card className="p-5">
      <dt className="label-caps text-sage">{label}</dt>
      <dd className={cx('font-numeric mt-2', link ? 'text-[32px] leading-10' : 'text-xl')}>{value}</dd>
      {note && <dd className="mt-1 text-xs text-sage">{note}</dd>}
      {link && (
        <dd className="mt-2">
          <Link to={`?tab=${link.tab}`} replace className="font-medium text-teal underline underline-offset-4">{link.text}</Link>
        </dd>
      )}
    </Card>
  );
}

export function SellerOverview() {
  const summary = useSellerSummary();
  return (
    <QueryBoundary query={summary}>
      {(d) => (
        <div className="space-y-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Stat label="To fulfil" value={String(d.toFulfilCount)} note={`${d.orderCount} active parcels`} link={{ tab: 'orders', text: 'Open orders' }} />
            <Stat label="Available to withdraw" value={formatMoney(d.balance.availableCents)} note={`${formatMoney(d.balance.pendingCents)} pending (cash on delivery)`} link={{ tab: 'earnings', text: 'Open earnings' }} />
            <Stat label="Net earnings" value={formatMoney(d.netCents)} note="After refunds and commission" />
            <Stat label="Gross sales" value={formatMoney(d.grossCents)} />
          </dl>
          <section aria-labelledby="low-stock-heading">
            <h3 id="low-stock-heading" className="font-sans text-base font-semibold">Low stock</h3>
            {d.lowStock.length === 0 ? (
              <p className="mt-3 text-sm text-sage">Every edition is above its low-stock threshold.</p>
            ) : (
              <ul className="mt-3 divide-y divide-linen border border-linen bg-milk">
                {d.lowStock.map((v) => (
                  <li key={v.variantId} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                    <span>{v.productTitle} <span className="text-sage">· {v.variantName}</span></span>
                    <span className="font-numeric">{v.stock} in stock{v.reserved ? `, ${v.reserved} held` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </QueryBoundary>
  );
}
