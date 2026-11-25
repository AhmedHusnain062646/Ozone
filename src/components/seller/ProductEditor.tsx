// ABOUTME: Create/edit modal for one piece: details form, editions (stock, price delta) and photos (upload/remove).
// ABOUTME: A new piece is saved as a draft with its first edition; editions and photos are managed after it exists.
import { useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.ts';
import { formatMoney } from '../../lib/format.ts';
import { dollarsToCents, useAddVariant, useCreateProduct, useDeleteImage, useUpdateProduct, useUpdateVariant, useUploadImage } from '../../lib/seller.ts';
import type { CategoryData, SellerProduct, SellerVariant } from '../../lib/types.ts';
import { Button, Input, Modal, SafeImage, Select, useToast } from '../ui/index.ts';

const centsToDollars = (c: number) => (c / 100).toFixed(2);

function VariantRow({ v }: { v: SellerVariant }) {
  const update = useUpdateVariant();
  const toast = useToast();
  const [stock, setStock] = useState(String(v.stock));
  const [error, setError] = useState('');
  const save = () => {
    const n = Number(stock);
    if (!Number.isInteger(n) || n < 0) return setError('Whole number');
    setError('');
    update.mutate({ id: v.id, patch: { stock: n } }, { onSuccess: () => toast.success('Stock updated', `${v.name}: ${n}`), onError: (e) => setError(e.message) });
  };
  return (
    <li className="flex flex-wrap items-end gap-3 border-b border-linen py-3">
      <div className="min-w-32 flex-1 text-sm"><p>{v.name}</p><p className="font-numeric text-xs text-sage">{v.sku} · {v.priceDeltaCents ? `${v.priceDeltaCents > 0 ? '+' : ''}${formatMoney(v.priceDeltaCents)}` : 'base price'} · {v.reserved} held</p></div>
      <Input className="w-28" label={`Stock for ${v.name}`} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} error={error || undefined} />
      <Button size="sm" variant="secondary" loading={update.isPending} onClick={save}>Save stock</Button>
    </li>
  );
}

function AddVariant({ productId }: { productId: string }) {
  const add = useAddVariant();
  const toast = useToast();
  const [error, setError] = useState('');
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const delta = dollarsToCents(String(f.get('delta') || '0'));
    const stock = Number(f.get('stock'));
    if (delta === undefined || !Number.isInteger(stock) || stock < 0) return setError('Check the price difference and stock');
    add.mutate({ productId, variant: { name: String(f.get('name')), sku: String(f.get('sku')), priceDeltaCents: delta, stock } }, {
      onSuccess: () => { toast.success('Edition added'); form.reset(); setError(''); },
      onError: (err) => setError(err.message),
    });
  };
  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-4" noValidate>
      <Input label="New edition name" name="name" required />
      <Input label="SKU" name="sku" required />
      <Input label="Price difference (USD)" name="delta" inputMode="decimal" placeholder="0" />
      <Input label="Stock" name="stock" inputMode="numeric" defaultValue="1" required />
      {error && <p role="alert" className="text-sm text-danger sm:col-span-4">{error}</p>}
      <Button type="submit" variant="secondary" loading={add.isPending} className="sm:col-span-4">Add edition</Button>
    </form>
  );
}

function Photos({ product }: { product: SellerProduct }) {
  const upload = useUploadImage();
  const remove = useDeleteImage();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const onFile = (file?: File) => {
    if (!file) return;
    setError('');
    upload.mutate({ productId: product.id, file }, { onSuccess: () => toast.success('Photo added'), onError: (e) => setError(e.message) });
    if (input.current) input.current.value = '';
  };
  return (
    <div>
      <ul className="flex flex-wrap gap-3">
        {product.images.map((img) => (
          <li key={img.id} className="w-24">
            <SafeImage src={img.url} alt="" className="h-24 w-24 object-cover" />
            <button type="button" className="label-caps mt-1 text-danger underline" onClick={() => remove.mutate({ productId: product.id, imageId: img.id }, { onError: (e) => setError(e.message) })}>Remove<span className="sr-only"> photo {img.position + 1}</span></button>
          </li>
        ))}
      </ul>
      <label className="label-caps mt-3 block text-sage" htmlFor="photo-input">Add a photo (PNG, JPEG or WebP, up to 2 MB)</label>
      <input ref={input} id="photo-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onFile(e.target.files?.[0])} className="mt-1 block text-sm" disabled={upload.isPending} />
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function ProductEditor({ product, onClose }: { product: SellerProduct | null; onClose: () => void }) {
  const categories = useQuery({ queryKey: ['catalog', 'categories'], queryFn: api.catalog.categories });
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cats: CategoryData[] = categories.data ?? [];

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const price = dollarsToCents(String(f.get('price') ?? ''));
    const next: Record<string, string> = {};
    if (!String(f.get('title') ?? '').trim()) next.title = 'Required';
    if (!f.get('categoryId')) next.categoryId = 'Choose a category';
    if (price === undefined) next.price = 'Enter an amount such as 480 or 480.50';
    const variant = { name: String(f.get('variantName') ?? ''), sku: String(f.get('variantSku') ?? ''), stock: Number(f.get('variantStock')) };
    if (!product) {
      if (!variant.name.trim()) next.variantName = 'Required';
      if (variant.sku.trim().length < 2) next.variantSku = 'At least 2 characters';
      if (!Number.isInteger(variant.stock) || variant.stock < 0) next.variantStock = 'Whole number';
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    const body = {
      title: String(f.get('title')), categoryId: String(f.get('categoryId')), basePriceCents: price!,
      shortDescription: String(f.get('shortDescription') ?? ''), description: String(f.get('description') ?? ''),
      material: String(f.get('material') ?? ''), origin: String(f.get('origin') ?? ''),
      limitedEdition: f.get('limitedEdition') === 'on', lowStockThreshold: Number(f.get('lowStockThreshold') || 2),
    };
    const onError = (err: Error) => setErrors({ form: err.message });
    if (product) update.mutate({ id: product.id, patch: body }, { onSuccess: () => { toast.success('Piece saved', body.title); onClose(); }, onError });
    else create.mutate({ ...body, variants: [{ name: variant.name, sku: variant.sku, priceDeltaCents: 0, stock: variant.stock }] }, { onSuccess: () => { toast.success('Draft created', `${body.title}. Add photos, then publish.`); onClose(); }, onError });
  };

  return (
    <Modal open onClose={onClose} title={product ? `Edit ${product.title}` : 'New piece'} size="lg">
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Title" name="title" defaultValue={product?.title} error={errors.title} required />
        <Select label="Category" name="categoryId" defaultValue={product?.categoryId ?? ''} error={errors.categoryId} options={[{ value: '', label: 'Choose…' }, ...cats.map((c) => ({ value: c.id, label: c.name }))]} />
        <Input label="Base price (USD)" name="price" inputMode="decimal" defaultValue={product ? centsToDollars(product.basePriceCents) : ''} error={errors.price} required />
        <Input className="sm:col-span-2" label="Short description" name="shortDescription" defaultValue={product?.shortDescription} maxLength={240} />
        <Input className="sm:col-span-2" label="Description" name="description" defaultValue={product?.description} />
        <Input label="Material" name="material" defaultValue={product?.material} />
        <Input label="Origin" name="origin" defaultValue={product?.origin} />
        <Input label="Low-stock alert at" name="lowStockThreshold" inputMode="numeric" defaultValue={String(product?.lowStockThreshold ?? 2)} />
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="limitedEdition" defaultChecked={product?.limitedEdition} className="accent-teal" /> Limited edition</label>
        {!product && (
          <fieldset className="grid gap-4 border border-linen p-4 sm:col-span-2 sm:grid-cols-3">
            <legend className="label-caps px-1 text-sage">First edition</legend>
            <Input label="Edition name" name="variantName" defaultValue="Standard" error={errors.variantName} />
            <Input label="SKU" name="variantSku" error={errors.variantSku} />
            <Input label="Stock" name="variantStock" inputMode="numeric" defaultValue="1" error={errors.variantStock} />
          </fieldset>
        )}
        {errors.form && <p role="alert" className="text-sm text-danger sm:col-span-2">{errors.form}</p>}
        <Button type="submit" className="sm:col-span-2" loading={create.isPending || update.isPending}>{product ? 'Save changes' : 'Create draft'}</Button>
      </form>

      {product && (
        <>
          <section className="mt-8" aria-labelledby="editions-heading">
            <h3 id="editions-heading" className="font-display text-xl">Editions and stock</h3>
            <ul>{product.variants.map((v) => <VariantRow key={`${v.id}-${v.stock}`} v={v} />)}</ul>
            <AddVariant productId={product.id} />
          </section>
          <section className="mt-8" aria-labelledby="photos-heading">
            <h3 id="photos-heading" className="mb-3 font-display text-xl">Photos</h3>
            <Photos product={product} />
          </section>
        </>
      )}
    </Modal>
  );
}
