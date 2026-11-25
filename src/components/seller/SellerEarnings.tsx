// ABOUTME: Earnings: balance cards, payout request, real CSV download, and the append-only ledger table.
// ABOUTME: The payout amount is validated against the server balance; the server re-checks atomically.
import { useState, type FormEvent } from 'react';
import { formatDateTime, formatMoney } from '../../lib/format.ts';
import { dollarsToCents, useRequestPayout, useSellerBalance, useSellerLedger } from '../../lib/seller.ts';
import { Badge, Button, Card, Input, QueryBoundary, Table, THead, Td, Th, Tr, useToast } from '../ui/index.ts';

const LABEL = { sale_credit: 'Sale', refund_debit: 'Refund', payout_disbursement: 'Payout' } as const;

export function SellerEarnings({ canWithdraw }: { canWithdraw: boolean }) {
  const balance = useSellerBalance();
  const ledger = useSellerLedger();
  const payout = useRequestPayout();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cents = dollarsToCents(amount);
    if (!cents) return setError('Enter an amount such as 250 or 250.50');
    setError('');
    payout.mutate(cents, {
      onSuccess: () => { toast.success('Payout sent', `${formatMoney(cents)} (sandbox)`); setAmount(''); },
      onError: (err) => setError(err.message),
    });
  };

  return (
    <div className="space-y-10">
      <QueryBoundary query={balance}>
        {(b) => (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
            <Card className="p-5"><p className="label-caps text-sage">Available</p><p className="font-numeric mt-2 text-[28px]">{formatMoney(b.availableCents)}</p></Card>
            <Card className="p-5"><p className="label-caps text-sage">Pending (cash on delivery)</p><p className="font-numeric mt-2 text-[28px]">{formatMoney(b.pendingCents)}</p><p className="mt-1 text-xs text-sage">Counts once delivered.</p></Card>
            <Card className="p-5">
              <form onSubmit={submit} noValidate className="flex items-end gap-3">
                <Input className="flex-1" label="Payout amount (USD)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} error={error || undefined} disabled={!canWithdraw} />
                <Button type="submit" loading={payout.isPending} disabled={!canWithdraw}>Request payout</Button>
              </form>
              {!canWithdraw && <p className="mt-2 text-xs text-sage">Payouts open once your atelier is approved.</p>}
              <p className="mt-2 text-xs text-sage">Sandbox: no real money moves.</p>
            </Card>
          </div>
        )}
      </QueryBoundary>

      <section aria-labelledby="ledger-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="ledger-heading" className="font-sans text-base font-semibold">Ledger</h3>
          <a href="/api/seller/ledger.csv" download className="label-caps inline-flex min-h-10 items-center border border-teal px-4 text-teal hover:bg-teal hover:text-milk">Download CSV</a>
        </div>
        <div className="mt-4">
          <QueryBoundary query={ledger} isEmpty={(d) => d.entries.length === 0} empty={{ title: 'No ledger entries yet', message: 'Sales, refunds and payouts are recorded here and never edited.' }}>
            {(d) => (
              <Table caption="Seller ledger">
                <THead><Tr><Th>Date</Th><Th>Type</Th><Th>Order</Th><Th numeric>Gross</Th><Th numeric>Commission</Th><Th numeric>Net</Th><Th>Status</Th></Tr></THead>
                <tbody>
                  {d.entries.map((r) => (
                    <Tr key={r.id}>
                      <Td>{formatDateTime(r.createdAt)}</Td>
                      <Td>{LABEL[r.type]}</Td>
                      <Td><span className="font-numeric text-xs">{r.orderCode ?? '—'}</span></Td>
                      <Td numeric><span className="font-numeric">{formatMoney(r.grossCents)}</span></Td>
                      <Td numeric><span className="font-numeric">{formatMoney(r.commissionCents)}</span></Td>
                      <Td numeric><span className="font-numeric">{formatMoney(r.netCents)}</span></Td>
                      <Td><Badge tone={r.status === 'pending' ? 'warning' : r.status === 'disbursed' ? 'neutral' : 'success'}>{r.status}</Badge></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </QueryBoundary>
        </div>
      </section>
    </div>
  );
}
