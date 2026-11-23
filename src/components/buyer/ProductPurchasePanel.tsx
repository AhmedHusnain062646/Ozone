// ABOUTME: Edition picker + quantity + "Reserve" action. Adding performs the server's atomic reservation (10-minute hold).
// ABOUTME: A 409 INVENTORY_CONFLICT is shown as a toast; signed-out visitors are sent to sign-in and return here.
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ApiError } from '../../lib/api.ts';
import { useMe } from '../../lib/auth.tsx';
import { useAddToCart } from '../../lib/cart.ts';
import { formatMoney } from '../../lib/format.ts';
import { cx } from '../../lib/cx.ts';
import type { ProductDetailData } from '../../lib/types.ts';
import { Button, Select, useToast } from '../ui/index.ts';

export function ProductPurchasePanel({ product }: { product: ProductDetailData }) {
  const firstAvailable = product.variants.find((v) => v.available > 0)?.id ?? product.variants[0]?.id ?? '';
  const [variantId, setVariantId] = useState(firstAvailable);
  const [quantity, setQuantity] = useState(1);
  const me = useMe();
  const add = useAddToCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const selected = product.variants.find((v) => v.id === variantId);
  const maxQty = Math.max(1, Math.min(10, selected?.available ?? 1));

  const reserve = () => {
    if (!me.data) {
      navigate(`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    add.mutate(
      { variantId, quantity },
      {
        onSuccess: () => {
          toast.success('Reserved for 10 minutes', `${product.title} is in your cart.`);
          navigate('/cart');
        },
        onError: (e) =>
          toast.error(e instanceof ApiError && e.code === 'INVENTORY_CONFLICT' ? 'Just taken' : 'Could not reserve', e.message),
      },
    );
  };

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="label-caps mb-1 text-sage">Edition</legend>
        {product.variants.map((v) => (
          <label
            key={v.id}
            className={cx(
              'flex min-h-12 cursor-pointer items-center justify-between gap-3 border px-4 py-2 text-sm',
              variantId === v.id ? 'border-teal bg-gold-wash' : 'border-linen-strong',
              v.available === 0 && 'cursor-not-allowed opacity-60',
            )}
          >
            <span className="flex items-center gap-3">
              <input type="radio" name="variant" value={v.id} checked={variantId === v.id} disabled={v.available === 0} onChange={() => (setVariantId(v.id), setQuantity(1))} className="accent-teal" />
              <span>{v.name}</span>
            </span>
            <span className="text-right">
              <span className="font-numeric block">{formatMoney(v.priceCents)}</span>
              <span className={cx('text-xs', v.available === 0 ? 'text-danger' : 'text-sage')}>{v.available === 0 ? 'Sold out' : `${v.available} available`}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex items-end gap-3">
        <Select
          label="Quantity"
          className="w-28"
          value={String(quantity)}
          onChange={(e) => setQuantity(Number(e.target.value))}
          options={Array.from({ length: maxQty }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
        />
        <Button className="flex-1" onClick={reserve} loading={add.isPending} disabled={!selected || selected.available === 0}>
          {selected && selected.available === 0 ? 'Sold out' : `Reserve · ${selected ? formatMoney(selected.priceCents * quantity) : ''}`}
        </Button>
      </div>
      <p className="text-xs text-sage">Reserving holds the work in your cart for ten minutes.</p>
    </div>
  );
}
