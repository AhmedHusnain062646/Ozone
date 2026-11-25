// ABOUTME: Seller console shell (/seller): atelier header with approval status, then Overview / Products / Orders / Earnings tabs.
// ABOUTME: The active tab lives in the URL (?tab=) so a refresh or shared link lands in the same place.
import { useSearchParams } from 'react-router';
import { formatBps } from '../../lib/format.ts';
import { useSellerProfile } from '../../lib/seller.ts';
import { Badge, QueryBoundary, Tabs } from '../ui/index.ts';
import { SellerEarnings } from './SellerEarnings.tsx';
import { SellerOrders } from './SellerOrders.tsx';
import { SellerOverview } from './SellerOverview.tsx';
import { SellerProducts } from './SellerProducts.tsx';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Orders' },
  { id: 'earnings', label: 'Earnings' },
];

export function SellerDashboard() {
  const [params, setParams] = useSearchParams();
  const profile = useSellerProfile();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab')! : 'overview';

  return (
    <section className="mx-auto max-w-[1440px] px-margin py-10 md:px-16" aria-labelledby="seller-heading">
      <QueryBoundary query={profile}>
        {(p) => (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label-caps text-sage">Atelier console</p>
                <h1 id="seller-heading" className="font-display text-[28px] leading-9 md:text-[40px] md:leading-[48px]">{p.name}</h1>
                <p className="text-sm text-sage">{[p.location, p.tagline].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={p.status === 'active' ? 'success' : p.status === 'suspended' ? 'danger' : 'warning'}>
                  {p.status === 'active' ? 'Active' : p.status === 'suspended' ? 'Suspended' : 'Awaiting approval'}
                </Badge>
                <span className="text-sm text-sage">Platform fee {formatBps(p.commissionBps)}</span>
              </div>
            </div>

            {p.status !== 'active' && (
              <div role="status" className="mt-6 border border-gold bg-gold-wash p-4 text-sm">
                {p.status === 'pending_approval'
                  ? 'Your atelier is awaiting approval. You can prepare drafts now; an Ozone admin must activate you before anything can be published or withdrawn.'
                  : 'Your atelier is suspended. Your products are hidden from the storefront and payouts are paused.'}
              </div>
            )}

            <div className="mt-8">
              <Tabs tabs={TABS} value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} idPrefix="seller" />
              <div id="seller-panel" role="tabpanel" aria-labelledby={`seller-tab-${tab}`} className="pt-8">
                {tab === 'overview' && <SellerOverview />}
                {tab === 'products' && <SellerProducts canPublish={p.status === 'active'} />}
                {tab === 'orders' && <SellerOrders />}
                {tab === 'earnings' && <SellerEarnings canWithdraw={p.status === 'active'} />}
              </div>
            </div>
          </>
        )}
      </QueryBoundary>
    </section>
  );
}
