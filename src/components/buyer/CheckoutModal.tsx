// ABOUTME: Routed three-step checkout (/checkout): address -> payment (Sandbox) -> review split by atelier.
// ABOUTME: One idempotency key per attempt (kept across retries); no card data is collected anywhere in this flow.
import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api, ApiError } from '../../lib/api.ts';
import { useMe } from '../../lib/auth.tsx';
import { useCart } from '../../lib/cart.ts';
import { formatMoney } from '../../lib/format.ts';
import { cx } from '../../lib/cx.ts';
import type { CartLine, PaymentMethod, ShippingAddress } from '../../lib/types.ts';
import { Badge, Button, Input, Modal, QueryBoundary, Select, useToast } from '../ui/index.ts';

const STEPS = ['Address', 'Payment', 'Review'];
const METHODS: { value: PaymentMethod; title: string; text: string }[] = [
  { value: 'sandbox_card', title: 'Sandbox card', text: 'A simulated card gateway. No card details are collected or stored.' },
  { value: 'ozone_escrow', title: 'Ozone escrow (Sandbox)', text: 'Funds are held by Ozone until delivery. Simulated.' },
  { value: 'cod', title: 'Cash on delivery', text: 'Pay the courier on arrival. The atelier confirms payment.' },
];
const EMPTY: ShippingAddress = { fullName: '', street: '', city: '', state: '', postalCode: '', country: '' };

export function CheckoutModal() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();
  const cart = useCart();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<ShippingAddress>({ ...EMPTY, fullName: me.data?.displayName ?? '' });
  const [method, setMethod] = useState<PaymentMethod>('sandbox_card');
  const [outcome, setOutcome] = useState<'approve' | 'decline'>('approve');
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});
  const [formError, setFormError] = useState('');
  // One key per checkout attempt: a retry after a network blip replays the same order instead of creating a second.
  const idempotencyKey = useRef(`ozone-${crypto.randomUUID()}`);

  const place = useMutation({
    mutationFn: () => api.checkout.place({ idempotencyKey: idempotencyKey.current, paymentMethod: method, shippingAddress: address, sandboxOutcome: method === 'sandbox_card' ? outcome : undefined }),
    onSuccess: async (order) => {
      idempotencyKey.current = `ozone-${crypto.randomUUID()}`;
      await Promise.all(['cart', 'orders', 'catalog', 'product'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      toast.success('Order placed', `${order.code} was split into ${order.subOrders.length} ${order.subOrders.length === 1 ? 'shipment' : 'shipments'}.`);
      navigate(`/orders/${order.code}`, { replace: true });
    },
    onError: (e) => {
      if (e instanceof ApiError && (e.code === 'HOLD_EXPIRED' || e.code === 'CART_EMPTY' || e.code === 'ITEM_UNAVAILABLE')) {
        toast.error('Your cart changed', e.message);
        void qc.invalidateQueries({ queryKey: ['cart'] });
        navigate('/cart', { replace: true });
        return;
      }
      setFormError(e.message);
    },
  });

  const close = () => navigate('/', { replace: true });
  const set = (k: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement>) => setAddress((a) => ({ ...a, [k]: e.target.value }));

  const nextFromAddress = (e: FormEvent) => {
    e.preventDefault();
    const missing = (Object.keys(EMPTY) as (keyof ShippingAddress)[]).filter((k) => !address[k].trim());
    setErrors(Object.fromEntries(missing.map((k) => [k, 'Required'])));
    if (missing.length === 0) setStep(1);
  };

  const bySeller = (lines: CartLine[]) => {
    const g = new Map<string, { name: string; lines: CartLine[] }>();
    for (const l of lines) g.set(l.seller.id, { name: l.seller.name, lines: [...(g.get(l.seller.id)?.lines ?? []), l] });
    return [...g.values()];
  };

  return (
    <Modal open onClose={close} title="Checkout" size="md">
      <ol className="mb-6 flex gap-2" aria-label="Checkout steps">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? 'step' : undefined} className={cx('label-caps flex-1 border-b-2 pb-2', i === step ? 'border-teal text-teal' : i < step ? 'border-teal/40 text-sage' : 'border-linen text-sage')}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form onSubmit={nextFromAddress} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Input className="sm:col-span-2" label="Full name" autoComplete="name" value={address.fullName} onChange={set('fullName')} error={errors.fullName} required />
          <Input className="sm:col-span-2" label="Street address" autoComplete="street-address" value={address.street} onChange={set('street')} error={errors.street} required />
          <Input label="City" autoComplete="address-level2" value={address.city} onChange={set('city')} error={errors.city} required />
          <Input label="State / region" autoComplete="address-level1" value={address.state} onChange={set('state')} error={errors.state} required />
          <Input label="Postal code" autoComplete="postal-code" value={address.postalCode} onChange={set('postalCode')} error={errors.postalCode} required />
          <Input label="Country" autoComplete="country-name" value={address.country} onChange={set('country')} error={errors.country} required />
          <Button type="submit" className="sm:col-span-2">Continue to payment</Button>
        </form>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm"><Badge tone="warning">Sandbox</Badge> Payments are simulated. Never enter real card details.</p>
          <fieldset className="space-y-2">
            <legend className="sr-only">Payment method</legend>
            {METHODS.map((m) => (
              <label key={m.value} className={cx('flex cursor-pointer gap-3 border p-4', method === m.value ? 'border-teal bg-gold-wash' : 'border-linen-strong')}>
                <input type="radio" name="payment" value={m.value} checked={method === m.value} onChange={() => setMethod(m.value)} className="mt-1 accent-teal" />
                <span>
                  <span className="block font-semibold">{m.title}</span>
                  <span className="block text-sm text-sage">{m.text}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {method === 'sandbox_card' && (
            <Select label="Sandbox test outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as 'approve' | 'decline')} options={[{ value: 'approve', label: 'Approve the payment' }, { value: 'decline', label: 'Decline the payment (test)' }]} />
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
            <Button className="flex-1" onClick={() => setStep(2)}>Review order</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <QueryBoundary query={cart} isEmpty={(d) => d.lines.length === 0} empty={{ title: 'Your cart is empty', action: <Button variant="secondary" onClick={close}>Back to the collection</Button> }}>
          {(c) => (
            <div className="space-y-5">
              <p className="text-sm text-sage">Your order ships as {bySeller(c.lines).length} separate {bySeller(c.lines).length === 1 ? 'parcel' : 'parcels'}, one per atelier.</p>
              {bySeller(c.lines).map((g) => (
                <section key={g.name} aria-label={`Parcel from ${g.name}`} className="border border-linen">
                  <h3 className="label-caps border-b border-linen bg-bone px-4 py-2 text-sage">{g.name}</h3>
                  <ul className="divide-y divide-linen">
                    {g.lines.map((l) => (
                      <li key={l.variantId} className="flex justify-between gap-3 px-4 py-3 text-sm">
                        <span>{l.title} <span className="text-sage">× {l.quantity}</span></span>
                        <span className="font-numeric">{formatMoney(l.lineTotalCents)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
                <dt className="text-sage">Ship to</dt><dd className="text-right">{address.fullName}, {address.city}</dd>
                <dt className="text-sage">Payment</dt><dd className="text-right">{METHODS.find((m) => m.value === method)?.title}</dd>
                <dt className="label-caps self-center">Total</dt><dd className="font-numeric text-right text-lg">{formatMoney(c.subtotalCents)}</dd>
              </dl>
              {formError && <p role="alert" className="text-sm text-danger">{formError}</p>}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setFormError(''); setStep(1); }}>Back</Button>
                <Button className="flex-1" loading={place.isPending} onClick={() => { setFormError(''); place.mutate(); }}>
                  Place order · {formatMoney(c.subtotalCents)}
                </Button>
              </div>
            </div>
          )}
        </QueryBoundary>
      )}
    </Modal>
  );
}
