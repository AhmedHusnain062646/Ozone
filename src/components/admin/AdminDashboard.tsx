// ABOUTME: Admin console shell (/admin) on the graphite back-of-house surface: Overview, Sellers, Catalog, Returns, plus the Concurrency Lab.
// ABOUTME: Role-gated at the route; every figure and action is served by /api/admin and re-authorised server-side.
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button, Tabs } from '../ui/index.ts';
import { ConcurrencyLabModal } from '../concurrency/ConcurrencyLabModal.tsx';
import { AdminCatalog } from './AdminCatalog.tsx';
import { AdminOverview } from './AdminOverview.tsx';
import { AdminReturns } from './AdminReturns.tsx';
import { AdminSellers } from './AdminSellers.tsx';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sellers', label: 'Ateliers' },
  { id: 'catalog', label: 'Catalogue & fees' },
  { id: 'returns', label: 'Returns' },
];

export function AdminDashboard() {
  const [params, setParams] = useSearchParams();
  const [labOpen, setLabOpen] = useState(false);
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab')! : 'overview';

  return (
    <div className="on-graphite min-h-[calc(100vh-4rem)] bg-graphite text-bone">
      <section className="mx-auto max-w-[1440px] px-margin py-10 md:px-16" aria-labelledby="admin-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-bone/70">Governance</p>
            <h1 id="admin-heading" className="font-display text-[28px] leading-9 md:text-[40px] md:leading-[48px]">Platform control room</h1>
          </div>
          <Button variant="secondary" onClick={() => setLabOpen(true)}>Concurrency Lab</Button>
        </div>
        <div className="mt-8">
          <Tabs graphite tabs={TABS} value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} idPrefix="admin" />
          <div id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`} className="pt-8">
            {tab === 'overview' && <AdminOverview />}
            {tab === 'sellers' && <AdminSellers />}
            {tab === 'catalog' && <AdminCatalog />}
            {tab === 'returns' && <AdminReturns />}
          </div>
        </div>
      </section>
      {labOpen && <ConcurrencyLabModal onClose={() => setLabOpen(false)} />}
    </div>
  );
}
