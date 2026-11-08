import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { AtelierSeller, OrderStatus } from '../../types/marketplace';
import {
  ShieldCheck,
  Percent,
  DollarSign,
  Package,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  ArrowUpRight,
  TrendingUp,
  FileText
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    sellers,
    updateSellerCommission,
    setSellerStatus,
    orders,
    ledger,
    products,
    processRefund,
    concurrencyLogs,
  } = useMarketplace();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'analytics' | 'approvals' | 'taxonomy' | 'tribunal' | 'globalfee'>('analytics');

  // Custom commission tuner state for Kurogane Forge (applicant)
  const [kuroganeCommission, setKuroganeCommission] = useState(9.0);
  const [kuroganeApproved, setKuroganeApproved] = useState(false);

  // Dispute Tribunal resolution state
  const [disputeResolved, setDisputeResolved] = useState(false);
  const [disputeStatus, setDisputeStatus] = useState<'active' | 'refunded' | 'under_review' | 'dismissed'>('active');

  // Global default fee rate
  const [globalFee, setGlobalFee] = useState(8.5);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleApproveKurogane = () => {
    setSellerStatus('seller-kurogane', 'active');
    updateSellerCommission('seller-kurogane', kuroganeCommission / 100);
    setKuroganeApproved(true);
    setFeedback(`Kurogane Forge accredited with ${kuroganeCommission.toFixed(1)}% commission fee. Sovereign key issued.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAuthorizeRefund = () => {
    setDisputeStatus('refunded');
    setDisputeResolved(true);
    setFeedback('Immediate refund of $955.00 authorized. Multi-sig escrow unlocked to collector account.');
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* 1. Sovereign Governance Header */}
      <div className="p-5 bg-[#0E3B3A] text-white rounded border border-[#164C4B] shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#7FE3C4] animate-pulse" />
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#7FE3C4]">
              Sovereign Governance
            </span>
          </div>
          <span className="font-mono-tabular text-[11px] text-[#E3DDD0]">
            SysAdmin Julian S.
          </span>
        </div>

        <div>
          <h1 className="font-editorial text-3xl font-semibold text-white">
            Admin Control Room
          </h1>
          <p className="text-xs text-[#E3DDD0] flex items-center gap-2 mt-1">
            <ShieldCheck className="w-4 h-4 text-[#7FE3C4]" />
            <span>System Nominal • 99.98% Autonomous Escrow</span>
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#164C4B] text-[11px] font-semibold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-[#FFFFFF] text-[#0E3B3A]'
                : 'text-[#E3DDD0] hover:bg-[#164C4B]'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'approvals'
                ? 'bg-[#FFFFFF] text-[#0E3B3A]'
                : 'text-[#E3DDD0] hover:bg-[#164C4B]'
            }`}
          >
            Approvals (4)
          </button>
          <button
            onClick={() => setActiveTab('taxonomy')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'taxonomy'
                ? 'bg-[#FFFFFF] text-[#0E3B3A]'
                : 'text-[#E3DDD0] hover:bg-[#164C4B]'
            }`}
          >
            Taxonomy
          </button>
          <button
            onClick={() => setActiveTab('tribunal')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tribunal'
                ? 'bg-[#FFFFFF] text-[#0E3B3A]'
                : 'text-[#E3DDD0] hover:bg-[#164C4B]'
            }`}
          >
            <span>Tribunal</span>
            <span className="w-2 h-2 rounded-full bg-[#C9A25D]" />
          </button>
          <button
            onClick={() => setActiveTab('globalfee')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'globalfee'
                ? 'bg-[#FFFFFF] text-[#0E3B3A]'
                : 'text-[#E3DDD0] hover:bg-[#164C4B]'
            }`}
          >
            Global Fee
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-[#E8F3EE] border border-[#2F7D5B] text-[#0E3B3A] text-xs rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2F7D5B] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 2. Executive Pulse: Telemetry & Settlement */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Executive Pulse
            </span>
            <h2 className="font-editorial text-2xl text-[#0E3B3A] font-semibold">
              Telemetry & Settlement
            </h2>
          </div>
          <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#E3DDD0] text-[#717978] text-[10px] font-mono-tabular rounded flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#C9A25D]" />
            <span>Trailing Moon</span>
          </span>
        </div>

        {/* 4-Card KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1 */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Gross GMV
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-2xl font-bold text-[#0E3B3A]">$428,950</span>
              <span className="text-[10px] text-[#2F7D5B] font-mono-tabular font-semibold">↑ +18.4%</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Escrow Held
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-2xl font-bold text-[#0E3B3A]">$84,200</span>
              <span className="text-[10px] text-[#78591b] font-medium flex items-center gap-0.5">
                🔒 Vault Secure
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Accredited
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-2xl font-bold text-[#0E3B3A]">38</span>
              <span className="text-[10px] text-[#717978]">Certified Ateliers</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Mean Basket
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-2xl font-bold text-[#0E3B3A]">$1,840</span>
              <span className="text-[10px] text-[#717978]">High-Value Archival</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recharts Trajectory Engine: Settlement Inflow Curve */}
      <div className="p-5 bg-[#0E3B3A] text-white rounded border border-[#164C4B] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-[#7FE3C4] font-semibold block">
              Recharts Trajectory Engine
            </span>
            <h3 className="font-editorial text-xl font-medium text-white">
              Settlement Inflow Curve
            </h3>
          </div>
          <span className="px-2 py-0.5 bg-[#164C4B] text-[#7FE3C4] border border-[#7FE3C4]/30 rounded text-[10px] font-mono-tabular font-semibold">
            $19,420 pk
          </span>
        </div>

        {/* SVG Curve with Tooltip Pin */}
        <div className="relative pt-4 pb-2">
          {/* Day 26 Peak Tooltip Tag */}
          <div className="absolute top-0 right-28 bg-[#FFFFFF] text-[#0E3B3A] text-[10px] font-mono-tabular px-2.5 py-1 rounded shadow-md border border-[#E3DDD0] text-center font-bold">
            <span className="block text-[8px] text-[#717978] uppercase font-sans">Day 26 Peak</span>
            <span>$19,420.00</span>
          </div>

          {/* Vector Curve */}
          <svg viewBox="0 0 400 120" className="w-full h-32 overflow-visible">
            <defs>
              <linearGradient id="inflowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7FE3C4" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#7FE3C4" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 10 95 Q 80 85, 140 70 T 260 40 T 310 25 T 390 45"
              fill="none"
              stroke="#7FE3C4"
              strokeWidth="2.5"
            />
            <path
              d="M 10 95 Q 80 85, 140 70 T 260 40 T 310 25 T 390 45 L 390 120 L 10 120 Z"
              fill="url(#inflowGrad)"
            />
            {/* Peak Node */}
            <circle cx="310" cy="25" r="4.5" fill="#FFFFFF" stroke="#0E3B3A" strokeWidth="2" />
          </svg>

          <div className="flex justify-between text-[10px] font-mono-tabular text-[#E3DDD0]/70 pt-2 border-t border-[#164C4B]">
            <span>D-30</span>
            <span>D-20</span>
            <span>D-10</span>
            <span className="text-[#7FE3C4] font-semibold">Today</span>
          </div>
        </div>
      </div>

      {/* 4. Order Liquidity State Donut & Top Atelier Volume */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut Liquidity Ring */}
        <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold">
              Order Liquidity State
            </span>
            <span className="text-[10px] font-mono-tabular text-[#78591b]">
              100% Monitored
            </span>
          </div>

          <div className="flex items-center gap-4 pt-1">
            {/* SVG Donut */}
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#EAE5D9"
                  strokeWidth="3.8"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#0E3B3A"
                  strokeWidth="3.8"
                  strokeDasharray="72, 100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-mono-tabular text-xs font-bold text-[#0E3B3A]">
                72%
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-[#5E6663]">
                  <span className="w-2 h-2 rounded-full bg-[#0E3B3A]" />
                  <span>Settled</span>
                </span>
                <span className="font-mono-tabular font-medium text-[#14181A]">72%</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-[#5E6663]">
                  <span className="w-2 h-2 rounded-full bg-[#717978]" />
                  <span>In Transit</span>
                </span>
                <span className="font-mono-tabular font-medium text-[#14181A]">18%</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-[#5E6663]">
                  <span className="w-2 h-2 rounded-full bg-[#C9A25D]" />
                  <span>Escrow Hold</span>
                </span>
                <span className="font-mono-tabular font-medium text-[#14181A]">10%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Atelier Volume */}
        <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-3">
          <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
            Top Atelier Volume
          </span>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono-tabular text-[#78591b] font-bold text-xs">01</span>
                <div>
                  <span className="font-editorial text-sm font-semibold text-[#0E3B3A] block">
                    Atelier Vane
                  </span>
                  <span className="text-[10px] text-[#717978]">Bespoke Horology & Stone</span>
                </div>
              </div>
              <span className="font-mono-tabular font-bold text-[#14181A]">$142,000</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono-tabular text-[#717978] font-bold text-xs">02</span>
                <div>
                  <span className="font-editorial text-sm font-semibold text-[#0E3B3A] block">
                    Maison Silt
                  </span>
                  <span className="text-[10px] text-[#717978]">Silk & Loom Archive</span>
                </div>
              </div>
              <span className="font-mono-tabular font-bold text-[#14181A]">$98,400</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono-tabular text-[#717978] font-bold text-xs">03</span>
                <div>
                  <span className="font-editorial text-sm font-semibold text-[#0E3B3A] block">
                    Homage Atelier
                  </span>
                  <span className="text-[10px] text-[#717978]">Precious Metal Smiths</span>
                </div>
              </div>
              <span className="font-mono-tabular font-bold text-[#14181A]">$84,150</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Queue #04 Seller Accreditation with Commission Tuner */}
      <div className="p-5 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Queue #04
            </span>
            <h3 className="font-editorial text-xl font-semibold text-[#0E3B3A]">
              Seller Accreditation
            </h3>
          </div>
          <span className="px-2 py-0.5 bg-[#F5E6CA] text-[#78591b] border border-[#C9A25D]/40 rounded text-[10px] font-semibold uppercase tracking-wider">
            Priority
          </span>
        </div>

        {/* Applicant Dossier: Kurogane Forge */}
        <div className="p-4 bg-[#FAF8F5] border border-[#E3DDD0] rounded space-y-3">
          <div className="flex gap-3">
            <div className="w-16 h-16 bg-[#0E3B3A] text-white rounded flex items-center justify-center font-editorial text-xl font-bold shrink-0">
              KF
            </div>
            <div className="space-y-0.5 flex-1">
              <span className="text-[9px] uppercase tracking-wider text-[#717978] block">
                Applicant Dossier
              </span>
              <h4 className="font-editorial text-base font-semibold text-[#0E3B3A]">
                Kurogane Forge
              </h4>
              <p className="text-[11px] text-[#5E6663]">
                Seki, Japan • Handcrafted Damascus
              </p>
              <p className="text-[10px] font-mono-tabular text-[#78591b]">
                Cat: Culinary Arts
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#E3DDD0] text-[11px]">
            <div className="flex items-center justify-between sm:justify-start gap-1 text-[#5E6663]">
              <span>Portfolio Provenance:</span>
              <span className="text-[#2F7D5B] font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Verified
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-1 text-[#5E6663]">
              <span>SWIFT Bank Routing:</span>
              <span className="text-[#2F7D5B] font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Passed (MUFG)
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-1 text-[#5E6663]">
              <span>Physical Sample:</span>
              <span className="text-[#0E3B3A] font-semibold">Tokyo Hub</span>
            </div>
          </div>

          {/* Interactive Custom Commission Tuner (5% - 15%) */}
          <div className="p-3 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold">
                Custom Commission Tuner
              </span>
              <span className="font-mono-tabular text-sm font-bold text-[#78591b]">
                {kuroganeCommission.toFixed(1)}% Fee
              </span>
            </div>

            <input
              type="range"
              min="5"
              max="15"
              step="0.5"
              value={kuroganeCommission}
              onChange={e => setKuroganeCommission(parseFloat(e.target.value))}
              className="w-full accent-[#0E3B3A] cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-[#717978] font-mono-tabular">
              <span>5.0% Minimal</span>
              <span className="text-[#0E3B3A] font-semibold">Standard 8.5%</span>
              <span>15.0% Max</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={handleApproveKurogane}
              disabled={kuroganeApproved}
              className="w-full py-2.5 px-4 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Award className="w-4 h-4 text-[#C9A25D]" />
              <span>{kuroganeApproved ? 'Atelier Accredited & Key Active' : 'Approve Atelier & Issue Key'}</span>
            </button>
            <button
              onClick={() => alert('Dossier returned to Seki Guild with protocol observation note.')}
              className="w-full text-center text-[11px] text-[#9A2E26] hover:underline uppercase tracking-wider font-semibold cursor-pointer py-1"
            >
              Reject with Protocol Reason
            </button>
          </div>
        </div>
      </div>

      {/* 6. Escrow Arbitrage: Dispute Tribunal */}
      <div className="p-5 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Escrow Arbitrage
            </span>
            <h3 className="font-editorial text-xl font-semibold text-[#0E3B3A]">
              Dispute Tribunal
            </h3>
          </div>
          <span className="px-2 py-0.5 bg-[#FAF8F5] border border-[#E3DDD0] text-[#717978] rounded text-[10px] font-mono-tabular">
            Active (1 of 2)
          </span>
        </div>

        {/* Dispute Card: #DIS-9921 */}
        <div className="p-4 bg-[#FAF8F5] border border-[#E3DDD0] rounded space-y-3">
          <div className="flex items-center justify-between border-b border-[#E3DDD0] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#9A2E26]" />
              <span className="font-mono-tabular font-bold text-xs text-[#14181A]">#DIS-9921</span>
            </div>
            <span className="font-mono-tabular text-sm font-bold text-[#0E3B3A]">
              $955.00 <span className="text-[10px] text-[#717978] font-normal">USD</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-[#717978] block">Order Identifier:</span>
              <span className="font-mono-tabular font-medium text-[#14181A]">#OZ-2025-9112</span>
            </div>
            <div>
              <span className="text-[10px] text-[#717978] block">Item Contested:</span>
              <span className="font-medium text-[#14181A]">Maison Silt Archive Kimono</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-[#717978] block">Claim Type:</span>
              <span className="font-semibold text-[#9A2E26]">
                Sizing Variance (+4cm Hem)
              </span>
            </div>
          </div>

          {/* Provenance Evidence 2 Frames */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Provenance Evidence (2 Frames)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative aspect-[4/3] bg-zinc-100 rounded overflow-hidden border border-[#E3DDD0]">
                <img
                  src="/src/assets/images/product_cashmere_overcoat_1794146209378.jpg"
                  alt="Collar Weave"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-mono-tabular rounded">
                  Collar Weave
                </span>
              </div>
              <div className="relative aspect-[4/3] bg-zinc-100 rounded overflow-hidden border border-[#E3DDD0]">
                <img
                  src="/src/assets/images/product_cashmere_overcoat_1794146209378.jpg"
                  alt="Hem Dimension"
                  className="w-full h-full object-cover scale-125"
                />
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-mono-tabular rounded">
                  Hem Dimension
                </span>
              </div>
            </div>
          </div>

          {/* Tribunal Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleAuthorizeRefund}
              disabled={disputeResolved}
              className="w-full py-2.5 px-4 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <DollarSign className="w-4 h-4 text-[#C9A25D]" />
              <span>{disputeResolved ? 'Refund Executed to Collector' : 'Authorize Immediate Refund ($955.00)'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => alert('Maison Silt contacted for 24-hour review before escrow release.')}
                className="py-2 px-3 bg-white border border-[#E3DDD0] text-xs font-semibold text-[#5E6663] hover:text-[#0E3B3A] rounded cursor-pointer text-center"
              >
                Request Atelier Review
              </button>
              <button
                onClick={() => alert('Claim dismissed under certified dimensional tolerance codex.')}
                className="py-2 px-3 bg-white border border-[#E3DDD0] text-xs font-semibold text-[#9A2E26] hover:bg-[#FDF2F1] rounded cursor-pointer text-center"
              >
                Dismiss Claim
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Protocol Ledger: Global Fee & Audit Log */}
      <div className="p-5 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-4 shadow-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
            Protocol Ledger
          </span>
          <h3 className="font-editorial text-xl font-semibold text-[#0E3B3A]">
            Global Fee & Audit Log
          </h3>
        </div>

        <div className="p-4 bg-[#FAF8F5] border border-[#E3DDD0] rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Default Fee Rate
            </span>
            <span className="font-mono-tabular text-xl font-bold text-[#0E3B3A]">
              {globalFee.toFixed(2)}% Net
            </span>
          </div>

          <button
            onClick={() => {
              const newFee = prompt('Enter new platform commission fee rate (%):', globalFee.toString());
              if (newFee) setGlobalFee(parseFloat(newFee));
            }}
            className="px-4 py-2 bg-[#0E3B3A] text-white text-xs font-semibold uppercase tracking-wider rounded cursor-pointer hover:bg-[#164C4B]"
          >
            Update Fee
          </button>
        </div>

        {/* Live Immutable Audit Trail Terminal Box */}
        <div className="p-4 bg-[#082423] text-white rounded font-mono-tabular text-xs space-y-2.5">
          <span className="text-[9px] uppercase tracking-wider text-[#7FE3C4] block">
            Live Immutable Audit Trail
          </span>
          <div className="space-y-1.5 text-[11px] leading-relaxed">
            <div className="flex gap-2">
              <span className="text-[#7FE3C4] shrink-0">14:22:08</span>
              <span className="text-[#E3DDD0]">
                Admin JS-01 authorized Atelier Vane payout <strong className="text-[#C9A25D]">#PAY-8812</strong> ($14,200.00)
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#7FE3C4] shrink-0">13:58:11</span>
              <span className="text-[#E3DDD0]">
                Batch escrow lock confirmed on sub-order <strong className="text-white">#OZ-9932</strong>
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#7FE3C4] shrink-0">12:04:45</span>
              <span className="text-[#E3DDD0]">
                Taxonomy tag [Urushi Lacquer] approved for category 04
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-xs">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#717978]" />
            <span className="text-[#717978] text-[10px] font-mono-tabular">
              HASH // 79B-89E-A21F
            </span>
          </div>
          <button
            onClick={() => alert('Cryptographic audit hash exported to local keystore.')}
            className="px-3 py-1.5 bg-[#FAF8F5] border border-[#E3DDD0] text-[#0E3B3A] text-xs font-semibold rounded cursor-pointer hover:bg-[#F0EBE0]"
          >
            Export Hash
          </button>
        </div>
      </div>
    </div>
  );
};
