// ABOUTME: Atelier governance: approve, suspend and reinstate sellers and set each one's commission (1-50%).
// ABOUTME: A fee change affects future orders only; existing parcels keep the rate they were sold at.
import { useState } from 'react';
import { formatBps } from '../../lib/format.ts';
import { percentToBps, useAdminSellers, useUpdateSeller } from '../../lib/admin.ts';
import type { AdminSeller } from '../../lib/types.ts';
import { Badge, Button, Input, Modal, QueryBoundary, Table, THead, Td, Th, Tr, useToast } from '../ui/index.ts';

function FeeEditor({ seller }: { seller: AdminSeller }) {
  const update = useUpdateSeller();
  const toast = useToast();
  const [value, setValue] = useState(String(seller.commissionBps / 100));
  const [error, setError] = useState('');
  const save = () => {
    const bps = percentToBps(value);
    if (bps === undefined) return setError('1 to 50');
    setError('');
    update.mutate({ id: seller.id, patch: { commissionBps: bps } }, { onSuccess: () => toast.success('Fee updated', `${seller.name}: ${formatBps(bps)} on new orders`), onError: (e) => setError(e.message) });
  };
  return (
    <div className="flex items-end gap-2">
      <Input className="w-24" label={`Commission % for ${seller.name}`} hideLabel inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} error={error || undefined} />
      <Button size="sm" variant="secondary" loading={update.isPending} onClick={save}>Save</Button>
    </div>
  );
}

export function AdminSellers() {
  const sellers = useAdminSellers();
  const update = useUpdateSeller();
  const toast = useToast();
  const [suspending, setSuspending] = useState<AdminSeller | null>(null);
  const setStatus = (s: AdminSeller, status: AdminSeller['status'], verb: string) =>
    update.mutate({ id: s.id, patch: { status } }, { onSuccess: () => toast.success(`${s.name} ${verb}`), onError: (e) => toast.error('Could not update the atelier', e.message) });

  return (
    <QueryBoundary query={sellers} isEmpty={(d) => d.length === 0} empty={{ title: 'No ateliers yet', message: 'Applications from “Sell on Ozone” appear here for approval.' }}>
      {(list) => (
        <>
        <Table graphite caption="Ateliers">
          <THead graphite><Tr><Th>Atelier</Th><Th>Owner</Th><Th>Status</Th><Th numeric>Pieces</Th><Th>Commission</Th><Th><span className="sr-only">Actions</span></Th></Tr></THead>
          <tbody>
            {list.map((s) => (
              <Tr key={s.id}>
                <Td>{s.name}<br /><span className="text-xs text-bone/70">{s.location}</span></Td>
                <Td><span className="text-xs">{s.email}</span></Td>
                <Td><Badge tone={s.status === 'active' ? 'success' : s.status === 'suspended' ? 'danger' : 'warning'}>{s.status === 'pending_approval' ? 'Pending' : s.status === 'active' ? 'Active' : 'Suspended'}</Badge></Td>
                <Td numeric><span className="font-numeric">{s.productCount}</span></Td>
                <Td><FeeEditor seller={s} /></Td>
                <Td>
                  <div className="flex gap-2">
                    {s.status !== 'active' && <Button size="sm" onClick={() => setStatus(s, 'active', s.status === 'pending_approval' ? 'approved' : 'reinstated')}>{s.status === 'pending_approval' ? 'Approve' : 'Reinstate'}<span className="sr-only"> {s.name}</span></Button>}
                    {s.status === 'active' && <Button size="sm" variant="secondary" onClick={() => setSuspending(s)}>Suspend<span className="sr-only"> {s.name}</span></Button>}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Modal graphite size="sm" open={suspending !== null} onClose={() => setSuspending(null)} title={`Suspend ${suspending?.name}?`}>
          <p className="text-sm">Their products leave the storefront and payouts pause until you reinstate them.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSuspending(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { if (suspending) setStatus(suspending, 'suspended', 'suspended'); setSuspending(null); }}>Suspend atelier</Button>
          </div>
        </Modal>
        </>
      )}
    </QueryBoundary>
  );
}
