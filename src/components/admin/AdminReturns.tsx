// ABOUTME: Returns queue: approve (restock + exact ledger reversal, RETURN_REQUESTED -> RETURNED -> REFUNDED) or reject (back to DELIVERED).
// ABOUTME: Each decision is one server transaction; the row disappears from the queue when it settles.
import { formatMoney } from '../../lib/format.ts';
import { useDecideReturn, useReturns } from '../../lib/admin.ts';
import { Button, QueryBoundary, Table, THead, Td, Th, Tr, useToast } from '../ui/index.ts';

export function AdminReturns() {
  const returns = useReturns();
  const decide = useDecideReturn();
  const toast = useToast();
  const run = (code: string, decision: 'approve' | 'reject') =>
    decide.mutate({ code, decision }, {
      onSuccess: () => toast.success(decision === 'approve' ? 'Return approved and refunded' : 'Return rejected', code),
      onError: (e) => toast.error('Could not decide this return', e.message),
    });
  return (
    <QueryBoundary query={returns} isEmpty={(d) => d.length === 0} empty={{ title: 'No returns waiting', message: 'Return requests from buyers land here for a decision.' }}>
      {(list) => (
        <Table graphite caption="Return requests">
          <THead graphite><Tr><Th>Parcel</Th><Th>Atelier</Th><Th>Buyer</Th><Th>Reason</Th><Th numeric>Refund</Th><Th><span className="sr-only">Decision</span></Th></Tr></THead>
          <tbody>
            {list.map((r) => (
              <Tr key={r.id}>
                <Td><span className="font-numeric text-xs">{r.code}</span><br /><span className="text-xs text-bone/70">{r.items.map((i) => `${i.productTitle} × ${i.quantity}`).join(', ')}</span></Td>
                <Td>{r.seller}</Td>
                <Td>{r.buyer.name}<br /><span className="text-xs text-bone/70">{r.buyer.email}</span></Td>
                <Td>{r.returnReason}</Td>
                <Td numeric><span className="font-numeric">{formatMoney(r.subtotalCents)}</span><br /><span className="text-xs text-bone/70">atelier loses {formatMoney(r.netCents)}</span></Td>
                <Td>
                  <div className="flex gap-2">
                    <Button size="sm" loading={decide.isPending && decide.variables?.code === r.code} onClick={() => run(r.code, 'approve')}>Approve<span className="sr-only"> return {r.code}</span></Button>
                    <Button size="sm" variant="secondary" onClick={() => run(r.code, 'reject')}>Reject<span className="sr-only"> return {r.code}</span></Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </QueryBoundary>
  );
}
