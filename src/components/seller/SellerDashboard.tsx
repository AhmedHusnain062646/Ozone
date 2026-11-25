// ABOUTME: Seller console (/seller): atelier name and approval status beside Overview / Products / Orders / Earnings.
// ABOUTME: The active section lives in the URL (?tab=) so a refresh or shared link lands in the same place.
import { useSearchParams } from 'react-router';
import { formatBps } from '../../lib/format.ts';
import { useSellerProfile, useSellerSummary } from '../../lib/seller.ts';
import { ConsoleShell } from '../common/ConsoleShell.tsx';
import { Badge, QueryBoundary } from '../ui/index.ts';
import { SellerEarnings } from './SellerEarnings.tsx';
import { SellerOrders } from './SellerOrders.tsx';
import { SellerOverview } from './SellerOverview.tsx';
import { SellerProducts } from './SellerProducts.tsx';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Orders' },
  { id: 'earnings', label: 'Earnings' },
];

export function SellerDashboard() {
  const [params] = useSearchParams();
  const profile = useSellerProfile();
  const summary = useSellerSummary();
  const tab = SECTIONS.some((s) => s.id === params.get('tab')) ? params.get('tab')! : 'overview';
  const p = profile.data;

  if (!p) {
    return (
      <div className="px-margin py-10 md:px-8">
        <QueryBoundary query={profile}>{() => null}</QueryBoundary>
      </div>
    );
  }

  return (
    <ConsoleShell
      title={p.name}
      current={tab}
      items={SECTIONS.map((s) => (s.id === 'orders' ? { ...s, count: summary.data?.toFulfilCount } : s))}
      meta={
        <>
          <p className="text-sage">{[p.location, p.tagline].filter(Boolean).join(' · ')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={p.status === 'active' ? 'success' : p.status === 'suspended' ? 'danger' : 'warning'}>
              {p.status === 'active' ? 'Active' : p.status === 'suspended' ? 'Suspended' : 'Awaiting approval'}
            </Badge>
            <span className="text-sage">Platform fee {formatBps(p.commissionBps)}</span>
          </div>
        </>
      }
    >
      {p.status !== 'active' && (
        <div role="status" className="mb-6 border border-gold bg-gold-wash p-4">
          {p.status === 'pending_approval'
            ? 'Your atelier is awaiting approval. You can prepare drafts now; an Ozone admin must activate you before anything can be published or withdrawn.'
            : 'Your atelier is suspended. Your products are hidden from the storefront and payouts are paused.'}
        </div>
      )}
      {tab === 'overview' && <SellerOverview />}
      {tab === 'products' && <SellerProducts canPublish={p.status === 'active'} />}
      {tab === 'orders' && <SellerOrders />}
      {tab === 'earnings' && <SellerEarnings canWithdraw={p.status === 'active'} />}
    </ConsoleShell>
  );
}
