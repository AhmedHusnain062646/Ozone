// ABOUTME: Routed cart drawer (/cart): lines grouped by atelier, quantity steppers, live hold countdown, subtotal, checkout link.
// ABOUTME: Prices come from the server; the countdown uses server time and refetches when the hold lapses.
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { cartKey, useCart, useHoldSeconds, useRemoveFromCart, useSetCartQuantity } from '../../lib/cart.ts';
import { formatCountdown, formatMoney } from '../../lib/format.ts';
import type { CartData, CartLine } from '../../lib/types.ts';
import { Badge, Button, Drawer, QueryBoundary, SafeImage, useToast } from '../ui/index.ts';

function Line({ line }: { line: CartLine }) {
  const setQty = useSetCartQuantity();
  const remove = useRemoveFromCart();
  const toast = useToast();
  const change = (quantity: number) =>
    setQty.mutate({ variantId: line.variantId, quantity }, { onError: (e) => toast.error('Could not update quantity', e.message) });
  return (
    <li className="flex gap-4 py-4">
      <div className="h-24 w-20 shrink-0 overflow-hidden border border-linen bg-linen">
        <SafeImage src={line.image ?? undefined} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg leading-snug">{line.title}</p>
        <p className="text-xs text-sage">{line.variantName}</p>
        {!line.purchasable && <Badge tone="danger" className="mt-1">No longer available</Badge>}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="inline-flex items-center border border-linen-strong" role="group" aria-label={`Quantity of ${line.title}`}>
            <button type="button" aria-label="Decrease quantity" disabled={line.quantity <= 1 || setQty.isPending} onClick={() => change(line.quantity - 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center hover:bg-linen/50 disabled:opacity-40">
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="font-numeric min-w-8 text-center" aria-live="polite">{line.quantity}</span>
            <button type="button" aria-label="Increase quantity" disabled={line.quantity >= 10 || setQty.isPending} onClick={() => change(line.quantity + 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center hover:bg-linen/50 disabled:opacity-40">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="font-numeric">{formatMoney(line.lineTotalCents)}</p>
        </div>
      </div>
      <button
        type="button"
        aria-label={`Remove ${line.title} from cart`}
        disabled={remove.isPending}
        onClick={() => remove.mutate(line.variantId, { onError: (e) => toast.error('Could not remove item', e.message) })}
        className="inline-flex min-h-11 min-w-11 items-center justify-center self-start rounded-sm hover:bg-linen/50"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}

function Body({ cart, fetchedAt }: { cart: CartData; fetchedAt: number }) {
  const qc = useQueryClient();
  const seconds = useHoldSeconds(cart.expiresAt, cart.serverTime, fetchedAt);
  useEffect(() => {
    if (seconds === 0) void qc.invalidateQueries({ queryKey: cartKey }); // hold lapsed: server drops the line
  }, [seconds, qc]);

  const bySeller = new Map<string, { name: string; lines: CartLine[] }>();
  for (const l of cart.lines) {
    const g = bySeller.get(l.seller.id) ?? { name: l.seller.name, lines: [] };
    g.lines.push(l);
    bySeller.set(l.seller.id, g);
  }
  return (
    <div>
      {seconds !== null && (
        <p role="timer" className="mb-2 border border-gold bg-gold-wash px-3 py-2 text-sm text-gold-ink">
          Your selection is held for <span className="font-numeric font-semibold">{formatCountdown(seconds)}</span>
        </p>
      )}
      {[...bySeller.entries()].map(([id, g]) => (
        <section key={id} aria-label={`Items from ${g.name}`} className="mt-4">
          <h3 className="label-caps text-sage">{g.name}</h3>
          <ul className="divide-y divide-linen">{g.lines.map((l) => <Line key={l.variantId} line={l} />)}</ul>
        </section>
      ))}
    </div>
  );
}

export function CartDrawer() {
  const navigate = useNavigate();
  const cart = useCart();
  const close = () => navigate('/');
  const canCheckout = !!cart.data && cart.data.lines.length > 0 && cart.data.lines.every((l) => l.purchasable);
  return (
    <Drawer
      open
      onClose={close}
      title="Your cart"
      footer={
        cart.data && cart.data.lines.length > 0 ? (
          <div className="space-y-3">
            <p className="flex items-baseline justify-between">
              <span className="label-caps text-sage">Subtotal</span>
              <span className="font-numeric text-lg">{formatMoney(cart.data.subtotalCents)}</span>
            </p>
            <Button className="w-full" disabled={!canCheckout} onClick={() => navigate('/checkout')}>
              Checkout
            </Button>
          </div>
        ) : undefined
      }
    >
      <QueryBoundary
        query={cart}
        isEmpty={(d) => d.lines.length === 0}
        empty={{ title: 'Your cart is empty', message: 'Reserve a work and it is held for you for ten minutes.', action: <Button variant="secondary" onClick={close}>Continue browsing</Button> }}
      >
        {(d) => <Body cart={d} fetchedAt={cart.dataUpdatedAt} />}
      </QueryBoundary>
    </Drawer>
  );
}
