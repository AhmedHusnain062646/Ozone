// ABOUTME: Platform default fee (applies to new applicants) and category management (create, rename, delete when unused).
// ABOUTME: Delete is disabled for a category that still has products; the server refuses it as well.
import { useState, type FormEvent } from 'react';
import { formatBps } from '../../lib/format.ts';
import { percentToBps, useAdminCategories, useAdminSettings, useCreateCategory, useDeleteCategory, useRenameCategory, useSetDefaultFee } from '../../lib/admin.ts';
import type { AdminCategory } from '../../lib/types.ts';
import { Button, Card, Input, QueryBoundary, Table, THead, Td, Th, Tr, useToast } from '../ui/index.ts';

function DefaultFee() {
  const settings = useAdminSettings();
  const save = useSetDefaultFee();
  const toast = useToast();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState('');
  return (
    <Card graphite className="min-w-0 p-5">
      <h3 className="font-sans text-base font-semibold">Default platform fee</h3>
      <p className="mt-1 text-sm text-bone/70">Applied to atelier applications received from now on. Existing ateliers keep their own rate.</p>
      <QueryBoundary query={settings}>
        {(s) => (
          <form className="mt-4 flex flex-wrap items-end gap-3" noValidate onSubmit={(e: FormEvent) => {
            e.preventDefault();
            const bps = percentToBps(draft ?? String(s.defaultCommissionBps / 100));
            if (bps === undefined) return setError('Enter 1 to 50');
            setError('');
            save.mutate(bps, { onSuccess: () => { toast.success('Default fee updated', formatBps(bps)); setDraft(null); }, onError: (err) => setError(err.message) });
          }}>
            <Input className="w-32" label="Fee (%)" inputMode="decimal" value={draft ?? String(s.defaultCommissionBps / 100)} onChange={(e) => setDraft(e.target.value)} error={error || undefined} />
            <Button type="submit" loading={save.isPending}>Save default</Button>
          </form>
        )}
      </QueryBoundary>
    </Card>
  );
}

function CategoryRow({ c }: { c: AdminCategory }) {
  const rename = useRenameCategory();
  const del = useDeleteCategory();
  const toast = useToast();
  const [name, setName] = useState(c.name);
  const [error, setError] = useState('');
  return (
    <Tr>
      <Td>
        <Input label={`Name of ${c.name}`} hideLabel value={name} onChange={(e) => setName(e.target.value)} error={error || undefined} />
      </Td>
      <Td numeric><span className="font-numeric">{c.productCount}</span></Td>
      <Td>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={name.trim() === c.name || !name.trim()} loading={rename.isPending} onClick={() => rename.mutate({ id: c.id, name: name.trim() }, { onSuccess: () => toast.success('Category renamed'), onError: (e) => setError(e.message) })}>Rename</Button>
          <Button size="sm" variant="danger" loading={del.isPending} disabled={c.productCount > 0} aria-describedby={c.productCount > 0 ? `in-use-${c.id}` : undefined} onClick={() => del.mutate(c.id, { onSuccess: () => toast.success('Category deleted', c.name), onError: (e) => setError(e.message) })}>Delete<span className="sr-only"> {c.name}</span></Button>
          {c.productCount > 0 && <span id={`in-use-${c.id}`} className="self-center whitespace-nowrap text-xs text-bone/70">In use</span>}
        </div>
      </Td>
    </Tr>
  );
}

export function AdminCatalog() {
  const categories = useAdminCategories();
  const create = useCreateCategory();
  const toast = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
      <DefaultFee />
      <section aria-labelledby="cat-heading" className="min-w-0">
        <h3 id="cat-heading" className="font-sans text-base font-semibold">Categories</h3>
        <form className="mt-4 flex items-end gap-3" noValidate onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!name.trim()) return setError('Required');
          setError('');
          create.mutate({ name: name.trim() }, { onSuccess: () => { toast.success('Category created', name.trim()); setName(''); }, onError: (err) => setError(err.message) });
        }}>
          <Input className="flex-1" label="New category" value={name} onChange={(e) => setName(e.target.value)} error={error || undefined} />
          <Button type="submit" loading={create.isPending}>Add</Button>
        </form>
        <div className="mt-4">
          <QueryBoundary query={categories} isEmpty={(d) => d.length === 0} empty={{ title: 'No categories', message: 'Add one so ateliers can classify their pieces.' }}>
            {(list) => (
              <Table graphite caption="Categories">
                <THead graphite><Tr><Th>Name</Th><Th numeric>Pieces</Th><Th><span className="sr-only">Actions</span></Th></Tr></THead>
                <tbody>{list.map((c) => <CategoryRow key={`${c.id}-${c.name}`} c={c} />)}</tbody>
              </Table>
            )}
          </QueryBoundary>
        </div>
      </section>
    </div>
  );
}
