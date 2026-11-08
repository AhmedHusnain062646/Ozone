import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { X, ShieldCheck, CreditCard, Split, CheckCircle2, AlertCircle, RefreshCw, Key, Clock, ArrowRight, Building, Truck, Lock, AlertTriangle } from 'lucide-react';
import { ParentOrder } from '../../types/marketplace';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const { cart, products, sellers, reservationCountdown, checkout, clearCart } = useMarketplace();

  // Prototype Step Switcher: 1 = Address, 2 = Payment, 3 = Split Review, 4 = Sold Out Alert
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(3);

  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `idemp-oz-${Date.now().toString().slice(-6)}-9821`
  );

  const [paymentMethod, setPaymentMethod] =
    useState<ParentOrder['paymentMethod']>('sandbox_card');

  const [shippingAddress, setShippingAddress] = useState({
    fullName: 'Julian Sterling',
    street: '42 Sanctuary Way, Suite 8',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94107',
    country: 'United States',
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlaceOrder = () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const result = checkout(shippingAddress, paymentMethod, idempotencyKey);
      setIsSubmitting(false);

      if (result.success && result.orderId) {
        setConfirmedOrderId(result.orderId);
      } else {
        setErrorMsg(result.error || 'Failed to complete transaction.');
      }
    }, 700);
  };

  const handleFinishConfirmed = () => {
    const id = confirmedOrderId || 'OZ-2025-98421';
    setConfirmedOrderId(null);
    onClose();
    onOrderSuccess(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#FAF8F5] border border-[#E3DDD0] rounded shadow-[0_12px_48px_rgba(20,24,26,0.2)] flex flex-col">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[#E3DDD0] bg-[#FFFFFF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0E3B3A] text-white rounded">
              <Split className="w-5 h-5 text-[#C9A25D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-editorial text-xl text-[#0E3B3A]">
                  Autonomous Escrow Split Checkout
                </h3>
                <span className="px-2 py-0.5 bg-[#E8F3EE] text-[#0E3B3A] border border-[#C3DED3] rounded text-[9px] font-mono-tabular font-semibold uppercase tracking-wider">
                  Vault Tier I
                </span>
              </div>
              <p className="text-xs text-[#5E6663]">
                Single collector transaction automatically partitioned into sovereign atelier sub-orders
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

        {/* Prototype Steps Controller Tabs */}
        <div className="px-6 py-2.5 bg-[#ECE7DC] border-b border-[#E3DDD0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#0E3B3A]">
              Prototype State Simulator:
            </span>
            <div className="flex bg-[#FFFFFF] p-0.5 rounded border border-[#E3DDD0] text-[11px] font-semibold">
              <button
                onClick={() => setCurrentStep(1)}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  currentStep === 1 ? 'bg-[#0E3B3A] text-white' : 'text-[#717978] hover:text-[#0E3B3A]'
                }`}
              >
                1. Address
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  currentStep === 2 ? 'bg-[#0E3B3A] text-white' : 'text-[#717978] hover:text-[#0E3B3A]'
                }`}
              >
                2. Settlement
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  currentStep === 3 ? 'bg-[#0E3B3A] text-white' : 'text-[#717978] hover:text-[#0E3B3A]'
                }`}
              >
                3. Split Review
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  currentStep === 4 ? 'bg-[#9A2E26] text-white' : 'text-[#9A2E26] hover:bg-[#FDF2F1]'
                }`}
              >
                Sold Out Alert
              </button>
            </div>
          </div>

          {/* 10-Minute Escrow Lock Banner */}
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-4 h-4 text-[#C9A25D]" />
            <span className="text-[#5E6663]">Escrow Lock:</span>
            <span className="font-mono-tabular font-bold text-[#0E3B3A] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E3DDD0]">
              {formatTime(reservationCountdown)}
            </span>
          </div>
        </div>

        {/* 3-Step Progress Indicators */}
        <div className="px-6 py-3 bg-[#FFFFFF] border-b border-[#E3DDD0]">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 cursor-pointer pb-2 border-b-2 transition-colors ${
                currentStep >= 1 ? 'border-[#0E3B3A] text-[#0E3B3A]' : 'border-transparent text-[#717978]'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono-tabular text-[10px] font-bold ${
                currentStep >= 1 ? 'bg-[#0E3B3A] text-white' : 'bg-[#EAE5D9] text-[#717978]'
              }`}>
                1
              </span>
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Concierge Dispatch
              </span>
            </div>

            <div
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-2 cursor-pointer pb-2 border-b-2 transition-colors ${
                currentStep >= 2 ? 'border-[#0E3B3A] text-[#0E3B3A]' : 'border-transparent text-[#717978]'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono-tabular text-[10px] font-bold ${
                currentStep >= 2 ? 'bg-[#0E3B3A] text-white' : 'bg-[#EAE5D9] text-[#717978]'
              }`}>
                2
              </span>
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Escrow Settlement
              </span>
            </div>

            <div
              onClick={() => setCurrentStep(3)}
              className={`flex items-center gap-2 cursor-pointer pb-2 border-b-2 transition-colors ${
                currentStep >= 3 ? 'border-[#0E3B3A] text-[#0E3B3A]' : 'border-transparent text-[#717978]'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono-tabular text-[10px] font-bold ${
                currentStep >= 3 ? 'bg-[#0E3B3A] text-white' : 'bg-[#EAE5D9] text-[#717978]'
              }`}>
                3
              </span>
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Split Review & Escrow
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-4 bg-[#FDF2F1] border border-[#F5C2BE] text-[#9A2E26] text-xs rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: CONCIERGE DISPATCH ADDRESS */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-editorial text-lg text-[#0E3B3A]">
                    Step 1: Concierge Dispatch Dossier
                  </h4>
                  <p className="text-xs text-[#5E6663]">
                    Specify the secure arrival venue for white-glove art handling and uncrating.
                  </p>
                </div>
                <Truck className="w-5 h-5 text-[#C9A25D]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#0E3B3A] mb-1">
                    Collector Full Name
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.fullName}
                    onChange={e => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E3DDD0] rounded text-xs text-[#14181A] focus:outline-none focus:border-[#0E3B3A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#0E3B3A] mb-1">
                    Street & Residence / Penthouse
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.street}
                    onChange={e => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E3DDD0] rounded text-xs text-[#14181A] focus:outline-none focus:border-[#0E3B3A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#0E3B3A] mb-1">
                    City / Municipality
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={e => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E3DDD0] rounded text-xs text-[#14181A] focus:outline-none focus:border-[#0E3B3A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#0E3B3A] mb-1">
                      State / Canton
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.state}
                      onChange={e => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E3DDD0] rounded text-xs text-[#14181A] focus:outline-none focus:border-[#0E3B3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#0E3B3A] mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.postalCode}
                      onChange={e => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E3DDD0] rounded text-xs text-[#14181A] focus:outline-none focus:border-[#0E3B3A] font-mono-tabular"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#E8F3EE] border border-[#C3DED3] rounded text-[11px] text-[#2F7D5B] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Consolidated customs clearance managed under Ozone Sovereign Escrow bond.</span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 bg-[#0E3B3A] text-white text-xs uppercase tracking-wider font-semibold rounded cursor-pointer flex items-center gap-2"
                >
                  <span>Proceed to Settlement Facility</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ESCROW SETTLEMENT FACILITY */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-editorial text-lg text-[#0E3B3A]">
                    Step 2: Escrow Settlement Facility
                  </h4>
                  <p className="text-xs text-[#5E6663]">
                    Funds remain in sovereign multi-sig escrow until physical hallmark inspection upon arrival.
                  </p>
                </div>
                <Building className="w-5 h-5 text-[#C9A25D]" />
              </div>

              <div className="space-y-3">
                <label
                  onClick={() => setPaymentMethod('sandbox_card')}
                  className={`p-4 border rounded flex items-center justify-between cursor-pointer transition-colors ${
                    paymentMethod === 'sandbox_card'
                      ? 'bg-[#FFFFFF] border-[#0E3B3A] ring-1 ring-[#0E3B3A]'
                      : 'bg-[#FAF8F5] border-[#E3DDD0] hover:border-[#717978]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-[#0E3B3A]" />
                    <div>
                      <span className="font-semibold text-xs text-[#14181A] block">
                        Sandbox Archival Card (Instant Escrow Authorization)
                      </span>
                      <span className="text-[11px] text-[#717978]">
                        Simulated Visa Infinite / AMEX Centurion with instant ledger locking
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethod === 'sandbox_card'}
                    onChange={() => setPaymentMethod('sandbox_card')}
                    className="accent-[#0E3B3A]"
                  />
                </label>

                <label
                  onClick={() => setPaymentMethod('ozone_escrow')}
                  className={`p-4 border rounded flex items-center justify-between cursor-pointer transition-colors ${
                    paymentMethod === 'ozone_escrow'
                      ? 'bg-[#FFFFFF] border-[#0E3B3A] ring-1 ring-[#0E3B3A]'
                      : 'bg-[#FAF8F5] border-[#E3DDD0] hover:border-[#717978]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#C9A25D]" />
                    <div>
                      <span className="font-semibold text-xs text-[#14181A] block">
                        Direct Swiss / Tokyo Bank Vault Wire (MUFG Escrow)
                      </span>
                      <span className="text-[11px] text-[#717978]">
                        Direct SWIFT MT-103 payment with dual-signature release
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethod === 'ozone_escrow'}
                    onChange={() => setPaymentMethod('ozone_escrow')}
                    className="accent-[#0E3B3A]"
                  />
                </label>

                <label
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 border rounded flex items-center justify-between cursor-pointer transition-colors ${
                    paymentMethod === 'cod'
                      ? 'bg-[#FFFFFF] border-[#0E3B3A] ring-1 ring-[#0E3B3A]'
                      : 'bg-[#FAF8F5] border-[#E3DDD0] hover:border-[#717978]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-[#0E3B3A]" />
                    <div>
                      <span className="font-semibold text-xs text-[#14181A] block">
                        White-Glove Courier Hallmark Release (Cash On Delivery)
                      </span>
                      <span className="text-[11px] text-[#717978]">
                        Physical payment rendered only after courier unboxing and micro-etch verification
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-[#0E3B3A]"
                  />
                </label>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border border-[#E3DDD0] text-xs font-semibold rounded cursor-pointer text-[#5E6663]"
                >
                  Back to Address
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 bg-[#0E3B3A] text-white text-xs uppercase tracking-wider font-semibold rounded cursor-pointer flex items-center gap-2"
                >
                  <span>Review Split Sub-Orders</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SPLIT REVIEW & ESCROW CONFIRMATION */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-editorial text-lg text-[#0E3B3A]">
                    Step 3: Multi-Seller Cart Partitioning
                  </h4>
                  <p className="text-xs text-[#5E6663]">
                    Your single checkout is automatically split into independent sub-orders per atelier with sovereign tracking.
                  </p>
                </div>
                <Split className="w-5 h-5 text-[#0E3B3A]" />
              </div>

              {/* Sub-Orders Partitioning Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sub-Order 1: Atelier Vane */}
                <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-3">
                  <div className="flex items-center justify-between border-b border-[#F0EBE0] pb-2">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#717978] block">
                        Sub-Order Allotment 01
                      </span>
                      <h5 className="font-editorial text-sm font-semibold text-[#0E3B3A]">
                        Atelier Vane
                      </h5>
                    </div>
                    <span className="px-1.5 py-0.5 bg-[#F5E6CA] text-[#78591b] rounded text-[9px] font-semibold uppercase tracking-wider">
                      Kyoto Studio
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-medium text-[#14181A]">Monolithic Travertine Vessel N°03</p>
                    <p className="text-[11px] text-[#5E6663]">Raw Roman Travertine • 1 Unit</p>
                    <div className="flex justify-between pt-1">
                      <span className="text-[#717978]">Insured Air Freight:</span>
                      <span className="text-[#2F7D5B] font-medium">Complimentary</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F0EBE0] flex justify-between items-baseline">
                    <span className="text-[11px] text-[#717978]">Sub-Order Total:</span>
                    <span className="font-mono-tabular font-bold text-sm text-[#0E3B3A]">$1,450.00 USD</span>
                  </div>
                </div>

                {/* Sub-Order 2: Maison Silt */}
                <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-3">
                  <div className="flex items-center justify-between border-b border-[#F0EBE0] pb-2">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#717978] block">
                        Sub-Order Allotment 02
                      </span>
                      <h5 className="font-editorial text-sm font-semibold text-[#0E3B3A]">
                        Maison Silt
                      </h5>
                    </div>
                    <span className="px-1.5 py-0.5 bg-[#E8F3EE] text-[#0E3B3A] rounded text-[9px] font-semibold uppercase tracking-wider">
                      Normandy Loom
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-medium text-[#14181A]">Unbleached Wild-Spun Flax Kimono</p>
                    <p className="text-[11px] text-[#5E6663]">Size II Tailored • 1 Unit</p>
                    <div className="flex justify-between pt-1">
                      <span className="text-[#717978]">Climate-buffered Loom Freight:</span>
                      <span className="font-mono-tabular font-medium text-[#14181A]">$65.00 USD</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F0EBE0] flex justify-between items-baseline">
                    <span className="text-[11px] text-[#717978]">Sub-Order Total:</span>
                    <span className="font-mono-tabular font-bold text-sm text-[#0E3B3A]">$955.00 USD</span>
                  </div>
                </div>
              </div>

              {/* Idempotency Key & Concurrency Lock */}
              <div className="p-3 bg-[#FFFFFF] border border-[#E3DDD0] rounded flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#C9A25D]" />
                  <div>
                    <span className="font-semibold text-[#0E3B3A] block">
                      Atomic Idempotency Signature
                    </span>
                    <span className="text-[10px] text-[#717978]">
                      Guarantees zero double-billing under simultaneous network retries
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-[#FAF8F5] border border-[#E3DDD0] rounded font-mono-tabular text-[11px] text-[#0E3B3A]">
                    {idempotencyKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => setIdempotencyKey(`idemp-oz-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9000 + 1000)}`)}
                    className="p-1 text-[#717978] hover:text-[#0E3B3A] cursor-pointer"
                    title="Regenerate idempotency key"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Grand Total & Action Bar */}
              <div className="p-4 bg-[#FFFFFF] border border-[#0E3B3A] rounded flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#717978] block">
                    Consolidated Master Settlement
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-editorial text-2xl font-bold text-[#0E3B3A]">
                      $2,405.00
                    </span>
                    <span className="font-mono-tabular text-xs text-[#717978]">USD</span>
                    <span className="text-[10px] text-[#2F7D5B] font-medium">
                      (All Duties & Hallmarks Included)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePlaceOrder}
                  className="w-full sm:w-auto px-6 py-3 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#C9A25D]" />
                      <span>Locking Sovereign Escrow...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#C9A25D]" />
                      <span>Lock Escrow & Dispatch Split Sub-Orders</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SIMULATED SOLD OUT / CONCURRENT COLLISION ALERT */}
          {currentStep === 4 && (
            <div className="p-6 bg-[#FDF2F1] border border-[#F5C2BE] rounded space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-[#9A2E26] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-editorial text-xl font-semibold text-[#9A2E26]">
                    Vault Conflict: Edition Acquired Simultaneously
                  </h4>
                  <p className="text-xs text-[#71221B] leading-relaxed">
                    Another collector verified an escrow lock on <strong className="text-[#9A2E26]">Monolithic Travertine Vessel N°03</strong> while your transaction was processing. Due to strict one-of-a-kind stone provenance, the edition is no longer available.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#F5C2BE] rounded text-xs space-y-2">
                <span className="font-semibold text-[#0E3B3A] block">
                  Automated Conflict Resolution Protocol:
                </span>
                <p className="text-[11px] text-[#5E6663]">
                  Your cart will automatically remove the unavailable travertine vessel while preserving the rest of your split sub-order for Maison Silt.
                </p>
                <div className="flex justify-between items-center pt-1 border-t border-[#F0EBE0] text-[11px]">
                  <span>Adjusted Master Acquisition Value:</span>
                  <span className="font-mono-tabular font-bold text-[#0E3B3A] text-sm">
                    $955.00 USD
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 border border-[#E3DDD0] bg-white text-xs font-semibold rounded cursor-pointer text-[#5E6663]"
                >
                  Cancel & Return to Bag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert('Travertine Vessel removed from reservation. Proceeding with Maison Silt sub-order.');
                    setCurrentStep(3);
                  }}
                  className="px-5 py-2.5 bg-[#9A2E26] hover:bg-[#71221B] text-white text-xs font-semibold rounded cursor-pointer"
                >
                  Remove Vessel & Proceed with Maison Silt ($955.00)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Confirmation Popup */}
        {confirmedOrderId && (
          <div className="absolute inset-0 z-50 bg-[#FFFFFF] p-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-[#E8F3EE] border border-[#C3DED3] flex items-center justify-center text-[#2F7D5B]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#C9A25D]">
                Autonomous Escrow Bond Minted
              </span>
              <h3 className="font-editorial text-2xl text-[#0E3B3A]">
                Acquisition Confirmed & Partitioned
              </h3>
              <p className="text-xs text-[#5E6663] max-w-md mx-auto">
                Master Order <code className="font-mono-tabular font-bold text-[#0E3B3A]">{confirmedOrderId}</code> has been partitioned into 2 independent atelier sub-orders.
              </p>
            </div>

            <div className="w-full max-w-md p-4 bg-[#FAF8F5] border border-[#E3DDD0] rounded text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#717978]">Sub-Order #SUB-AV-9021:</span>
                <span className="text-[#0E3B3A] font-semibold">Atelier Vane ($1,450.00)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717978]">Sub-Order #SUB-MS-4819:</span>
                <span className="text-[#0E3B3A] font-semibold">Maison Silt ($955.00)</span>
              </div>
              <div className="flex justify-between border-t border-[#E3DDD0] pt-1">
                <span className="text-[#717978]">Consolidated Settlement:</span>
                <span className="font-mono-tabular font-bold text-[#0E3B3A]">$2,405.00 USD</span>
              </div>
            </div>

            <button
              onClick={handleFinishConfirmed}
              className="px-6 py-2.5 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded cursor-pointer transition-colors shadow-xs"
            >
              Inspect Live Satellite Telemetry & Sub-Orders →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
