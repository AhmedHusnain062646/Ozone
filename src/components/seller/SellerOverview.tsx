// ABOUTME: Seller overview: headline money and workload figures plus a low-stock list, all from /api/seller/summary.
// ABOUTME: Net is what the atelier keeps after the snapshotted platform commission.
import { formatMoney } from '../../lib/format.ts';
import { useSellerSummary } from '../../lib/seller.ts';
import { Card, QueryBoundary } from '../ui/index.ts';

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-5">
      <p className="label-caps text-sage">{label}</p>
      <p className="font-numeric mt-2 text-[28px] leading-9">{value}</p>
      {note && <p className="mt-1 text-xs text-sage">{note}</p>}
    </Card>
  );
}

export function SellerOverview() {
  const summary = useSellerSummary();
  return (
    <QueryBoundary query={summary}>
      {(d) => (
        <div className="space-y-8">
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Net earnings" value={formatMoney(d.netCents)} note="After refunds and commission" />
            <Stat label="Gross sales" value={formatMoney(d.grossCents)} />
            <Stat label="To fulfil" value={String(d.toFulfilCount)} note={`${d.orderCount} active parcels`} />
            <Stat label="Available to withdraw" value={formatMoney(d.balance.availableCents)} note={`${formatMoney(d.balance.pendingCents)} pending (cash on delivery)`} />
          </dl>
          <section aria-labelledby="low-stock-heading">
            <h2 id="low-stock-heading" className="font-display text-2xl">Low stock</h2>
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
