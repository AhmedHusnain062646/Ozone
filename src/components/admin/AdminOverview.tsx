// ABOUTME: Admin overview: GMV, commission, order and atelier counts from the ledger, a 14-day sales chart and top ateliers.
// ABOUTME: Figures are ledger-derived (net of refunds), so a cancelled or refunded parcel never inflates them.
import { formatMoney } from '../../lib/format.ts';
import { useAnalytics } from '../../lib/admin.ts';
import { STATUS_LABEL } from '../../lib/status.ts';
import type { OrderStatus } from '../../lib/types.ts';
import { Card, QueryBoundary, Table, THead, Td, Th, Tr } from '../ui/index.ts';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card graphite className="p-5">
      <dt className="label-caps text-bone/70">{label}</dt>
      <dd className="font-numeric mt-2 text-[28px] leading-9">{value}</dd>
    </Card>
  );
}

export function AdminOverview() {
  const analytics = useAnalytics();
  return (
    <QueryBoundary query={analytics}>
      {(d) => {
        const max = Math.max(1, ...d.daily.map((x) => x.grossCents));
        return (
          <div className="space-y-8">
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Gross merchandise value" value={formatMoney(d.grossCents)} />
              <Stat label="Platform commission" value={formatMoney(d.commissionCents)} />
              <Stat label="Paid to ateliers (net)" value={formatMoney(d.netToSellersCents)} />
              <Stat label="Orders" value={String(d.orderCount)} />
            </dl>

            <section aria-labelledby="daily-heading">
              <h2 id="daily-heading" className="font-display text-2xl">Last 14 days</h2>
              {d.daily.length === 0 ? (
                <p className="mt-3 text-sm text-bone/70">No sales in the last 14 days.</p>
              ) : (
                <div role="img" aria-label={`Daily sales: ${d.daily.map((x) => `${x.date} ${formatMoney(x.grossCents)}`).join(', ')}`} className="mt-4 flex h-40 items-end gap-2 border-b border-graphite-line">
                  {d.daily.map((x) => (
                    <div key={x.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${x.date}: ${formatMoney(x.grossCents)}`}>
                      <div className="w-full bg-mint" style={{ height: `${Math.max(4, (Math.max(0, x.grossCents) / max) * 100)}%` }} />
                      <span className="text-[10px] text-bone/70">{x.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-8 lg:grid-cols-2">
              <section aria-labelledby="top-heading" className="min-w-0">
                <h2 id="top-heading" className="font-display text-2xl">Top ateliers</h2>
                <div className="mt-3">
                  <Table graphite caption="Top ateliers by gross sales">
                    <THead graphite><Tr><Th>Atelier</Th><Th>Gross</Th><Th>Commission</Th></Tr></THead>
                    <tbody>
                      {d.topSellers.map((s) => (
                        <Tr key={s.sellerId}><Td>{s.name}</Td><Td><span className="font-numeric">{formatMoney(s.grossCents)}</span></Td><Td><span className="font-numeric">{formatMoney(s.commissionCents)}</span></Td></Tr>
                      ))}
                      {d.topSellers.length === 0 && <Tr><Td colSpan={3}>No sales yet.</Td></Tr>}
                    </tbody>
                  </Table>
                </div>
              </section>
              <section aria-labelledby="status-heading" className="min-w-0">
                <h2 id="status-heading" className="font-display text-2xl">Parcels by status</h2>
                <ul className="mt-3 divide-y divide-graphite-line border border-graphite-line">
                  {(Object.entries(d.subOrdersByStatus) as [OrderStatus, number][]).map(([st, n]) => (
                    <li key={st} className="flex justify-between px-4 py-2 text-sm"><span>{STATUS_LABEL[st]}</span><span className="font-numeric">{n}</span></li>
                  ))}
                  {Object.keys(d.subOrdersByStatus).length === 0 && <li className="px-4 py-2 text-sm text-bone/70">No parcels yet.</li>}
                </ul>
              </section>
            </div>
          </div>
        );
      }}
    </QueryBoundary>
  );
}
