// ABOUTME: Concurrency Lab (admin): fires N real parallel one-unit reservations at the cart's atomic stock guard and shows the outcome.
// ABOUTME: Everything shown is measured by the server run (counts, per-request timings); the units are released right after.
import { useState } from 'react';
import { useLabVariants, useRunLab } from '../../lib/admin.ts';
import { Badge, Button, Input, Modal, QueryBoundary, Select } from '../ui/index.ts';

export function ConcurrencyLabModal({ onClose }: { onClose: () => void }) {
  const variants = useLabVariants();
  const run = useRunLab();
  const [variantId, setVariantId] = useState('');
  const [attempts, setAttempts] = useState('20');
  const [error, setError] = useState('');
  const result = run.data;

  const start = () => {
    const n = Number(attempts);
    if (!variantId) return setError('Choose an edition to test');
    if (!Number.isInteger(n) || n < 2 || n > 100) return setError('Parallel requests must be a whole number from 2 to 100');
    setError('');
    run.mutate({ variantId, attempts: n }, { onError: (e) => setError(e.message) });
  };
  const sorted = result ? [...result.timingsMs].sort((a, b) => a - b) : [];

  return (
    <Modal open onClose={onClose} title="Concurrency Lab" size="lg" graphite>
      <p className="text-sm text-bone/70">Sends N reservation requests at the same instant for one edition. The stock guard must grant at most the free units; everyone else gets a conflict. Granted units are released immediately after the run.</p>
      <QueryBoundary query={variants} isEmpty={(d) => d.length === 0} empty={{ title: 'Nothing to test', message: 'Publish at least one piece from an active atelier.' }}>
        {(list) => (
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
            <Select label="Edition" value={variantId} onChange={(e) => setVariantId(e.target.value)} options={[{ value: '', label: 'Choose…' }, ...list.map((v) => ({ value: v.id, label: `${v.label} (${v.stock - v.reserved} free)` }))]} />
            <Input label="Parallel requests" inputMode="numeric" value={attempts} onChange={(e) => setAttempts(e.target.value)} />
            <Button loading={run.isPending} onClick={start}>Run test</Button>
          </div>
        )}
      </QueryBoundary>
      {error && <p role="alert" className="mt-3 text-sm text-danger-on-dark">{error}</p>}

      {result && (
        <section aria-labelledby="lab-result" className="mt-6">
          <h3 id="lab-result" className="font-display text-xl">Result</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Free units before', result.availableBefore], ['Granted', result.succeeded], ['Conflicts', result.conflicts], ['Released after', result.released]].map(([k, v]) => (
              <div key={k as string} className="border border-graphite-line p-3"><dt className="label-caps text-bone/70">{k}</dt><dd className="font-numeric text-2xl">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-3 flex items-center gap-2 text-sm">
            {result.oversold ? <Badge tone="danger">Oversold</Badge> : <Badge tone="success">Not oversold</Badge>}
            Peak reserved {result.reservedAtPeak}; all {result.attempts} requests finished in <span className="font-numeric">{result.totalMs} ms</span>
            {sorted.length > 0 && <> (fastest {sorted[0]} ms, median {sorted[Math.floor(sorted.length / 2)]} ms, slowest {sorted[sorted.length - 1]} ms)</>}.
          </p>
        </section>
      )}
    </Modal>
  );
}
