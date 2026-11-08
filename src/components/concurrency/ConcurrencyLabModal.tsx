import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { X, Sparkles, AlertTriangle, ShieldCheck, Clock, Terminal, Zap, RefreshCw } from 'lucide-react';

interface ConcurrencyLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConcurrencyLabModal: React.FC<ConcurrencyLabModalProps> = ({ isOpen, onClose }) => {
  const {
    products,
    concurrencyLogs,
    runConcurrencyCollisionTest,
    forceExpireReservations,
    cart,
    reservationCountdown,
  } = useMarketplace();

  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    products[0]?.variants[0]?.id || ''
  );
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  if (!isOpen) return null;

  const currentProduct = products.find(p => p.id === selectedProductId) || products[0];
  const currentVariant = currentProduct?.variants.find(v => v.id === selectedVariantId) || currentProduct?.variants[0];

  const handleRunSim = async () => {
    if (!currentProduct || !currentVariant) return;
    setIsRunning(true);
    try {
      const result = await runConcurrencyCollisionTest(currentProduct.id, currentVariant.id);
      setLastResult(result);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#FFFFFF] border border-[#E3DDD0] rounded shadow-[0_8px_32px_rgba(20,24,26,0.15)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3DDD0] bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0E3B3A] text-white rounded">
              <Sparkles className="w-4 h-4 text-[#C9A25D]" />
            </div>
            <div>
              <h3 className="font-editorial text-xl text-[#0E3B3A]">
                Concurrency & Atomic Inventory Lab
              </h3>
              <p className="text-xs text-[#5E6663]">
                Interactive simulation of high-volume simultaneous purchase collisions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#5E6663] hover:text-[#0E3B3A] hover:bg-[#F5F1E9] rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Conceptual Architecture Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#F5F1E9] border border-[#E3DDD0] rounded space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0E3B3A] uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-[#C58A2B]" />
                <span>The Race Condition</span>
              </div>
              <p className="text-xs text-[#5E6663] leading-relaxed">
                Naive carts read stock (`qty = 1`), pause for checkout, and write back (`qty = 0`). If two shoppers purchase concurrently, both reads see 1, leading to negative inventory and overselling.
              </p>
            </div>

            <div className="p-4 bg-[#F5F1E9] border border-[#E3DDD0] rounded space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0E3B3A] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#2F7D5B]" />
                <span>Ozone Atomic Guard</span>
              </div>
              <p className="text-xs text-[#5E6663] leading-relaxed">
                Ozone executes conditional atomic updates: <code className="font-mono-tabular text-[11px] bg-white px-1 py-0.5 border border-[#E3DDD0]">{`{ stock: { $gte: 1 } }`}</code> with <code className="font-mono-tabular text-[11px] bg-white px-1 py-0.5 border border-[#E3DDD0]">{`{ $inc: { stock: -1 } }`}</code> in a single isolated step.
              </p>
            </div>

            <div className="p-4 bg-[#F5F1E9] border border-[#E3DDD0] rounded space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0E3B3A] uppercase tracking-wider">
                <Clock className="w-4 h-4 text-[#0E3B3A]" />
                <span>10-Min TTL Lock</span>
              </div>
              <p className="text-xs text-[#5E6663] leading-relaxed">
                Temporary holds automatically expire via MongoDB TTL background indexes if abandoned, guaranteeing zero phantom locked inventory without manual intervention.
              </p>
            </div>
          </div>

          {/* Test Setup Control Bar */}
          <div className="p-5 border border-[#E3DDD0] rounded bg-[#FFFFFF] space-y-4">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-[#14181A]">
              Execute Real-Time Collision Test
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#5E6663] block mb-1">
                  Select Product:
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => {
                    setSelectedProductId(e.target.value);
                    const prod = products.find(p => p.id === e.target.value);
                    if (prod && prod.variants.length > 0) {
                      setSelectedVariantId(prod.variants[0].id);
                    }
                  }}
                  className="w-full text-xs bg-[#FAF8F5] border border-[#E3DDD0] rounded p-2.5 text-[#14181A]"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#5E6663] block mb-1">
                  Select Variant SKU:
                </label>
                <select
                  value={selectedVariantId}
                  onChange={e => setSelectedVariantId(e.target.value)}
                  className="w-full text-xs bg-[#FAF8F5] border border-[#E3DDD0] rounded p-2.5 text-[#14181A]"
                >
                  {currentProduct?.variants.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.sku}) — Available: {v.stock - v.reservedStock} (Total: {v.stock}, Reserved: {v.reservedStock})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current State Snapshot */}
            {currentVariant && (
              <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#FAF8F5] border border-[#E3DDD0] rounded text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[#5E6663] block text-[10px] uppercase">Warehouse Stock:</span>
                    <span className="font-mono-tabular font-semibold text-sm text-[#14181A]">
                      {currentVariant.stock} units
                    </span>
                  </div>
                  <div className="border-l border-[#E3DDD0] pl-4">
                    <span className="text-[#5E6663] block text-[10px] uppercase">Currently Reserved:</span>
                    <span className="font-mono-tabular font-semibold text-sm text-[#C9A25D]">
                      {currentVariant.reservedStock} units
                    </span>
                  </div>
                  <div className="border-l border-[#E3DDD0] pl-4">
                    <span className="text-[#5E6663] block text-[10px] uppercase">Immediately Available:</span>
                    <span className={`font-mono-tabular font-semibold text-sm ${currentVariant.stock - currentVariant.reservedStock > 0 ? 'text-[#2F7D5B]' : 'text-[#B5483C]'}`}>
                      {Math.max(0, currentVariant.stock - currentVariant.reservedStock)} units
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={forceExpireReservations}
                    className="px-3 py-1.5 border border-[#E3DDD0] hover:border-[#0E3B3A] text-[#5E6663] hover:text-[#0E3B3A] text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Simulate 10-minute timeout expiry for abandoned carts"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Fast-Forward 10m TTL</span>
                  </button>

                  <button
                    onClick={handleRunSim}
                    disabled={isRunning}
                    className="px-4 py-2 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs font-medium rounded transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#C9A25D]" />
                    <span>{isRunning ? 'Simulating Collision...' : 'Fire 2 Simultaneous Purchases'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Collision Test Output Console */}
          {lastResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#14181A] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#0E3B3A]" />
                  <span>Execution Telemetry & Transaction Proof</span>
                </span>
                <span className="text-[11px] font-mono-tabular text-[#5E6663]">
                  {lastResult.timestamp}
                </span>
              </div>

              <div className="p-4 bg-[#101415] text-[#F5F1E9] rounded font-mono-tabular text-xs space-y-3 border border-[#2a3230]">
                {/* Shopper A */}
                <div className="border-b border-[#2a3230] pb-2.5">
                  <div className="flex items-center justify-between text-[#7FE3C4]">
                    <span>[TRANSACTION_01] Buyer A (Thread 1 - T+0ms)</span>
                    <span className="text-[10px] bg-[#003d2f] text-[#7FE3C4] px-1.5 py-0.5 rounded">
                      {lastResult.shopperA.status} ({lastResult.shopperA.elapsedMs}ms)
                    </span>
                  </div>
                  <p className="text-[#a4cfcd] text-[11px] mt-1">
                    {lastResult.shopperA.message}
                  </p>
                </div>

                {/* Shopper B */}
                <div className="border-b border-[#2a3230] pb-2.5">
                  <div className="flex items-center justify-between text-[#ffd48a]">
                    <span>[TRANSACTION_02] Buyer B (Thread 2 - T+15ms)</span>
                    <span className="text-[10px] bg-[#795a1c] text-[#ffd48a] px-1.5 py-0.5 rounded">
                      {lastResult.shopperB.status} ({lastResult.shopperB.elapsedMs}ms)
                    </span>
                  </div>
                  <p className="text-[#eac078] text-[11px] mt-1">
                    {lastResult.shopperB.message}
                  </p>
                </div>

                {/* Verification result */}
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-[#7FE3C4]">
                    Stock Before: {lastResult.stockBefore} → Stock After: {lastResult.stockAfter}
                  </span>
                  <span className="text-white font-semibold">
                    {lastResult.proof}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Historical Logs */}
          {concurrencyLogs.length > 1 && (
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#5E6663] block">
                Previous Collision Runs ({concurrencyLogs.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {concurrencyLogs.slice(1, 4).map((log, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-[#FAF8F5] border border-[#E3DDD0] rounded text-[11px] font-mono-tabular flex items-center justify-between"
                  >
                    <span className="text-[#14181A]">
                      Run #{concurrencyLogs.length - i}: Buyer A [{log.shopperA.status}] / Buyer B [{log.shopperB.status}]
                    </span>
                    <span className="text-[#5E6663]">{log.proof}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E3DDD0] bg-[#FAF8F5] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#0E3B3A] text-white text-xs font-medium rounded hover:bg-[#164C4B] transition-colors cursor-pointer"
          >
            Return to Marketplace
          </button>
        </div>
      </div>
    </div>
  );
};
