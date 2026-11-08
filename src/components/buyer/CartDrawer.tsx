import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { X, Clock, Trash2, ArrowRight, ShieldCheck, Plus, Minus, Bookmark, MoreHorizontal, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onOpenCheckout }) => {
  const {
    cart,
    products,
    sellers,
    reservationCountdown,
    updateCartQuantity,
    removeFromCart,
    toggleWishlist,
    clearCart,
  } = useMarketplace();

  // Prototype state switcher: 'held' | 'expired' | 'vacant'
  const [prototypeMode, setPrototypeMode] = useState<'held' | 'expired' | 'vacant'>('held');

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Group real cart items by seller
  const itemsBySeller = new Map<string, typeof cart>();
  cart.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return;
    const list = itemsBySeller.get(prod.sellerId) || [];
    list.push(item);
    itemsBySeller.set(prod.sellerId, list);
  });

  const grandSubtotal = cart.reduce((total, item) => {
    const prod = products.find(p => p.id === item.productId);
    const variant = prod?.variants.find(v => v.id === item.variantId);
    if (!prod || !variant) return total;
    return total + (prod.basePrice + variant.priceDelta) * item.quantity;
  }, 0);

  // If in 'vacant' prototype mode, or real cart is empty
  const isVacant = prototypeMode === 'vacant' || (prototypeMode === 'held' && cart.length === 0);
  const isExpired = prototypeMode === 'expired';

  // Shipping cost: Maison Silt has $65 freight in mock
  const shippingTotal = isVacant ? 0 : 65.0;
  const totalAcquisition = grandSubtotal > 0 ? grandSubtotal + shippingTotal : (isVacant ? 0 : 2405);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#FAF8F5] border-l border-[#E3DDD0] h-full flex flex-col shadow-[0_8px_32px_rgba(20,24,26,0.18)]">
        {/* Top Header Bar */}
        <div className="px-5 py-3 border-b border-[#E3DDD0] bg-[#FFFFFF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 text-[#5E6663] hover:text-[#0E3B3A] transition-colors cursor-pointer"
              title="Return"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-editorial text-lg tracking-[0.05em] text-[#0E3B3A] font-semibold">
                OZONE
              </span>
              <span className="text-zinc-300">/</span>
              <span className="text-xs text-[#5E6663] font-medium truncate max-w-[140px]">
                Item Provenance...
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Atelier provenance options & currency selector (USD).')}
              className="p-1.5 text-[#5E6663] hover:text-[#0E3B3A] rounded transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 rounded-full bg-[#0E3B3A] text-white flex items-center justify-center text-xs font-serif font-bold">
              JS
            </div>
          </div>
        </div>

        {/* Prototype Bar */}
        <div className="px-5 py-2.5 bg-[#FAF8F5] border-b border-[#E3DDD0] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0E3B3A] tracking-wider uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-[#C9A25D]" />
            <span>Acquisition Salon</span>
          </div>

          {/* Prototype Switcher Tabs */}
          <div className="flex items-center bg-[#ECE7DC] p-0.5 rounded text-[10px] font-semibold">
            <button
              onClick={() => setPrototypeMode('held')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                prototypeMode === 'held'
                  ? 'bg-white text-[#0E3B3A] shadow-xs'
                  : 'text-[#717978] hover:text-[#0E3B3A]'
              }`}
            >
              Held ({formatTime(reservationCountdown)})
            </button>
            <button
              onClick={() => setPrototypeMode('expired')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                prototypeMode === 'expired'
                  ? 'bg-white text-[#9A2E26] shadow-xs'
                  : 'text-[#717978] hover:text-[#0E3B3A]'
              }`}
            >
              Expired
            </button>
            <button
              onClick={() => setPrototypeMode('vacant')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                prototypeMode === 'vacant'
                  ? 'bg-white text-[#0E3B3A] shadow-xs'
                  : 'text-[#717978] hover:text-[#0E3B3A]'
              }`}
            >
              Vacant
            </button>
          </div>
        </div>

        {/* Escrow Reserve Status Banner */}
        {prototypeMode === 'held' && (
          <div className="px-5 py-3.5 bg-[#E8F3EE] border-b border-[#C3DED3] text-[#0E3B3A] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0E3B3A] shrink-0" />
                <h4 className="font-editorial text-sm font-semibold text-[#0E3B3A]">
                  Specimens held in escrow reserve
                </h4>
              </div>
              <span className="px-2 py-0.5 bg-[#FFFFFF] border border-[#0E3B3A]/30 text-[#0E3B3A] text-[9px] font-mono-tabular tracking-wider uppercase font-semibold rounded">
                Vault Tier I
              </span>
            </div>
            <p className="text-[11px] text-[#2F7D5B]">
              Inventory locked to collector account. Concludes in{' '}
              <span className="font-mono-tabular font-bold text-[#0E3B3A]">
                {formatTime(reservationCountdown)}
              </span>
            </p>
            {/* Progress bar gauge */}
            <div className="w-full bg-[#C3DED3] h-1.5 rounded-full overflow-hidden flex">
              <div
                className="bg-[#0E3B3A] h-full transition-all duration-1000"
                style={{ width: `${(reservationCountdown / 600) * 100}%` }}
              />
              <div
                className="bg-[#C9A25D] h-full transition-all duration-1000"
                style={{ width: `${Math.max(0, 100 - (reservationCountdown / 600) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {prototypeMode === 'expired' && (
          <div className="px-5 py-3.5 bg-[#FDF2F1] border-b border-[#F5C2BE] text-[#9A2E26] space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <Clock className="w-4 h-4 text-[#9A2E26]" />
                <span>10-Minute Escrow Lock Expired</span>
              </div>
              <span className="text-[9px] font-mono-tabular uppercase tracking-wider bg-white px-1.5 py-0.5 border border-[#F5C2BE] rounded">
                TTL Expiry
              </span>
            </div>
            <p className="text-[11px] text-[#71221B]">
              Reserved stock has been returned to guild inventory pools. Items may be subject to simultaneous acquisition.
            </p>
          </div>
        )}

        {/* Scrollable Satchel List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isVacant ? (
            <div className="h-72 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#EAE5D9] flex items-center justify-center text-[#717978]">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-editorial text-2xl text-[#0E3B3A]">Vacant Reserve</h3>
                <p className="text-xs text-[#5E6663] max-w-xs mt-1">
                  Your acquisition bag is currently unpopulated. Select numbered editions from our active ateliers to lock an escrow reservation.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-[#0E3B3A] text-white text-xs uppercase tracking-wider font-semibold rounded cursor-pointer"
              >
                Explore Curated Works
              </button>
            </div>
          ) : (
            <>
              {/* Atelier Group 1: Atelier Vane */}
              <div className="bg-[#FFFFFF] border border-[#E3DDD0] rounded p-4 space-y-3 shadow-xs">
                {/* Atelier Header */}
                <div className="flex items-center justify-between border-b border-[#F0EBE0] pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#EAE5D9] text-[#0E3B3A] font-serif font-bold text-xs flex items-center justify-center border border-[#D5CEBF]">
                      AV
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-editorial text-sm font-semibold text-[#0E3B3A]">
                          Atelier Vane
                        </h4>
                        <span className="px-1.5 py-0.2 bg-[#F5E6CA] text-[#78591b] border border-[#C9A25D]/40 rounded text-[9px] font-semibold uppercase tracking-wider">
                          Certified Guild
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0E3B3A]" />
                      </div>
                      <p className="text-[10px] text-[#717978]">Kyoto Studio & Zurich</p>
                    </div>
                  </div>
                </div>

                {/* Specimen Item Card */}
                <div className="flex gap-3">
                  <div className="w-20 h-20 bg-[#FAF8F5] border border-[#E3DDD0] rounded overflow-hidden shrink-0">
                    <img
                      src="/src/assets/images/ozone_hero_luxury_living_1794146207794.jpg"
                      alt="Monolithic Travertine Vessel N°03"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <h5 className="font-editorial text-sm font-medium text-[#14181A] leading-tight">
                        Monolithic Travertine Vessel N°03
                      </h5>
                      <button
                        onClick={() => removeFromCart('prod-vane-01', 'var-vane-raw')}
                        className="text-[#717978] hover:text-[#9A2E26] p-0.5 cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#5E6663]">Raw Roman Travertine / Studio 320mm</p>
                    <p className="text-[10px] font-mono-tabular text-[#78591b] tracking-wider uppercase">
                      Hallmark: #AV-KY-0842
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center border border-[#E3DDD0] rounded bg-[#FAF8F5]">
                        <button
                          onClick={() => updateCartQuantity('prod-vane-01', 'var-vane-raw', 1)}
                          className="px-2 py-0.5 text-xs text-[#5E6663] hover:text-[#0E3B3A] cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono-tabular font-medium text-[#14181A]">
                          01
                        </span>
                        <button
                          onClick={() => updateCartQuantity('prod-vane-01', 'var-vane-raw', 2)}
                          className="px-2 py-0.5 text-xs text-[#5E6663] hover:text-[#0E3B3A] cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-mono-tabular text-sm font-semibold text-[#14181A]">
                        $1,450.00 <span className="text-[10px] text-[#717978] font-normal">USD</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0EBE0] flex items-center justify-between text-[11px] text-[#717978]">
                  <span>Dispatched from Kyoto Studio</span>
                  <span className="text-[#0E3B3A] font-medium">Insured Courier: Free</span>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    onClick={() => {
                      toggleWishlist('prod-vane-01');
                      alert('Item bookmarked in your private archive wishlist.');
                    }}
                    className="flex items-center gap-1 text-[#717978] hover:text-[#0E3B3A] cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#C9A25D]" />
                    <span className="uppercase tracking-wider text-[9px] font-semibold">
                      Move to Archive Wishlist
                    </span>
                  </button>
                  <span className="font-mono-tabular text-[#0E3B3A] font-semibold text-xs">
                    Guild Subtotal: $1,450.00
                  </span>
                </div>
              </div>

              {/* Atelier Group 2: Maison Silt */}
              <div className="bg-[#FFFFFF] border border-[#E3DDD0] rounded p-4 space-y-3 shadow-xs">
                {/* Atelier Header */}
                <div className="flex items-center justify-between border-b border-[#F0EBE0] pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#EAE5D9] text-[#0E3B3A] font-serif font-bold text-xs flex items-center justify-center border border-[#D5CEBF]">
                      MS
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-editorial text-sm font-semibold text-[#0E3B3A]">
                          Maison Silt
                        </h4>
                        <span className="px-1.5 py-0.2 bg-[#E8F3EE] text-[#0E3B3A] border border-[#C3DED3] rounded text-[9px] font-semibold uppercase tracking-wider">
                          Verified Atelier
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0E3B3A]" />
                      </div>
                      <p className="text-[10px] text-[#717978]">Normandy Loom, France</p>
                    </div>
                  </div>
                </div>

                {/* Specimen Item Card */}
                <div className="flex gap-3">
                  <div className="w-20 h-20 bg-[#FAF8F5] border border-[#E3DDD0] rounded overflow-hidden shrink-0">
                    <img
                      src="/src/assets/images/product_cashmere_overcoat_1794146209378.jpg"
                      alt="Unbleached Wild-Spun Flax Kimono"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <h5 className="font-editorial text-sm font-medium text-[#14181A] leading-tight">
                        Unbleached Wild-Spun Flax Kimono
                      </h5>
                      <button
                        onClick={() => removeFromCart('prod-silt-01', 'var-silt-ii')}
                        className="text-[#717978] hover:text-[#9A2E26] p-0.5 cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#5E6663]">Size II (Unisex Tailored) / Archival Ecru</p>
                    <p className="text-[10px] font-mono-tabular text-[#78591b] tracking-wider uppercase">
                      Edition: 14 of 25 Handloom
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center border border-[#E3DDD0] rounded bg-[#FAF8F5]">
                        <button
                          onClick={() => updateCartQuantity('prod-silt-01', 'var-silt-ii', 1)}
                          className="px-2 py-0.5 text-xs text-[#5E6663] hover:text-[#0E3B3A] cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono-tabular font-medium text-[#14181A]">
                          01
                        </span>
                        <button
                          onClick={() => updateCartQuantity('prod-silt-01', 'var-silt-ii', 2)}
                          className="px-2 py-0.5 text-xs text-[#5E6663] hover:text-[#0E3B3A] cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-mono-tabular text-sm font-semibold text-[#14181A]">
                        $890.00 <span className="text-[10px] text-[#717978] font-normal">USD</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0EBE0] flex items-center justify-between text-[11px] text-[#717978]">
                  <span>Climate-buffered Loom Freight</span>
                  <span className="font-mono-tabular font-medium text-[#14181A]">$65.00 USD</span>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    onClick={() => {
                      toggleWishlist('prod-silt-01');
                      alert('Item bookmarked in your private archive wishlist.');
                    }}
                    className="flex items-center gap-1 text-[#717978] hover:text-[#0E3B3A] cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#C9A25D]" />
                    <span className="uppercase tracking-wider text-[9px] font-semibold">
                      Move to Archive Wishlist
                    </span>
                  </button>
                  <span className="font-mono-tabular text-[#0E3B3A] font-semibold text-xs">
                    Guild Subtotal: $955.00
                  </span>
                </div>
              </div>

              {/* Escrow Assurance Card */}
              <div className="p-3.5 bg-[#E8F3EE] border border-[#C3DED3] rounded flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#0E3B3A] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#2F7D5B] leading-relaxed">
                  Autonomous Escrow Protocol guarantees funds remain in reserve until courier inspection and physical hallmark signing.
                </p>
              </div>

              {/* Acquisition Summary */}
              <div className="bg-[#FFFFFF] border border-[#E3DDD0] rounded p-4 space-y-3">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-[#0E3B3A]">
                  <span>Acquisition Summary</span>
                  <span className="text-[#717978] font-normal">2 Guild Allotments</span>
                </div>

                <div className="space-y-1.5 text-xs text-[#5E6663] border-b border-[#F0EBE0] pb-3">
                  <div className="flex justify-between">
                    <span>Specimens Subtotal (2 works)</span>
                    <span className="font-mono-tabular font-medium text-[#14181A]">
                      ${grandSubtotal > 0 ? grandSubtotal.toLocaleString() : '2,340.00'} USD
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Consolidated Insured Courier</span>
                    <span className="font-mono-tabular font-medium text-[#14181A]">$65.00 USD</span>
                  </div>
                  <div className="flex justify-between text-[#2F7D5B]">
                    <span>Escrow Vault Protocol Fee</span>
                    <span className="font-mono-tabular font-medium">$0.00 (Complimentary)</span>
                  </div>
                </div>

                <div className="pt-1 flex items-baseline justify-between">
                  <div>
                    <span className="font-editorial text-sm font-semibold text-[#0E3B3A] block">
                      Total Acquisition Value
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-[#717978]">
                      Duties, Taxes & Hallmarks Included
                    </span>
                  </div>
                  <span className="font-mono-tabular text-xl font-bold text-[#0E3B3A]">
                    ${totalAcquisition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs font-normal text-[#717978]">USD</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Action */}
        {!isVacant && (
          <div className="p-5 border-t border-[#E3DDD0] bg-[#FFFFFF] space-y-2">
            <button
              onClick={() => {
                onClose();
                onOpenCheckout();
              }}
              className="w-full py-3 px-4 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-[#C9A25D]" />
              <span>Proceed to Vault Escrow (2 Ateliers)</span>
            </button>
            <p className="text-[10px] text-center text-[#717978]">
              Hallmarked release upon delivery. Curated through sovereign guild protocol.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
