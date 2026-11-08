import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Product } from '../../types/marketplace';
import {
  Heart,
  Trash2,
  ArrowRight,
  TrendingDown,
  ShoppingBag,
  Bell,
  Bookmark,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

interface WishlistViewProps {
  onSelectProduct: (product: Product) => void;
  onOpenCart: () => void;
  onBrowseCatalog: () => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  onSelectProduct,
  onOpenCart,
  onBrowseCatalog,
}) => {
  const { wishlist, products, sellers, toggleWishlist, addToCart } = useMarketplace();

  // Filter tabs: 'all' | 'reduced' | 'low_reserve' | 'allocations'
  const [activeTab, setActiveTab] = useState<'all' | 'reduced' | 'low_reserve' | 'allocations'>('all');
  const [simulateEmpty, setSimulateEmpty] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleMoveToBag = (productId: string, variantId: string, title: string) => {
    addToCart(productId, variantId, 1);
    setFeedback(`"${title}" secured in 10-minute escrow reserve in your satchel.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleBatchMoveAvailable = () => {
    addToCart('prod-vane-01', 'var-vane-raw', 1);
    addToCart('prod-silt-01', 'var-silt-ii', 1);
    addToCart('prod-homage-01', 'var-homage-ti', 1);
    setFeedback('3 available archival specimens transferred to your escrow bag.');
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* 1. Valuation Advisory Banner */}
      <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded flex items-start gap-3 shadow-xs">
        <TrendingDown className="w-5 h-5 text-[#78591b] shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5 flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#78591b]">
              Valuation Advisory
            </span>
            <span className="font-mono-tabular text-[10px] text-[#717978]">REV. 04.28</span>
          </div>
          <p className="text-[#5E6663] leading-relaxed">
            2 saved archival specimens have received downward price revisions by their originating ateliers this week.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-[#E8F3EE] border border-[#2F7D5B] text-[#0E3B3A] text-xs rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2F7D5B] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 2. Title & Tabs */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h1 className="font-editorial text-3xl font-semibold text-[#0E3B3A]">
            Saved Reserve
          </h1>
          <span className="text-xs font-mono-tabular text-[#78591b] uppercase tracking-wider">
            {simulateEmpty ? '0 Specimens' : '4 Specimens'}
          </span>
        </div>
        <p className="text-xs text-[#5E6663] max-w-lg">
          Archival items under provenance surveillance for limited release windows and valuation revisions.
        </p>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#0E3B3A] text-white'
                : 'bg-[#FAF8F5] border border-[#E3DDD0] text-[#717978] hover:text-[#0E3B3A]'
            }`}
          >
            All (4)
          </button>
          <button
            onClick={() => setActiveTab('reduced')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'reduced'
                ? 'bg-[#0E3B3A] text-white'
                : 'bg-[#FAF8F5] border border-[#E3DDD0] text-[#717978] hover:text-[#0E3B3A]'
            }`}
          >
            Price Reduced (2)
          </button>
          <button
            onClick={() => setActiveTab('low_reserve')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'low_reserve'
                ? 'bg-[#0E3B3A] text-white'
                : 'bg-[#FAF8F5] border border-[#E3DDD0] text-[#717978] hover:text-[#0E3B3A]'
            }`}
          >
            Low Reserve (1)
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'allocations'
                ? 'bg-[#0E3B3A] text-white'
                : 'bg-[#FAF8F5] border border-[#E3DDD0] text-[#717978] hover:text-[#0E3B3A]'
            }`}
          >
            Private Allocations
          </button>
        </div>
      </div>

      {simulateEmpty ? (
        <div className="p-12 text-center bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-3">
          <Bookmark className="w-8 h-8 text-[#717978] mx-auto" />
          <h3 className="font-editorial text-xl text-[#0E3B3A]">Vault Reserve Unpopulated</h3>
          <p className="text-xs text-[#5E6663] max-w-sm mx-auto">
            You currently have no pieces flagged for surveillance. Browse our curated editions to track valuation changes and kiln releases.
          </p>
          <button
            onClick={() => setSimulateEmpty(false)}
            className="px-5 py-2.5 bg-[#0E3B3A] text-white text-xs uppercase tracking-wider font-semibold rounded cursor-pointer mt-2"
          >
            Restore Saved Specimens
          </button>
        </div>
      ) : (
        <>
          {/* 3. Batch Action: Move Available to Bag */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E3DDD0] rounded flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#717978] font-semibold block">
                Batch Action
              </span>
              <span className="font-editorial text-lg font-semibold text-[#0E3B3A]">
                3 Available
              </span>
            </div>
            <button
              onClick={handleBatchMoveAvailable}
              className="py-2.5 px-4 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <ShoppingBag className="w-4 h-4 text-[#C9A25D]" />
              <span>Move Available to Bag</span>
            </button>
          </div>

          {/* 4. Specimen Cards List */}
          <div className="space-y-6">
            {/* Card 1: Monolithic Travertine Vessel N°03 */}
            {(activeTab === 'all' || activeTab === 'reduced') && (
              <div className="bg-[#FFFFFF] border border-[#E3DDD0] rounded overflow-hidden shadow-xs space-y-4">
                <div className="relative aspect-[4/3] bg-[#FAF8F5]">
                  <img
                    src="/src/assets/images/ozone_hero_luxury_living_1794146207794.jpg"
                    alt="Monolithic Travertine Vessel N°03"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2 py-0.5 bg-[#F5E6CA] text-[#78591b] border border-[#C9A25D]/40 rounded text-[9px] font-mono-tabular font-bold uppercase tracking-wider">
                      Price Drop -$250
                    </span>
                    <span className="px-2 py-0.5 bg-black/70 text-white rounded text-[9px] font-mono-tabular uppercase tracking-wider">
                      1 of 1 Edition
                    </span>
                  </div>
                  <button
                    onClick={() => toggleWishlist('prod-vane-01')}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded border border-[#E3DDD0] text-[#0E3B3A] cursor-pointer"
                    title="Remove"
                  >
                    <Bookmark className="w-4 h-4 fill-current text-[#C9A25D]" />
                  </button>
                </div>

                <div className="p-5 pt-0 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-[#717978]">
                    <span className="uppercase tracking-wider font-semibold text-[#0E3B3A]">
                      Atelier Vane • Paris
                    </span>
                    <span className="text-[#2F7D5B] font-semibold">Verified Origin</span>
                  </div>

                  <h3 className="font-editorial text-xl font-medium text-[#14181A]">
                    Monolithic Travertine Vessel N°03
                  </h3>

                  <div className="flex items-baseline justify-between border-t border-[#F0EBE0] pt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono-tabular text-lg font-bold text-[#0E3B3A]">
                        $1,450 <span className="text-xs font-normal text-[#717978]">USD</span>
                      </span>
                      <span className="font-mono-tabular text-xs text-[#717978] line-through">
                        $1,700
                      </span>
                    </div>
                    <span className="text-[10px] text-[#2F7D5B] font-mono-tabular font-semibold">
                      15% Reduction
                    </span>
                  </div>

                  <button
                    onClick={() => handleMoveToBag('prod-vane-01', 'var-vane-raw', 'Monolithic Travertine Vessel N°03')}
                    className="w-full py-2.5 px-4 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#C9A25D]" />
                    <span>Move to Bag • $1,450</span>
                  </button>
                </div>
              </div>
            )}

            {/* Card 2: Unbleached Wild-Spun Flax Kimono */}
            {(activeTab === 'all' || activeTab === 'low_reserve') && (
              <div className="bg-[#FFFFFF] border border-[#E3DDD0] rounded overflow-hidden shadow-xs space-y-4">
                <div className="relative aspect-[4/3] bg-[#FAF8F5]">
                  <img
                    src="/src/assets/images/product_cashmere_overcoat_1794146209378.jpg"
                    alt="Unbleached Wild-Spun Flax Kimono"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2 py-0.5 bg-[#FDF2F1] text-[#9A2E26] border border-[#F5C2BE] rounded text-[9px] font-mono-tabular font-bold uppercase tracking-wider">
                      Only 2 Left in Vault
                    </span>
                    <span className="px-2 py-0.5 bg-black/70 text-white rounded text-[9px] font-mono-tabular uppercase tracking-wider">
                      Edition of 6
                    </span>
                  </div>
                  <button
                    onClick={() => toggleWishlist('prod-silt-01')}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded border border-[#E3DDD0] text-[#0E3B3A] cursor-pointer"
                    title="Remove"
                  >
                    <Bookmark className="w-4 h-4 fill-current text-[#C9A25D]" />
                  </button>
                </div>

                <div className="p-5 pt-0 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-[#717978]">
                    <span className="uppercase tracking-wider font-semibold text-[#0E3B3A]">
                      Maison Silt • Kyoto
                    </span>
                    <span className="text-[#0E3B3A] font-semibold">Vault In-Stock</span>
                  </div>

                  <h3 className="font-editorial text-xl font-medium text-[#14181A]">
                    Unbleached Wild-Spun Flax Kimono
                  </h3>

                  <div className="flex items-baseline justify-between border-t border-[#F0EBE0] pt-2">
                    <span className="font-mono-tabular text-lg font-bold text-[#0E3B3A]">
                      $890 <span className="text-xs font-normal text-[#717978]">USD</span>
                    </span>
                    <span className="text-[11px] text-[#5E6663]">
                      Size II (Relaxed)
                    </span>
                  </div>

                  <button
                    onClick={() => handleMoveToBag('prod-silt-01', 'var-silt-ii', 'Unbleached Wild-Spun Flax Kimono')}
                    className="w-full py-2.5 px-4 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#C9A25D]" />
                    <span>Move to Bag • $890</span>
                  </button>
                </div>
              </div>
            )}

            {/* Card 3: Titanium Monolith Chronometer N°02 */}
            {(activeTab === 'all' || activeTab === 'reduced') && (
              <div className="bg-[#FFFFFF] border border-[#E3DDD0] rounded overflow-hidden shadow-xs space-y-4">
                <div className="relative aspect-[4/3] bg-[#FAF8F5]">
                  <img
                    src="/src/assets/images/product_minimalist_timepiece_1794146208921.jpg"
                    alt="Titanium Monolith Chronometer N°02"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2 py-0.5 bg-[#F5E6CA] text-[#78591b] border border-[#C9A25D]/40 rounded text-[9px] font-mono-tabular font-bold uppercase tracking-wider">
                      Price Drop -$400
                    </span>
                    <span className="px-2 py-0.5 bg-[#E8F3EE] text-[#0E3B3A] border border-[#C3DED3] rounded text-[9px] font-mono-tabular font-bold uppercase tracking-wider">
                      Certified Guild
                    </span>
                  </div>
                  <button
                    onClick={() => toggleWishlist('prod-homage-01')}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded border border-[#E3DDD0] text-[#0E3B3A] cursor-pointer"
                    title="Remove"
                  >
                    <Bookmark className="w-4 h-4 fill-current text-[#C9A25D]" />
                  </button>
                </div>

                <div className="p-5 pt-0 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-[#717978]">
                    <span className="uppercase tracking-wider font-semibold text-[#0E3B3A]">
                      Homage Atelier • Geneva
                    </span>
                    <span className="text-[#78591b] font-mono-tabular">Serial #04/20</span>
                  </div>

                  <h3 className="font-editorial text-xl font-medium text-[#14181A]">
                    Titanium Monolith Chronometer N°02
                  </h3>

                  <div className="flex items-baseline justify-between border-t border-[#F0EBE0] pt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono-tabular text-lg font-bold text-[#0E3B3A]">
                        $2,400 <span className="text-xs font-normal text-[#717978]">USD</span>
                      </span>
                      <span className="font-mono-tabular text-xs text-[#717978] line-through">
                        $2,800
                      </span>
                    </div>
                    <span className="text-[10px] text-[#78591b] font-mono-tabular font-semibold uppercase">
                      Privilege Valuation
                    </span>
                  </div>

                  <button
                    onClick={() => handleMoveToBag('prod-homage-01', 'var-homage-ti', 'Titanium Monolith Chronometer N°02')}
                    className="w-full py-2.5 px-4 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-wider font-semibold rounded flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#C9A25D]" />
                    <span>Move to Bag • $2,400</span>
                  </button>
                </div>
              </div>
            )}

            {/* Card 4: Subtractive Travertine Incense Bowl (Repose) */}
            {(activeTab === 'all' || activeTab === 'allocations') && (
              <div className="bg-[#FFFFFF] border border-[#E3DDD0] rounded overflow-hidden shadow-xs space-y-4">
                <div className="relative aspect-[4/3] bg-[#FAF8F5]">
                  <img
                    src="/src/assets/images/product_artisan_fragrance_1794146209043.jpg"
                    alt="Subtractive Travertine Incense Bowl"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 bg-[#ECE7DC] text-[#717978] border border-[#D5CEBF] rounded text-[9px] font-mono-tabular font-bold uppercase tracking-wider">
                      Vault Exhausted / In Repose
                    </span>
                  </div>
                  <button
                    onClick={() => toggleWishlist('prod-vane-02')}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded border border-[#E3DDD0] text-[#0E3B3A] cursor-pointer"
                    title="Remove"
                  >
                    <Bookmark className="w-4 h-4 fill-current text-[#C9A25D]" />
                  </button>
                </div>

                <div className="p-5 pt-0 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-[#717978]">
                    <span className="uppercase tracking-wider font-semibold text-[#0E3B3A]">
                      Atelier Vane • Paris
                    </span>
                    <span className="text-[#717978] font-mono-tabular">Archive State</span>
                  </div>

                  <h3 className="font-editorial text-xl font-medium text-[#14181A]">
                    Subtractive Travertine Incense Bowl
                  </h3>

                  <div className="flex items-baseline justify-between border-t border-[#F0EBE0] pt-2">
                    <span className="font-mono-tabular text-lg font-bold text-[#717978]">
                      $480 <span className="text-xs font-normal">USD</span>
                    </span>
                    <span className="text-[10px] text-[#78591b] font-mono-tabular font-semibold uppercase">
                      Next Kiln: Fall 2025
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      alert('You have been added to the priority notification ledger for the Fall 2025 kiln release.');
                    }}
                    className="w-full py-2.5 px-4 bg-[#FAF8F5] hover:bg-[#F0EBE0] border border-[#E3DDD0] text-[#0E3B3A] text-xs uppercase tracking-wider font-semibold rounded flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Bell className="w-4 h-4 text-[#C9A25D]" />
                    <span>Notify on Atelier Release</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 5. Curator Studio Controls */}
      <div className="p-6 bg-[#FAF8F5] border border-[#E3DDD0] rounded text-center space-y-3 shadow-xs">
        <div className="w-10 h-10 rounded-full bg-white border border-[#E3DDD0] text-[#0E3B3A] flex items-center justify-center mx-auto">
          <Sparkles className="w-5 h-5 text-[#C9A25D]" />
        </div>
        <h4 className="font-editorial text-lg text-[#0E3B3A]">
          Curator Studio Controls
        </h4>
        <p className="text-xs text-[#5E6663] max-w-sm mx-auto">
          Simulate an unpopulated archive state to inspect empty vault messaging and discovery queues.
        </p>
        <button
          onClick={() => setSimulateEmpty(!simulateEmpty)}
          className="px-5 py-2 bg-white hover:bg-[#F5F1E9] border border-[#E3DDD0] text-xs font-semibold text-[#0E3B3A] rounded cursor-pointer transition-colors shadow-2xs"
        >
          {simulateEmpty ? 'Show Populated Wishlist' : 'Simulate Empty Wishlist'}
        </button>
      </div>
    </div>
  );
};
