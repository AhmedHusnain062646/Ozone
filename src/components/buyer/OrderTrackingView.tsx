import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { ParentOrder, SubOrder, OrderStatus } from '../../types/marketplace';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Headphones,
  Send,
  Lock,
  Plane,
  X,
  FileText,
  AlertCircle
} from 'lucide-react';

export const OrderTrackingView: React.FC = () => {
  const { orders, cancelSubOrder, requestReturn } = useMarketplace();

  // Accordion and modal toggles
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(true);
  const [isRecourseOpen, setIsRecourseOpen] = useState(false);

  // Return Dossier Form state
  const [returnBasis, setReturnBasis] = useState('Slight dimensional variance / fit adjustment');
  const [returnNotes, setReturnNotes] = useState(
    'Shoulder seam exhibits +1.8cm variance from sizing codex. Piece unhandled post-initial fitting. Original parchment envelope and wax seal intact.'
  );
  const [dossierSubmitted, setDossierSubmitted] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const masterOrder = orders[0]; // #OZ-2025-98421

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterOrder && masterOrder.subOrders[1]) {
      requestReturn(masterOrder.id, masterOrder.subOrders[1].id, `${returnBasis}: ${returnNotes}`);
      setDossierSubmitted(true);
      setActionFeedback('Recourse dossier submitted to Maison Silt & Ozone Escrow Tribunal. Window active.');
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* 1. Live Vault Dispatch Alert Banner */}
      <div className="p-4 bg-[#0E3B3A] text-white rounded border border-[#164C4B] shadow-xs flex items-start gap-3">
        <div className="p-1.5 bg-[#164C4B] rounded text-[#7FE3C4] shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="flex-1 text-xs space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#7FE3C4]">
              Vault Dispatch Update
            </span>
            <span className="font-mono-tabular text-[10px] text-[#E3DDD0]/70">12m ago</span>
          </div>
          <p className="text-[#F5F1E9] leading-relaxed">
            Sub-Order <strong className="text-white font-mono-tabular">#SUB-AV-9021</strong> cleared Kyoto Customs Inspection and secured in Guild Transport.
          </p>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 bg-[#E8F3EE] border border-[#2F7D5B] text-[#0E3B3A] text-xs rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2F7D5B] shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* 2. Master Acquisition Card */}
      <div className="bg-[#FFFFFF] border border-[#E3DDD0] rounded p-5 space-y-4 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#717978] block">
              Master Acquisition
            </span>
            <h2 className="font-editorial text-2xl text-[#0E3B3A] font-semibold">
              #OZ-2025-98421
            </h2>
            <p className="text-[11px] text-[#5E6663] mt-0.5">
              Authenticated on Oct 24, 2025 • 09:42 UTC
            </p>
          </div>
          <span className="px-2.5 py-1 bg-[#F5E6CA] text-[#78591b] border border-[#C9A25D]/40 rounded text-[10px] font-semibold uppercase tracking-wider">
            Escrow Protected
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-[#FAF8F5] border border-[#E3DDD0] rounded">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] block">
              Fulfillment State
            </span>
            <span className="text-xs font-semibold text-[#14181A] flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#C9A25D]" />
              <span>1 In Transit • 1 Delivered</span>
            </span>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#E3DDD0] rounded">
            <span className="text-[10px] uppercase tracking-wider text-[#717978] block">
              Settlement Sum
            </span>
            <span className="font-mono-tabular text-sm font-bold text-[#0E3B3A] mt-0.5 block">
              $2,405.00 <span className="text-[10px] text-[#717978] font-normal">USD</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Sub-Order 01: Atelier Vane (In-Transit) */}
      <div className="bg-[#FFFFFF] border border-[#E3DDD0] rounded p-5 space-y-5 shadow-xs">
        {/* Atelier Header */}
        <div className="flex items-center justify-between border-b border-[#F0EBE0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EAE5D9] text-[#0E3B3A] font-serif font-bold text-xs flex items-center justify-center border border-[#D5CEBF]">
              V
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-editorial text-base font-semibold text-[#0E3B3A]">
                  Atelier Vane
                </h4>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0E3B3A]" />
              </div>
              <p className="text-[11px] text-[#717978]">Kyoto & Zürich • Guild Sovereign</p>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-[#FAF8F5] border border-[#E3DDD0] text-[#717978] font-mono-tabular text-[10px] rounded">
            Sub #AV-9021
          </span>
        </div>

        {/* Specimen Item Info */}
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-[#FAF8F5] border border-[#E3DDD0] rounded overflow-hidden shrink-0">
            <img
              src="/src/assets/images/ozone_hero_luxury_living_1794146207794.jpg"
              alt="Monolithic Travertine Vessel N°03"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-[9px] uppercase tracking-wider text-[#78591b] font-semibold block">
              Edition 03 of 12
            </span>
            <h5 className="font-editorial text-base font-medium text-[#14181A]">
              Monolithic Travertine Vessel N°03
            </h5>
            <div className="flex items-center gap-3 text-xs pt-1">
              <span className="font-mono-tabular font-bold text-[#0E3B3A]">$1,450.00 USD</span>
              <span className="text-[#717978]">·</span>
              <span className="text-[#5E6663]">Archival Crate</span>
            </div>
          </div>
        </div>

        {/* Provenance Progression Stages */}
        <div className="space-y-2 pt-2 border-t border-[#F0EBE0]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] uppercase tracking-wider text-[#717978] font-semibold">
              Provenance Progression
            </span>
            <span className="text-[11px] font-semibold text-[#C9A25D] uppercase tracking-wider">
              Stage 04: Air Transit
            </span>
          </div>

          {/* 5-Stage Step Bar */}
          <div className="grid grid-cols-5 gap-1.5 h-1.5">
            <div className="bg-[#0E3B3A] rounded-xs" />
            <div className="bg-[#0E3B3A] rounded-xs" />
            <div className="bg-[#0E3B3A] rounded-xs" />
            <div className="bg-[#C9A25D] rounded-xs animate-pulse" />
            <div className="bg-[#EAE5D9] rounded-xs" />
          </div>

          <div className="grid grid-cols-5 gap-1 text-[9px] text-[#717978] pt-1">
            <div>
              <span className="block font-semibold text-[#0E3B3A]">01. Placed</span>
              <span>Oct 24, 09:42</span>
            </div>
            <div>
              <span className="block font-semibold text-[#0E3B3A]">02. Escrowed</span>
              <span>Oct 24, 09:43</span>
            </div>
            <div>
              <span className="block font-semibold text-[#0E3B3A]">03. Hallmarked</span>
              <span>Oct 25</span>
            </div>
            <div>
              <span className="block font-semibold text-[#C9A25D]">04. Air Transit</span>
              <span>Oct 26</span>
            </div>
            <div>
              <span className="block text-[#717978]">05. Delivered</span>
              <span>Est. Oct 29</span>
            </div>
          </div>
        </div>

        {/* Custodial Activity Log Accordion */}
        <div className="border border-[#E3DDD0] rounded overflow-hidden">
          <button
            onClick={() => setIsActivityLogOpen(!isActivityLogOpen)}
            className="w-full px-4 py-2.5 bg-[#FAF8F5] flex items-center justify-between text-xs text-[#0E3B3A] font-semibold cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-[#C9A25D]" />
              <span>Custodial Activity Log (3 Verified Logs)</span>
            </div>
            {isActivityLogOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isActivityLogOpen && (
            <div className="p-4 bg-white divide-y divide-[#F0EBE0] text-xs font-mono-tabular space-y-2">
              <div className="pt-1 first:pt-0">
                <div className="flex justify-between text-[#717978] text-[10px]">
                  <span>2025-10-26 14:10 UTC</span>
                  <span className="text-[#2F7D5B]">Kyoto Customs Clearance</span>
                </div>
                <p className="text-[#14181A] text-[11px] mt-0.5">
                  X-Ray spectrometry passed; micro-etched diamond hallmark verified against Kyoto Guild registry.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex justify-between text-[#717978] text-[10px]">
                  <span>2025-10-25 18:30 UTC</span>
                  <span className="text-[#0E3B3A]">Hallmark & Wax Seal</span>
                </div>
                <p className="text-[#14181A] text-[11px] mt-0.5">
                  Master Mason Julian Vane applied gold-leaf wax hallmark #AV-KY-0842 into custom cedar crate.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex justify-between text-[#717978] text-[10px]">
                  <span>2025-10-24 09:43 UTC</span>
                  <span className="text-[#78591b]">Escrow Lock Minted</span>
                </div>
                <p className="text-[#14181A] text-[11px] mt-0.5">
                  $1,450.00 locked in multi-sig contract // 0xFA..33C pending recipient uncrating signature.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Live Satellite Telemetry Trigger */}
        <button
          onClick={() => setIsTelemetryModalOpen(true)}
          className="w-full py-2.5 px-4 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
        >
          <Plane className="w-4 h-4 text-[#C9A25D]" />
          <span>Live Courier Satellite Telemetry</span>
        </button>

        <div className="flex items-center gap-2 text-[10px] text-[#717978] justify-center">
          <Lock className="w-3 h-3" />
          <span>Cancellation disabled: Item crated & under Guild custody</span>
        </div>
      </div>

      {/* 4. Sub-Order 02: Maison Silt (Delivered & Recourse Dossier) */}
      <div className="bg-[#FFFFFF] border border-[#E3DDD0] rounded p-5 space-y-5 shadow-xs">
        {/* Atelier Header */}
        <div className="flex items-center justify-between border-b border-[#F0EBE0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EAE5D9] text-[#0E3B3A] font-serif font-bold text-xs flex items-center justify-center border border-[#D5CEBF]">
              S
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-editorial text-base font-semibold text-[#0E3B3A]">
                  Maison Silt
                </h4>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0E3B3A]" />
              </div>
              <p className="text-[11px] text-[#717978]">Normandy, France • Guild Verified</p>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-[#E8F3EE] text-[#0E3B3A] border border-[#C3DED3] text-[10px] font-semibold uppercase tracking-wider rounded">
            Delivered
          </span>
        </div>

        {/* Specimen Item Info */}
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-[#FAF8F5] border border-[#E3DDD0] rounded overflow-hidden shrink-0">
            <img
              src="/src/assets/images/product_cashmere_overcoat_1794146209378.jpg"
              alt="Unbleached Wild-Spun Flax Kimono"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-[9px] uppercase tracking-wider text-[#78591b] font-semibold block">
              Limited Weave
            </span>
            <h5 className="font-editorial text-base font-medium text-[#14181A]">
              Unbleached Wild-Spun Flax Kimono
            </h5>
            <div className="flex items-center gap-3 text-xs pt-1">
              <span className="font-mono-tabular font-bold text-[#0E3B3A]">$890.00 USD</span>
              <span className="text-[#717978]">·</span>
              <span className="text-[#5E6663]">Size II (T-48)</span>
            </div>
          </div>
        </div>

        {/* Custody Transfer Complete Box */}
        <div className="p-3 bg-[#FAF8F5] border border-[#E3DDD0] rounded space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] uppercase tracking-wider text-[#717978] font-semibold">
              Custody Transfer Complete
            </span>
            <span className="text-[11px] font-semibold text-[#2F7D5B] uppercase tracking-wider">
              Delivered & Sealed
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 h-1.5">
            <div className="bg-[#0E3B3A] rounded-xs" />
            <div className="bg-[#0E3B3A] rounded-xs" />
            <div className="bg-[#0E3B3A] rounded-xs" />
            <div className="bg-[#0E3B3A] rounded-xs" />
          </div>

          <div className="flex justify-between text-[10px] text-[#717978] pt-1">
            <span>Arrived Oct 27, 11:15 AM</span>
            <span className="text-[#0E3B3A] font-semibold">Signed: Vault Concierge</span>
          </div>
        </div>

        {/* Toggle Request Return / Archival Recourse */}
        <button
          onClick={() => setIsRecourseOpen(!isRecourseOpen)}
          className="w-full py-2 px-3 border border-[#E3DDD0] hover:bg-[#FAF8F5] rounded text-xs text-[#0E3B3A] font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-[#C9A25D]" />
          <span>{isRecourseOpen ? 'Collapse Archival Recourse' : 'Request Return / Archival Recourse'}</span>
        </button>

        {/* Archival Recourse Claim Dossier */}
        {isRecourseOpen && (
          <form onSubmit={handleReturnSubmit} className="p-4 bg-[#FAF8F5] border border-[#E3DDD0] rounded space-y-4 text-xs animate-in fade-in duration-150">
            <div className="flex items-start justify-between border-b border-[#E3DDD0] pb-2">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-[#717978] block">
                  Formal Discretion Protocol
                </span>
                <h5 className="font-editorial text-base text-[#0E3B3A]">
                  Archival Recourse Claim
                </h5>
              </div>
              <span className="px-2 py-0.5 bg-[#EAE5D9] text-[#717978] rounded text-[10px] font-mono-tabular">
                30-Day Window Active
              </span>
            </div>

            {/* Refund Settlement Arc */}
            <div className="p-2.5 bg-white border border-[#E3DDD0] rounded text-[11px] font-mono-tabular space-y-1">
              <span className="text-[#717978] uppercase text-[9px] font-semibold block">
                Refund Settlement Arc
              </span>
              <div className="flex items-center gap-2 text-[#0E3B3A]">
                <span className="font-bold">1. Claim Filed</span>
                <span>→</span>
                <span>2. Guild Audit</span>
                <span>→</span>
                <span className="text-[#2F7D5B] font-bold">3. Escrow Release ($955.00)</span>
              </div>
            </div>

            {/* Basis For Return */}
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#0E3B3A]">
                Basis for Return
              </label>
              <select
                value={returnBasis}
                onChange={e => setReturnBasis(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E3DDD0] rounded text-xs text-[#14181A] focus:outline-none focus:border-[#0E3B3A]"
              >
                <option value="Slight dimensional variance / fit adjustment">
                  Slight dimensional variance / fit adjustment
                </option>
                <option value="Weave anomaly outside atelier tolerance">
                  Weave anomaly outside atelier tolerance
                </option>
                <option value="Wax seal or packaging integrity compromise">
                  Wax seal or packaging integrity compromise
                </option>
              </select>
            </div>

            {/* Curator Notes & Observations */}
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#0E3B3A]">
                Curator Notes & Observations
              </label>
              <textarea
                rows={3}
                value={returnNotes}
                onChange={e => setReturnNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E3DDD0] rounded text-xs text-[#14181A] focus:outline-none focus:border-[#0E3B3A] leading-relaxed"
              />
            </div>

            {/* Photographic Inspection Evidence (2 frames) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#0E3B3A] uppercase tracking-wider font-semibold">
                  Photographic Inspection Evidence (2 Attached)
                </span>
                <span className="text-[#2F7D5B] font-mono-tabular text-[10px]">
                  Verified Hi-Res
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative aspect-[4/3] bg-zinc-100 rounded overflow-hidden border border-[#E3DDD0]">
                  <img
                    src="/src/assets/images/product_cashmere_overcoat_1794146209378.jpg"
                    alt="Collar Weave"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/75 text-white text-[9px] font-mono-tabular rounded">
                    Collar Weave
                  </span>
                </div>
                <div className="relative aspect-[4/3] bg-zinc-100 rounded overflow-hidden border border-[#E3DDD0]">
                  <img
                    src="/src/assets/images/product_cashmere_overcoat_1794146209378.jpg"
                    alt="Hem Dimension"
                    className="w-full h-full object-cover scale-125"
                  />
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/75 text-white text-[9px] font-mono-tabular rounded">
                    Hem Dimension
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={dossierSubmitted}
              className="w-full py-2.5 px-4 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5 text-[#C9A25D]" />
              <span>{dossierSubmitted ? 'Dossier Transmitted to Tribunal' : 'Submit Dossier to Maison Silt & Escrow'}</span>
            </button>
          </form>
        )}
      </div>

      {/* 5. Documentation & Support: Atelier Governance */}
      <div className="p-5 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-4">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#717978] block">
            Documentation & Support
          </span>
          <h4 className="font-editorial text-lg text-[#0E3B3A]">
            Atelier Governance
          </h4>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => alert('Sovereign Certificate of Authenticity & Multi-Sig Escrow Invoice PDF generated.')}
            className="w-full py-2.5 px-4 bg-[#FAF8F5] hover:bg-[#F0EBE0] border border-[#E3DDD0] text-[#0E3B3A] text-xs font-semibold rounded flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#C9A25D]" />
              <span>Download Sovereign Certificate & Invoice PDF</span>
            </div>
            <span className="text-zinc-400">↓</span>
          </button>

          <button
            onClick={() => alert('Private Escrow Concierge ticket initiated with senior custodian Julian S.')}
            className="w-full py-2.5 px-4 bg-[#FAF8F5] hover:bg-[#F0EBE0] border border-[#E3DDD0] text-[#0E3B3A] text-xs font-semibold rounded flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-[#C9A25D]" />
              <span>Contact Private Escrow Concierge</span>
            </div>
            <span className="text-zinc-400">→</span>
          </button>
        </div>

        <p className="text-[10px] text-center text-[#717978] leading-relaxed pt-2 border-t border-[#F0EBE0]">
          All funds reserved in sovereign multi-sig escrow until recipient hallmark confirmation.<br />
          OZONE ATELIER PROTOCOL • VERSION 4.12
        </p>
      </div>

      {/* Satellite Telemetry Radar Modal */}
      {isTelemetryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0E3B3A] text-white border border-[#164C4B] rounded-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#164C4B] pb-3">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-[#7FE3C4]" />
                <h4 className="font-editorial text-lg text-white">
                  Live Courier Satellite Telemetry
                </h4>
              </div>
              <button
                onClick={() => setIsTelemetryModalOpen(false)}
                className="text-[#E3DDD0] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono-tabular text-xs">
              <div className="p-3 bg-[#082423] rounded border border-[#164C4B] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#7FE3C4]">Carrier / Aircraft:</span>
                  <span className="text-white">Nippon Cargo Airways Boeing 747-8F</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7FE3C4]">Flight / Registration:</span>
                  <span className="text-white">KZ218 // JA18KZ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7FE3C4]">Current Route:</span>
                  <span className="text-white">KIX (Kyoto/Osaka) → CDG (Paris Vault)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7FE3C4]">Altitude / Airspeed:</span>
                  <span className="text-white">36,000 FT / 485 KTS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7FE3C4]">Climate Crate Temperature:</span>
                  <span className="text-[#7FE3C4]">18.4°C (Stabilized 45% RH)</span>
                </div>
              </div>

              {/* Graphic Radar Simulation */}
              <div className="relative h-28 bg-[#082423] rounded border border-[#164C4B] overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-radial from-[#7FE3C4]/15 via-transparent to-transparent animate-pulse" />
                <div className="w-20 h-20 rounded-full border border-[#7FE3C4]/30 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border border-[#7FE3C4]/50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#7FE3C4] animate-ping" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-3 text-[10px] text-[#7FE3C4]">
                  GPS Signal: 100% Locked
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsTelemetryModalOpen(false)}
              className="w-full py-2 bg-[#164C4B] hover:bg-[#1E6160] text-white text-xs font-semibold rounded cursor-pointer transition-colors"
            >
              Close Telemetry Feed
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
