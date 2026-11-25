// ABOUTME: Admin console (/admin) on the graphite back-of-house surface: Overview, Sellers, Catalog, Returns, plus the Concurrency Lab.
// ABOUTME: Role-gated at the route; every figure and action is served by /api/admin and re-authorised server-side.
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAnalytics } from '../../lib/admin.ts';
import { ConsoleShell } from '../common/ConsoleShell.tsx';
import { Button } from '../ui/index.ts';
import { ConcurrencyLabModal } from '../concurrency/ConcurrencyLabModal.tsx';
import { AdminCatalog } from './AdminCatalog.tsx';
import { AdminOverview } from './AdminOverview.tsx';
import { AdminReturns } from './AdminReturns.tsx';
import { AdminSellers } from './AdminSellers.tsx';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sellers', label: 'Ateliers' },
  { id: 'catalog', label: 'Catalogue & fees' },
  { id: 'returns', label: 'Returns' },
];

export function AdminDashboard() {
  const [params] = useSearchParams();
  const [labOpen, setLabOpen] = useState(false);
  const analytics = useAnalytics();
  const tab = SECTIONS.some((s) => s.id === params.get('tab')) ? params.get('tab')! : 'overview';
  const waiting: Record<string, number | undefined> = {
    sellers: analytics.data?.sellersByStatus.pending_approval,
    returns: analytics.data?.subOrdersByStatus.RETURN_REQUESTED,
  };

  return (
    <>
      <ConsoleShell
        graphite
        title="Admin"
        current={tab}
        items={SECTIONS.map((s) => ({ ...s, count: waiting[s.id] }))}
        sidebarExtra={<Button variant="secondary" size="sm" onClick={() => setLabOpen(true)}>Concurrency Lab</Button>}
      >
        {tab === 'overview' && <AdminOverview />}
        {tab === 'sellers' && <AdminSellers />}
        {tab === 'catalog' && <AdminCatalog />}
        {tab === 'returns' && <AdminReturns />}
      </ConsoleShell>
      {labOpen && <ConcurrencyLabModal onClose={() => setLabOpen(false)} />}
    </>
  );
}
