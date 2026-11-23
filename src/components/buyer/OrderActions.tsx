// ABOUTME: Buyer actions on one sub-order: cancel (PLACED/PAID) and request a return (DELIVERED, reason required).
// ABOUTME: Buttons mirror the server rules; the server remains the authority and its errors are shown inline.
import { useState } from 'react';
import { useSubOrderTransition } from '../../lib/orders.ts';
import type { SubOrderData } from '../../lib/types.ts';
import { Button, Input, Modal, useToast } from '../ui/index.ts';

export function OrderActions({ sub }: { sub: SubOrderData }) {
  const act = useSubOrderTransition();
  const toast = useToast();
  const [dialog, setDialog] = useState<'cancel' | 'return' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const canCancel = sub.status === 'PLACED' || sub.status === 'PAID';
  const canReturn = sub.status === 'DELIVERED';
  if (!canCancel && !canReturn) return null;

  const close = () => { setDialog(null); setReason(''); setError(''); };
  const submit = (to: 'CANCELLED' | 'RETURN_REQUESTED') => {
    if (to === 'RETURN_REQUESTED' && !reason.trim()) { setError('Tell the atelier why you are returning this'); return; }
    act.mutate({ code: sub.code, to, reason: reason.trim() || undefined }, {
      onSuccess: () => { toast.success(to === 'CANCELLED' ? 'Parcel cancelled' : 'Return requested', sub.code); close(); },
      onError: (e) => setError(e.message),
    });
  };

  return (
    <>
      {canCancel && <Button variant="secondary" onClick={() => setDialog('cancel')}>Cancel this parcel</Button>}
      {canReturn && <Button variant="secondary" onClick={() => setDialog('return')}>Request a return</Button>}

      <Modal open={dialog === 'cancel'} onClose={close} title="Cancel this parcel?" size="sm">
        <p className="text-sm text-sage">{sub.seller.name}’s parcel {sub.code} will be cancelled and the items returned to stock. Other parcels in the order are not affected.</p>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" onClick={close}>Keep it</Button>
          <Button className="flex-1" loading={act.isPending} onClick={() => submit('CANCELLED')}>Cancel parcel</Button>
        </div>
      </Modal>

      <Modal open={dialog === 'return'} onClose={close} title="Request a return" size="sm">
        <Input label="Reason for the return" value={reason} onChange={(e) => setReason(e.target.value)} error={error || undefined} maxLength={500} required />
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" onClick={close}>Back</Button>
          <Button className="flex-1" loading={act.isPending} onClick={() => submit('RETURN_REQUESTED')}>Send request</Button>
        </div>
      </Modal>
    </>
  );
}
