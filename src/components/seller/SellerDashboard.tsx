import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { AtelierSeller, OrderStatus, Product } from '../../types/marketplace';
import {
  Store,
  Package,
  DollarSign,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ShieldCheck,
  RefreshCw,
  Award,
  Layers,
  ArrowUpRight,
  Clock,
  Lock,
  Download,
  Check
} from 'lucide-react';

export const SellerDashboard: React.FC = () => {
  const {
    sellers,
    activeSellerId,
    setActiveSellerId,
    products,
    orders,
    ledger,
    updateSubOrderStatus,
    updateProductStock,
    addNewProduct,
  } = useMarketplace();

  const currentSeller = sellers.find(s => s.id === activeSellerId) || sellers[0];

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'inventory'>('overview');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Sub-order processing step simulation for #SUB-AV-9021
  const [vaneSubOrderStatus, setVaneSubOrderStatus] = useState<'PAID' | 'PACKED' | 'SHIPPED'>('PAID');
  const [showAddEditionModal, setShowAddEditionModal] = useState(false);
  const [newEditionName, setNewEditionName] = useState('Kyoto Shino Glaze • Studio 320mm');
  const [newEditionPrice, setNewEditionPrice] = useState('1550');
  const [newEditionStock, setNewEditionStock] = useState('4');

  const handleApplyHallmark = () => {
    setVaneSubOrderStatus('PACKED');
    updateSubOrderStatus('OZ-2025-98421', 'SUB-AV-9021', 'PACKED', 'Atelier Vane applied gold-leaf wax hallmark #AV-KY-0842.');
    setFeedback('Wax hallmark #AV-KY-0842 applied and condition dossier sealed into cedar crate.');
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDispatchCourier = () => {
    if (vaneSubOrderStatus !== 'PACKED') {
      alert('Requires packaging hallmark confirmation first.');
      return;
    }
    setVaneSubOrderStatus('SHIPPED');
    updateSubOrderStatus('OZ-2025-98421', 'SUB-AV-9021', 'SHIPPED', 'Dispatched with Nippon Express Air Courier.');
    setFeedback('Air courier dispatched. Satellite tracking link activated.');
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAddNewEdition = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Edition "${newEditionName}" added to Specimen & Variant matrix.`);
    setShowAddEditionModal(false);
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* 1. Top Sovereign Guild Accreditation Banner */}
      <div className="p-3 bg-[#E8F3EE] border border-[#C3DED3] rounded text-[11px] text-[#0E3B3A] flex items-center justify-between font-semibold">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0E3B3A]" />
          <span>Sovereign Guild • Recertification in 180 Days</span>
        </div>
        <span className="font-mono-tabular text-[#2F7D5B]">8.5% Rate</span>
      </div>

      {feedback && (
        <div className="p-3 bg-[#E8F3EE] border border-[#2F7D5B] text-[#0E3B3A] text-xs rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2F7D5B] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 2. Studio Master Header */}
      <div className="bg-[#FFFFFF] border border-[#E3DDD0] rounded p-5 space-y-4 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Master Guild Studio
            </span>
            <h1 className="font-editorial text-3xl text-[#0E3B3A] font-semibold">
              Atelier Vane
            </h1>
            <p className="text-xs text-[#5E6663]">
              Kyoto & Zurich • Accreditation Active
            </p>
          </div>

          <div className="w-12 h-12 bg-[#0E3B3A] text-white rounded flex items-center justify-center font-editorial text-xl font-bold">
            AV
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex gap-2 pt-2 border-t border-[#F0EBE0] text-xs font-semibold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#0E3B3A] text-white'
                : 'text-[#717978] hover:bg-[#FAF8F5]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#0E3B3A] text-white'
                : 'text-[#717978] hover:bg-[#FAF8F5]'
            }`}
          >
            Orders & Transitions
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-[#0E3B3A] text-white'
                : 'text-[#717978] hover:bg-[#FAF8F5]'
            }`}
          >
            Catalog & Matrix
          </button>
        </div>
      </div>

      {/* 3. Guild Financial Pulse (Cycle 10 • Post-Equinox) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Guild Financial Pulse
            </span>
            <h3 className="font-editorial text-xl text-[#0E3B3A] font-semibold">
              Operating Metrics
            </h3>
          </div>
          <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#E3DDD0] text-[#717978] text-[10px] font-mono-tabular rounded">
            Cycle 10 • Post-Equinox
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Gross Earnings */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Gross Earnings
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-2xl font-bold text-[#0E3B3A]">$48,250</span>
              <span className="text-[10px] text-[#2F7D5B] font-mono-tabular font-semibold">+14.2% this moon</span>
            </div>
          </div>

          {/* Pending Escrow */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Pending Escrow
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-2xl font-bold text-[#0E3B3A]">$12,400</span>
              <span className="text-[10px] text-[#78591b] font-medium">Post-Inspection</span>
            </div>
          </div>

          {/* To Process */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              To Process
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-2xl font-bold text-[#0E3B3A]">03 Orders</span>
              <span className="text-[10px] text-[#C9A25D] font-bold">! 1 Action</span>
            </div>
          </div>

          {/* Low Reserve */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Low Reserve
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-2xl font-bold text-[#0E3B3A]">02 Editions</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Weekly Revenue Trajectory Curve */}
      <div className="p-5 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold">
            Weekly Revenue Trajectory
          </span>
          <span className="text-[10px] font-mono-tabular text-[#78591b] font-bold">
            Peak: $9.8k
          </span>
        </div>

        {/* SVG Chart */}
        <div className="relative pt-2 pb-1">
          <svg viewBox="0 0 400 90" className="w-full h-24 overflow-visible">
            <defs>
              <linearGradient id="sellerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0E3B3A" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0E3B3A" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 10 75 Q 100 70, 180 65 T 280 40 T 360 15 L 390 20"
              fill="none"
              stroke="#0E3B3A"
              strokeWidth="2.5"
            />
            <path
              d="M 10 75 Q 100 70, 180 65 T 280 40 T 360 15 L 390 20 L 390 90 L 10 90 Z"
              fill="url(#sellerGrad)"
            />
            <circle cx="360" cy="15" r="4" fill="#C9A25D" stroke="#FFFFFF" strokeWidth="2" />
          </svg>

          <div className="flex justify-between text-[10px] font-mono-tabular text-[#717978] pt-2 border-t border-[#F0EBE0]">
            <span>W1 Sep</span>
            <span>W2 Sep</span>
            <span>W3 Oct</span>
            <span className="text-[#0E3B3A] font-bold">W4 Oct (Live)</span>
          </div>
        </div>
      </div>

      {/* 5. Active Manifest: Sub-Order Processing */}
      <div className="p-5 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Active Manifest
            </span>
            <h3 className="font-editorial text-xl font-semibold text-[#0E3B3A]">
              Sub-Order Processing
            </h3>
          </div>
          <span className="px-2 py-0.5 bg-[#F5E6CA] text-[#78591b] border border-[#C9A25D]/40 rounded text-[10px] font-semibold uppercase tracking-wider">
            1 Action Pending
          </span>
        </div>

        {/* Manifest Card: #SUB-AV-9021 */}
        <div className="p-4 bg-[#FAF8F5] border border-[#E3DDD0] rounded space-y-4">
          <div className="flex gap-3">
            <div className="w-16 h-16 bg-white border border-[#E3DDD0] rounded overflow-hidden shrink-0">
              <img
                src="/src/assets/images/ozone_hero_luxury_living_1794146207794.jpg"
                alt="Monolithic Travertine Vessel N°03"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="flex items-baseline justify-between">
                <span className="font-mono-tabular text-[10px] text-[#717978]">#SUB-AV-9021</span>
                <span className="font-mono-tabular text-sm font-bold text-[#0E3B3A]">$1,450.00</span>
              </div>
              <h4 className="font-editorial text-base font-semibold text-[#14181A]">
                Monolithic Travertine Vessel N°03
              </h4>
              <p className="text-[11px] text-[#5E6663]">
                Buyer: Julian Sterling (Verified Collector)
              </p>
            </div>
          </div>

          <div className="p-2.5 bg-white border border-[#E3DDD0] rounded flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-[#0E3B3A]">
              <span className="w-2 h-2 rounded-full bg-[#C9A25D]" />
              <span>Status: {vaneSubOrderStatus === 'PAID' ? 'PAID / ESCROW LOCKED' : vaneSubOrderStatus === 'PACKED' ? 'PACKED / HALLMARKED' : 'SHIPPED / IN TRANSIT'}</span>
            </span>
            <span className="text-[#78591b] font-mono-tabular text-[10px]">
              Vault Guarantee Active
            </span>
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono-tabular pt-1">
            <div className="flex flex-col items-center gap-1">
              <span className="w-6 h-6 rounded-full bg-[#0E3B3A] text-white flex items-center justify-center font-bold">
                ✓
              </span>
              <span className="text-[#0E3B3A] font-semibold">1. PAYMENT</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                vaneSubOrderStatus === 'PAID'
                  ? 'bg-[#C9A25D] text-white animate-pulse'
                  : 'bg-[#0E3B3A] text-white'
              }`}>
                {vaneSubOrderStatus === 'PAID' ? '2' : '✓'}
              </span>
              <span className="text-[#0E3B3A] font-semibold">2. HALLMARK</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                vaneSubOrderStatus === 'SHIPPED'
                  ? 'bg-[#0E3B3A] text-white'
                  : 'bg-[#EAE5D9] text-[#717978]'
              }`}>
                {vaneSubOrderStatus === 'SHIPPED' ? '✓' : '3'}
              </span>
              <span className="text-[#717978]">3. DISPATCH</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleApplyHallmark}
              disabled={vaneSubOrderStatus !== 'PAID'}
              className="w-full py-2.5 px-4 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-40"
            >
              <Check className="w-4 h-4 text-[#C9A25D]" />
              <span>Mark as Packed & Apply Wax Hallmark</span>
            </button>

            <button
              onClick={handleDispatchCourier}
              disabled={vaneSubOrderStatus === 'SHIPPED'}
              className="w-full py-2 px-4 bg-[#FFFFFF] border border-[#E3DDD0] text-xs font-semibold text-[#0E3B3A] hover:bg-[#FAF8F5] rounded flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Truck className="w-4 h-4 text-[#C9A25D]" />
              <span>Dispatch Courier</span>
            </button>
          </div>

          <div className="text-center text-[10px] text-[#717978] flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Requires packaging hallmark confirmation first</span>
          </div>
        </div>
      </div>

      {/* 6. Inventory Atelier: Specimen & Variant Matrix */}
      <div className="p-5 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Inventory Atelier
            </span>
            <h3 className="font-editorial text-xl font-semibold text-[#0E3B3A]">
              Specimen & Variant Matrix
            </h3>
          </div>
          <span className="text-[10px] text-[#717978] font-mono-tabular">
            3 Editions Total
          </span>
        </div>

        <div className="space-y-3">
          {/* Parent Specimen Header */}
          <div className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#E3DDD0] rounded">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-[#E3DDD0] rounded overflow-hidden">
                <img
                  src="/src/assets/images/ozone_hero_luxury_living_1794146207794.jpg"
                  alt="Thumb"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-editorial text-sm font-semibold text-[#14181A]">
                  Monolithic Travertine Vessel
                </h4>
                <p className="text-[10px] text-[#717978]">Collection: Architectura Sacra</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-[#E8F3EE] text-[#0E3B3A] text-[9px] font-semibold uppercase tracking-wider rounded">
              Active
            </span>
          </div>

          {/* Variant Rows */}
          <div className="divide-y divide-[#F0EBE0] border border-[#E3DDD0] rounded bg-white text-xs">
            {/* Variant 1 */}
            <div className="p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-[#14181A] block">
                  Roman Raw • Standard Studio (320mm)
                </span>
                <span className="text-[10px] font-mono-tabular text-[#717978]">
                  SKU: OZ-TRAV-RAW-S
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono-tabular font-bold text-[#0E3B3A] block">$1,450</span>
                <span className="text-[10px] text-[#78591b] font-medium flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A25D]" /> Stock: 2 (Reserve Low)
                </span>
              </div>
            </div>

            {/* Variant 2 */}
            <div className="p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-[#14181A] block">
                  Bizen Honed • Standard Studio (320mm)
                </span>
                <span className="text-[10px] font-mono-tabular text-[#717978]">
                  SKU: OZ-TRAV-BIZ-S
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono-tabular font-bold text-[#0E3B3A] block">$1,600</span>
                <span className="px-1.5 py-0.2 bg-[#F5E6CA] text-[#78591b] rounded text-[9px] font-mono-tabular font-bold uppercase">
                  1 Remaining
                </span>
              </div>
            </div>

            {/* Variant 3 */}
            <div className="p-3 flex items-center justify-between bg-[#FAF8F5]/50">
              <div>
                <span className="font-medium text-[#717978] block line-through">
                  Calacatta • Monumental
                </span>
                <span className="text-[10px] font-mono-tabular text-[#717978]">
                  SKU: OZ-TRAV-CAL-M
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono-tabular text-[#717978] block line-through">$2,800</span>
                <span className="px-1.5 py-0.2 bg-[#FDF2F1] text-[#9A2E26] rounded text-[9px] font-mono-tabular font-bold uppercase">
                  Sold Out
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAddEditionModal(true)}
            className="w-full py-2.5 px-3 bg-[#FAF8F5] hover:bg-[#F0EBE0] border border-[#E3DDD0] rounded text-xs text-[#0E3B3A] font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 text-[#C9A25D]" />
            <span>Add New Specimen Edition</span>
          </button>
        </div>
      </div>

      {/* 7. Financial Records: Transparent Ledger */}
      <div className="p-5 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
              Financial Records
            </span>
            <h3 className="font-editorial text-xl font-semibold text-[#0E3B3A]">
              Transparent Ledger
            </h3>
          </div>
          <button
            onClick={() => alert('Ledger CSV export dispatched to authenticated email.')}
            className="text-xs text-[#C9A25D] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Export CSV</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 font-mono-tabular text-xs">
          {/* Row 1 */}
          <div className="p-3 bg-[#FAF8F5] border border-[#E3DDD0] rounded space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#717978]">Oct 24 #SUB-AV-9021</span>
              <span className="px-1.5 py-0.5 bg-[#F5E6CA] text-[#78591b] rounded text-[9px] font-bold">
                IN ESCROW
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-[#EAE5D9]">
              <div>
                <span className="text-[9px] text-[#717978] block">GROSS</span>
                <span className="font-bold text-[#14181A]">$1,450.00</span>
              </div>
              <div>
                <span className="text-[9px] text-[#717978] block">GUILD(-8.5%)</span>
                <span className="text-[#9A2E26]">-$123.25</span>
              </div>
              <div>
                <span className="text-[9px] text-[#717978] block">NET ESCROW</span>
                <span className="font-bold text-[#2F7D5B]">$1,326.75</span>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="p-3 bg-[#FAF8F5] border border-[#E3DDD0] rounded space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#717978]">Oct 18 #SUB-AV-8910</span>
              <span className="px-1.5 py-0.5 bg-[#E8F3EE] text-[#0E3B3A] rounded text-[9px] font-bold">
                SETTLED TO BANK
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-[#EAE5D9]">
              <div>
                <span className="text-[9px] text-[#717978] block">GROSS</span>
                <span className="font-bold text-[#14181A]">$2,400.00</span>
              </div>
              <div>
                <span className="text-[9px] text-[#717978] block">GUILD(-8.5%)</span>
                <span className="text-[#9A2E26]">-$204.00</span>
              </div>
              <div>
                <span className="text-[9px] text-[#717978] block">DISBURSED</span>
                <span className="font-bold text-[#0E3B3A]">$2,196.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Studio Quote */}
        <div className="text-center pt-3 border-t border-[#F0EBE0] space-y-1">
          <span className="text-zinc-400 font-serif">⚖</span>
          <p className="font-editorial text-sm italic text-[#5E6663]">
            "Form yields strictly to stone integrity; each hallmark binds the guild's word."
          </p>
          <span className="text-[9px] uppercase tracking-wider text-[#717978] font-mono-tabular block">
            Kyoto Atelier Vault Archive
          </span>
        </div>
      </div>

      {/* Add Edition Modal */}
      {showAddEditionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-[#E3DDD0] rounded p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F0EBE0] pb-2">
              <h4 className="font-editorial text-lg text-[#0E3B3A]">
                Publish New Specimen Edition
              </h4>
              <button
                onClick={() => setShowAddEditionModal(false)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewEdition} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#0E3B3A] mb-1">
                  Edition Specimen Title
                </label>
                <input
                  type="text"
                  value={newEditionName}
                  onChange={e => setNewEditionName(e.target.value)}
                  className="w-full p-2 border border-[#E3DDD0] rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-semibold text-[#0E3B3A] mb-1">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    value={newEditionPrice}
                    onChange={e => setNewEditionPrice(e.target.value)}
                    className="w-full p-2 border border-[#E3DDD0] rounded font-mono-tabular"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-semibold text-[#0E3B3A] mb-1">
                    Initial Units
                  </label>
                  <input
                    type="number"
                    value={newEditionStock}
                    onChange={e => setNewEditionStock(e.target.value)}
                    className="w-full p-2 border border-[#E3DDD0] rounded font-mono-tabular"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#0E3B3A] text-white font-semibold uppercase tracking-wider rounded cursor-pointer mt-2"
              >
                Register Edition to Matrix
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
