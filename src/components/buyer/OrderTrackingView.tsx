// ABOUTME: Buyer order screens: /orders (list) and /orders/:code (parent order, one card per atelier sub-order, timeline).
// ABOUTME: Read-only here; cancel/return actions are added by the lifecycle milestone.
import { Link, useParams } from 'react-router';
import { useOrder, useOrders } from '../../lib/orders.ts';
import { formatDateTime, formatMoney } from '../../lib/format.ts';
import { STATUS_LABEL, statusTone } from '../../lib/status.ts';
import type { OrderData, SubOrderData } from '../../lib/types.ts';
import { Badge, Card, QueryBoundary } from '../ui/index.ts';
import { OrderActions } from './OrderActions.tsx';

export function Timeline({ sub }: { sub: SubOrderData }) {
  return (
    <ol className="space-y-3 border-l border-linen-strong pl-4" aria-label={`Timeline for ${sub.code}`}>
      {sub.history.map((e, i) => (
        <li key={`${e.status}-${i}`} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 bg-teal" aria-hidden="true" />
          <p className="text-sm font-semibold">{STATUS_LABEL[e.status]}</p>
          <p className="text-xs text-sage">{formatDateTime(e.at)} · {e.actorLabel}</p>
          {e.note && <p className="text-xs">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}

export function SubOrderCard({ sub, actions }: { sub: SubOrderData; actions?: React.ReactNode }) {
  return (
    <Card role="region" className="p-5" aria-label={`Sub-order ${sub.code}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-xl">{sub.seller.name}</p>
          <p className="font-numeric text-xs text-sage">{sub.code}</p>
        </div>
        <Badge tone={statusTone(sub.status)}>{STATUS_LABEL[sub.status]}</Badge>
      </div>
      <ul className="mt-3 divide-y divide-linen">
        {sub.items.map((i) => (
          <li key={i.variantId} className="flex justify-between gap-3 py-2 text-sm">
            <span>{i.productTitle} <span className="text-sage">· {i.variantName} × {i.quantity}</span></span>
            <span className="font-numeric">{formatMoney(i.subtotalCents)}</span>
          </li>
        ))}
      </ul>
      {sub.trackingNumber && <p className="mt-2 text-sm">Tracking: <span className="font-numeric">{sub.trackingNumber}</span></p>}
      {sub.returnReason && <p className="mt-2 text-sm">Return reason: {sub.returnReason}</p>}
      <div className="mt-4"><Timeline sub={sub} /></div>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </Card>
  );
}

function OrderSummaryRow({ order }: { order: OrderData }) {
  return (
    <li>
      <Link to={`/orders/${order.code}`} className="block border border-linen bg-milk p-5 hover:border-ink">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-numeric text-sm">{order.code}</p>
          <p className="font-numeric">{formatMoney(order.totalCents)}</p>
        </div>
        <p className="mt-1 text-xs text-sage">{formatDateTime(order.createdAt)} · {order.subOrders.length} {order.subOrders.length === 1 ? 'parcel' : 'parcels'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {order.subOrders.map((s) => (
            <Badge key={s.id} tone={statusTone(s.status)}>{s.seller.name}: {STATUS_LABEL[s.status]}</Badge>
          ))}
        </div>
      </Link>
    </li>
  );
}

export function OrderTrackingView() {
  const orders = useOrders();
  return (
    <section className="mx-auto max-w-4xl px-margin py-12" aria-labelledby="orders-heading">
      <h1 id="orders-heading" className="font-display text-[28px] leading-9 md:text-[40px] md:leading-[48px]">Your orders</h1>
      <div className="mt-8">
        <QueryBoundary query={orders} isEmpty={(d) => d.length === 0} empty={{ title: 'No orders yet', message: 'When you buy, each atelier’s parcel is tracked here.', action: <Link to="/" className="label-caps text-teal underline underline-offset-4">Browse the collection</Link> }}>
          {(list) => <ul className="space-y-4">{list.map((o) => <OrderSummaryRow key={o.id} order={o} />)}</ul>}
        </QueryBoundary>
      </div>
    </section>
  );
}

export function OrderDetailView() {
  const { code = '' } = useParams();
  const order = useOrder(code);
  return (
    <section className="mx-auto max-w-4xl px-margin py-12" aria-labelledby="order-heading">
      <Link to="/orders" className="label-caps text-teal underline underline-offset-4">All orders</Link>
      <QueryBoundary query={order}>
        {(o) => (
          <>
            <h1 id="order-heading" className="mt-4 font-display text-[28px] leading-9 md:text-[40px] md:leading-[48px]">Order <span className="font-numeric text-[0.7em]">{o.code}</span></h1>
            <p className="mt-1 text-sm text-sage">
              Placed {formatDateTime(o.createdAt)} · <span className="font-numeric">{formatMoney(o.totalCents)}</span> · {o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Sandbox payment'} ({o.paymentStatus === 'PAID' ? 'paid' : o.paymentStatus === 'PENDING_COD' ? 'due on delivery' : 'refunded'})
            </p>
            <p className="mt-1 text-sm text-sage">Ships to {o.shippingAddress.fullName}, {o.shippingAddress.street}, {o.shippingAddress.city}</p>
            <div className="mt-8 space-y-6">
              {o.subOrders.map((sub) => <SubOrderCard key={sub.id} sub={sub} actions={<OrderActions sub={sub} />} />)}
            </div>
          </>
        )}
      </QueryBoundary>
    </section>
  );
}
