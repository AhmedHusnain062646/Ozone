// ABOUTME: Variant picker with live availability. The add-to-cart action is wired in the cart milestone.
// ABOUTME: Variants with zero availability are listed but not selectable.
import { useState } from 'react';
import { formatMoney } from '../../lib/format.ts';
import { cx } from '../../lib/cx.ts';
import type { ProductDetailData } from '../../lib/types.ts';

export function ProductPurchasePanel({ product }: { product: ProductDetailData }) {
  const firstAvailable = product.variants.find((v) => v.available > 0)?.id ?? product.variants[0]?.id ?? '';
  const [variantId, setVariantId] = useState(firstAvailable);
  return (
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
            <input type="radio" name="variant" value={v.id} checked={variantId === v.id} disabled={v.available === 0} onChange={() => setVariantId(v.id)} className="accent-teal" />
            <span>{v.name}</span>
          </span>
          <span className="text-right">
            <span className="font-numeric block">{formatMoney(v.priceCents)}</span>
            <span className={cx('text-xs', v.available === 0 ? 'text-danger' : 'text-sage')}>{v.available === 0 ? 'Sold out' : `${v.available} available`}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
