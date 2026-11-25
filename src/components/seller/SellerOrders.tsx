// ABOUTME: Seller order queue: pack, ship (tracking number required), mark delivered, and confirm cash-on-delivery payment.
// ABOUTME: Buttons mirror the server state machine; the server is still the authority and its errors surface as toasts.
import { useState } from 'react';
import { formatDateTime, formatMoney } from '../../lib/format.ts';
import { useSellerOrders, useSellerTransition } from '../../lib/seller.ts';
import { STATUS_LABEL, statusTone } from '../../lib/status.ts';
import type { OrderStatus, SellerOrder } from '../../lib/types.ts';
import { Badge, Button, Input, Modal, QueryBoundary, Table, THead, Td, Th, Tr, useToast } from '../ui/index.ts';

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PAID: { to: 'PACKED', label: 'Mark packed' },
  PACKED: { to: 'SHIPPED', label: 'Ship' },
  SHIPPED: { to: 'DELIVERED', label: 'Mark delivered' },
};

export function SellerOrders() {
  const orders = useSellerOrders();
  const act = useSellerTransition();
  const toast = useToast();
  const [shipping, setShipping] = useState<SellerOrder | null>(null);
  const [tracking, setTracking] = useState('');
  const [error, setError] = useState('');

  const run = (o: SellerOrder, to: OrderStatus, trackingNumber?: string) =>
    act.mutate({ code: o.code, to, trackingNumber }, {
      onSuccess: () => { toast.success(`${o.code} is now ${STATUS_LABEL[to].toLowerCase()}`); setShipping(null); setTracking(''); setError(''); },
      onError: (e) => (shipping ? setError(e.message) : toast.error('Could not update the parcel', e.message)),
    });

  return (
    <QueryBoundary query={orders} isEmpty={(d) => d.length === 0} empty={{ title: 'No orders yet', message: 'When a buyer purchases your pieces, each parcel appears here.' }}>
      {(list) => (
        <>
          <Table caption="Parcels to fulfil">
            <THead>
              <Tr><Th>Parcel</Th><Th>Items</Th><Th>Ship to</Th><Th numeric>You earn</Th><Th>Status</Th><Th><span className="sr-only">Actions</span></Th></Tr>
            </THead>
            <tbody>
              {list.map((o) => {
                const next = NEXT[o.status];
                return (
                  <Tr key={o.id}>
                    <Td><span className="font-numeric text-xs">{o.code}</span><br /><span className="text-xs text-sage">{formatDateTime(o.createdAt)}</span></Td>
                    <Td>{o.items.map((i) => <span key={i.sku} className="block">{i.productTitle} <span className="text-sage">· {i.variantName} × {i.quantity}</span></span>)}</Td>
                    <Td>{o.shipTo.fullName}<br /><span className="text-xs text-sage">{o.shipTo.street}, {o.shipTo.city}, {o.shipTo.country}</span></Td>
                    <Td numeric><span className="font-numeric">{formatMoney(o.netCents)}</span></Td>
                    <Td>
                      <Badge tone={statusTone(o.status)}>{STATUS_LABEL[o.status]}</Badge>
                      {o.trackingNumber && <span className="mt-1 block text-xs text-sage">Tracking {o.trackingNumber}</span>}
                      {o.returnReason && <span className="mt-1 block text-xs text-sage">Return: {o.returnReason}</span>}
                    </Td>
                    <Td>
                      {o.status === 'PLACED' && o.paymentMethod === 'cod' && <Button size="sm" onClick={() => run(o, 'PAID')}>Confirm payment</Button>}
                      {next && <Button size="sm" onClick={() => (next.to === 'SHIPPED' ? setShipping(o) : run(o, next.to))}>{next.label}</Button>}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>

          <Modal open={shipping !== null} onClose={() => { setShipping(null); setError(''); }} title="Ship this parcel" size="sm">
            <Input label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} error={error || undefined} required />
            <Button className="mt-5 w-full" loading={act.isPending} onClick={() => (tracking.trim() ? shipping && run(shipping, 'SHIPPED', tracking.trim()) : setError('A tracking number is required'))}>
              Mark shipped
            </Button>
          </Modal>
        </>
      )}
    </QueryBoundary>
  );
}
