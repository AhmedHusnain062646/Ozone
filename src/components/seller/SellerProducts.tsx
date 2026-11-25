// ABOUTME: Seller product catalogue: table of own pieces with publish toggle, plus a create/edit editor modal.
// ABOUTME: Publishing needs an active atelier (server-enforced); stock edits cannot drop below units held in carts.
import { useState } from 'react';
import { formatMoney } from '../../lib/format.ts';
import { useUpdateProduct, useSellerProducts } from '../../lib/seller.ts';
import type { SellerProduct } from '../../lib/types.ts';
import { Badge, Button, QueryBoundary, SafeImage, Table, THead, Td, Th, Tr, useToast } from '../ui/index.ts';
import { ProductEditor } from './ProductEditor.tsx';

export function SellerProducts({ canPublish }: { canPublish: boolean }) {
  const products = useSellerProducts();
  const update = useUpdateProduct();
  const toast = useToast();
  const [editing, setEditing] = useState<SellerProduct | 'new' | null>(null);

  const toggle = (p: SellerProduct) =>
    update.mutate({ id: p.id, patch: { isPublished: !p.isPublished } }, {
      onSuccess: () => toast.success(p.isPublished ? 'Hidden from the storefront' : 'Published to the storefront', p.title),
      onError: (e) => toast.error('Could not change visibility', e.message),
    });

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setEditing('new')}>New piece</Button></div>
      <QueryBoundary query={products} isEmpty={(d) => d.length === 0} empty={{ title: 'No pieces yet', message: 'Create your first piece as a draft, add editions and photos, then publish it.', action: <Button onClick={() => setEditing('new')}>Create a piece</Button> }}>
        {(list) => (
          <Table caption="Your pieces">
            <THead><Tr><Th>Piece</Th><Th numeric>Price</Th><Th numeric>Stock</Th><Th>Visibility</Th><Th><span className="sr-only">Actions</span></Th></Tr></THead>
            <tbody>
              {list.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <SafeImage src={p.images[0]?.url} alt="" className="h-12 w-12 shrink-0 object-cover" />
                      <span>{p.title}<br /><span className="text-xs text-sage">{p.variants.length} {p.variants.length === 1 ? 'edition' : 'editions'}</span></span>
                    </div>
                  </Td>
                  <Td numeric><span className="font-numeric">{formatMoney(p.basePriceCents)}</span></Td>
                  <Td numeric><span className="font-numeric">{p.variants.reduce((n, v) => n + v.stock, 0)}</span></Td>
                  <Td><Badge tone={p.isPublished ? 'success' : 'neutral'}>{p.isPublished ? 'Published' : 'Draft'}</Badge></Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>Edit<span className="sr-only"> {p.title}</span></Button>
                      <Button size="sm" variant="secondary" loading={update.isPending && update.variables?.id === p.id} disabled={!p.isPublished && !canPublish} title={!p.isPublished && !canPublish ? 'Available once your atelier is approved' : undefined} onClick={() => toggle(p)}>
                        {p.isPublished ? 'Unpublish' : 'Publish'}<span className="sr-only"> {p.title}</span>
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </QueryBoundary>
      {editing && <ProductEditor product={editing === 'new' ? null : (products.data?.find((x) => x.id === editing.id) ?? editing)} onClose={() => setEditing(null)} />}
    </>
  );
}
