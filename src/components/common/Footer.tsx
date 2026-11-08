import React from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { ShieldCheck, RotateCcw, Lock, Split } from 'lucide-react';

export const Footer: React.FC = () => {
  const { sellers, resetToDefaults } = useMarketplace();

  return (
    <footer className="mt-20 border-t border-[#E3DDD0] bg-[#FFFFFF] text-[#14181A]">
      {/* Guarantees bar */}
      <div className="border-b border-[#E3DDD0] px-6 lg:px-12 py-8 bg-[#FAF8F5]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div className="flex items-start gap-4">
            <Lock className="w-5 h-5 text-[#0E3B3A] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-editorial text-base text-[#0E3B3A] mb-1">
                Concurrency-Safe Inventory
              </h4>
              <p className="text-xs text-[#5E6663] leading-relaxed">
                Conditional atomic stock updates guarantee the last unit sells only once with 10-minute automated TTL reservations.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Split className="w-5 h-5 text-[#C9A25D] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-editorial text-base text-[#0E3B3A] mb-1">
                Transparent Split Orders
              </h4>
              <p className="text-xs text-[#5E6663] leading-relaxed">
                One cart seamlessly splits into distinct sub-orders per atelier with verified commission ledgers and independent tracking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-[#0E3B3A] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-editorial text-base text-[#0E3B3A] mb-1">
                Enforced Order Lifecycle
              </h4>
              <p className="text-xs text-[#5E6663] leading-relaxed">
                Finite state machine enforces strictly validated status transitions, audit logs, and escrow-backed return settlements.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer directory */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <span className="font-editorial text-2xl text-[#0E3B3A] block">
            Ozone
          </span>
          <p className="text-xs text-[#5E6663] leading-relaxed">
            An editorial sanctuary connecting discerning patrons with master craftsmen, horologists, and interior ateliers worldwide.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                if (window.confirm('Reset all demo state, inventory, orders, and ledger to original seed data?')) {
                  resetToDefaults();
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[#5E6663] hover:text-[#0E3B3A] border border-[#E3DDD0] px-3 py-1.5 rounded transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Demo State</span>
            </button>
          </div>
        </div>

        <div>
          <h5 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#14181A] mb-4">
            Accredited Ateliers
          </h5>
          <ul className="space-y-2 text-xs text-[#5E6663]">
            {sellers.map(s => (
              <li key={s.id} className="flex items-center justify-between">
                <span>{s.name}</span>
                <span className="text-[10px] text-[#C9A25D]">{s.location}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#14181A] mb-4">
            Platform Taxonomy
          </h5>
          <ul className="space-y-2 text-xs text-[#5E6663]">
            <li>Horology & Architectural Movements</li>
            <li>Solid Timber Joinery & Lighting</li>
            <li>Botanical Amber Distillations</li>
            <li>Bespoke Double-Faced Cashmere</li>
            <li>Subterranean Basalt Ceramics</li>
          </ul>
        </div>

        <div>
          <h5 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#14181A] mb-4">
            Governance & Integrity
          </h5>
          <div className="space-y-2 text-xs text-[#5E6663]">
            <p>MERN Architecture Core</p>
            <p>Idempotency Key Guaranteed</p>
            <p>Atomic Multi-Document Transactions</p>
            <p className="font-mono-tabular text-[11px] text-[#C9A25D] pt-2">
              All transactions executed in Sandbox Mode
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E3DDD0] px-6 lg:px-12 py-6 text-center text-xs text-[#5E6663]">
        <p>© 2026 Ozone Multi-Vendor Marketplace. Concurrency & Multi-Vendor Engine.</p>
      </div>
    </footer>
  );
};
