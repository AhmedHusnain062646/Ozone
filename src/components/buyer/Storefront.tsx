import React, { useState, useMemo } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Product } from '../../types/marketplace';
import { Search, SlidersHorizontal, Heart, Sparkles, Star, ArrowUpRight, ShieldCheck, Clock } from 'lucide-react';

interface StorefrontProps {
  onSelectProduct: (product: Product) => void;
  onOpenConcurrencyLab: () => void;
  onOpenCart: () => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  onSelectProduct,
  onOpenConcurrencyLab,
  onOpenCart,
}) => {
  const { products, sellers, addToCart, wishlist, toggleWishlist } = useMarketplace();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'curated' | 'price-asc' | 'price-desc' | 'rating'>('curated');
  const [maxPrice, setMaxPrice] = useState<number>(3000);
  const [showFilters, setShowFilters] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Autocomplete suggestions
  const autocompleteSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const matches: { type: 'product' | 'atelier' | 'category'; label: string; item?: Product }[] = [];

    products.forEach(p => {
      if (p.title.toLowerCase().includes(q)) {
        matches.push({ type: 'product', label: p.title, item: p });
      }
    });

    sellers.forEach(s => {
      if (s.name.toLowerCase().includes(q)) {
        matches.push({ type: 'atelier', label: `${s.name} (Atelier)` });
      }
    });

    ['Timepieces', 'Interiors', 'Fragrance', 'Fashion', 'Art & Objects'].forEach(c => {
      if (c.toLowerCase().includes(q)) {
        matches.push({ type: 'category', label: `${c} Category` });
      }
    });

    return matches.slice(0, 5);
  }, [searchQuery, products, sellers]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        if (!p.isPublished) return false;
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (selectedSeller !== 'all' && p.sellerId !== selectedSeller) return false;
        if (p.basePrice > maxPrice) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const seller = sellers.find(s => s.id === p.sellerId);
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchDesc = p.shortDescription.toLowerCase().includes(q);
          const matchSeller = seller?.name.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchSeller) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.basePrice - b.basePrice;
        if (sortBy === 'price-desc') return b.basePrice - a.basePrice;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0; // curated order
      });
  }, [products, selectedCategory, selectedSeller, maxPrice, searchQuery, sortBy, sellers]);

  const categories = [
    'all',
    'Timepieces',
    'Interiors',
    'Fragrance',
    'Fashion',
  ];

  return (
    <div className="space-y-16">
      {/* 1. Hero Campaign Section */}
      <section className="relative px-6 lg:px-12 pt-8 pb-12">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Text Narrative (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-2 text-xs text-[#5E6663]">
              <span className="text-[#0E3B3A] font-semibold uppercase tracking-[0.12em] text-[11px]">
                Volume IV · Autumn Winter
              </span>
              <span>·</span>
              <span>Autonomous Ateliers</span>
            </div>

            <h1 className="font-editorial text-4xl lg:text-6xl text-[#0E3B3A] leading-[1.1] tracking-[-0.02em] text-balance">
              The Architecture of Living Objects.
            </h1>

            <p className="text-[#5E6663] text-base lg:text-lg leading-relaxed max-w-xl">
              An ensemble of accredited independent workshops presenting numbered chronographs, solid timber joinery, and pure botanical distillations directly to patrons.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="#catalog-grid"
                className="px-6 py-3.5 bg-[#0E3B3A] hover:bg-[#164C4B] text-white text-xs uppercase tracking-[0.12em] font-semibold rounded transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Catalog</span>
                <ArrowUpRight className="w-4 h-4 text-[#C9A25D]" />
              </a>

              <button
                onClick={onOpenConcurrencyLab}
                className="px-6 py-3.5 bg-transparent border border-[#E3DDD0] hover:border-[#14181A] hover:bg-[#FFFFFF] text-[#14181A] text-xs uppercase tracking-[0.12em] font-semibold rounded transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#C9A25D]" />
                <span>Concurrency Lab</span>
              </button>
            </div>

            {/* Micro proof telemetry */}
            <div className="pt-4 border-t border-[#E3DDD0] flex items-center gap-8 text-xs text-[#5E6663]">
              <div>
                <span className="font-mono-tabular font-medium text-sm text-[#14181A] block">
                  100%
                </span>
                <span>Atomic Concurrency</span>
              </div>
              <div>
                <span className="font-mono-tabular font-medium text-sm text-[#14181A] block">
                  10 Min
                </span>
                <span>Guaranteed Cart Hold</span>
              </div>
              <div>
                <span className="font-mono-tabular font-medium text-sm text-[#14181A] block">
                  Zero
                </span>
                <span>Oversold Inventory</span>
              </div>
            </div>
          </div>

          {/* Right Hero Image (6 cols) */}
          <div className="lg:col-span-6">
            <div className="relative border border-[#E3DDD0] rounded overflow-hidden bg-[#FAF8F5] shadow-[0_8px_32px_rgba(20,24,26,0.06)]">
              <img
                src="/src/assets/images/ozone_hero_luxury_living_1794146207794.jpg"
                alt="Minimalist luxury interior with sculptural lounge chair and plinth"
                className="w-full aspect-[16/10] object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-4 left-4 right-4 p-3.5 bg-white/90 backdrop-blur-xs border border-[#E3DDD0] rounded flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#5E6663] block">
                    Featured Edition
                  </span>
                  <span className="font-editorial text-sm text-[#0E3B3A]">
                    Vandkær Sculptural Walnut Lounge
                  </span>
                </div>
                <span className="font-mono-tabular text-sm font-semibold text-[#C9A25D]">
                  $2,400
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Catalog & Discovery Toolbar */}
      <section id="catalog-grid" className="px-6 lg:px-12">
        <div className="max-w-[1440px] mx-auto space-y-8">
          {/* Category Tabs */}
          <div className="flex items-center justify-between border-b border-[#E3DDD0] pb-4 flex-wrap gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map(cat => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 text-xs uppercase tracking-[0.1em] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[#0E3B3A] text-white'
                        : 'bg-transparent text-[#5E6663] hover:text-[#0E3B3A] hover:bg-[#FFFFFF]'
                    }`}
                  >
                    {cat === 'all' ? 'All Editions' : cat}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3.5 py-2 border border-[#E3DDD0] hover:border-[#0E3B3A] rounded text-xs text-[#0E3B3A] flex items-center gap-2 cursor-pointer bg-[#FFFFFF] transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters & Sorting</span>
            </button>
          </div>

          {/* Search bar with Autocomplete */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#5E6663] absolute left-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by timepiece, atelier name, material (titanium, walnut, amber)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                className="w-full pl-11 pr-4 py-3 bg-[#FFFFFF] border border-[#E3DDD0] focus:border-[#0E3B3A] rounded text-xs text-[#14181A] outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 text-xs text-[#5E6663] hover:text-[#14181A]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {searchFocused && autocompleteSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-[#FFFFFF] border border-[#E3DDD0] rounded shadow-[0_8px_32px_rgba(20,24,26,0.1)] z-30 py-2">
                <span className="px-4 py-1 text-[10px] uppercase tracking-wider text-[#5E6663] block">
                  Suggested Matches
                </span>
                {autocompleteSuggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (sug.item) {
                        onSelectProduct(sug.item);
                      } else {
                        setSearchQuery(sug.label.replace(' (Atelier)', '').replace(' Category', ''));
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-[#FAF8F5] flex items-center justify-between text-[#14181A]"
                  >
                    <span>{sug.label}</span>
                    <span className="text-[10px] uppercase font-mono-tabular text-[#C9A25D]">
                      {sug.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expandable Filter & Sorting Drawer */}
          {showFilters && (
            <div className="p-6 bg-[#FFFFFF] border border-[#E3DDD0] rounded grid grid-cols-1 md:grid-cols-3 gap-6 text-xs animate-in fade-in duration-150">
              {/* Atelier Filter */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#5E6663] font-semibold block mb-2">
                  Atelier Workshop
                </label>
                <select
                  value={selectedSeller}
                  onChange={e => setSelectedSeller(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#E3DDD0] rounded text-[#14181A]"
                >
                  <option value="all">All Ateliers</option>
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Ceiling */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] uppercase tracking-wider text-[#5E6663] font-semibold">
                    Maximum Valuation
                  </label>
                  <span className="font-mono-tabular font-medium text-[#C9A25D]">
                    ${maxPrice.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={3000}
                  step={100}
                  value={maxPrice}
                  onChange={e => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#0E3B3A]"
                />
              </div>

              {/* Sorting */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#5E6663] font-semibold block mb-2">
                  Catalog Order
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#E3DDD0] rounded text-[#14181A]"
                >
                  <option value="curated">Curated Editorial Order</option>
                  <option value="price-asc">Valuation: Low to High</option>
                  <option value="price-desc">Valuation: High to Low</option>
                  <option value="rating">Patron Rating (5 Stars First)</option>
                </select>
              </div>
            </div>
          )}

          {/* Results Count & Current Filter Indicators */}
          <div className="flex items-center justify-between text-xs text-[#5E6663]">
            <span>
              Showing {filteredProducts.length} edition{filteredProducts.length === 1 ? '' : 's'}
            </span>
            {(selectedCategory !== 'all' || selectedSeller !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedSeller('all');
                  setSearchQuery('');
                  setMaxPrice(3000);
                }}
                className="text-[#0E3B3A] underline cursor-pointer"
              >
                Reset all filters
              </button>
            )}
          </div>

          {/* 3. Product Cards Grid (3 Columns on Desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map(product => {
              const seller = sellers.find(s => s.id === product.sellerId);
              const defaultVariant = product.variants[0];
              const availableUnits = defaultVariant
                ? Math.max(0, defaultVariant.stock - defaultVariant.reservedStock)
                : 0;
              const isWishlisted = wishlist.includes(product.id);

              return (
                <div
                  key={product.id}
                  className="group bg-[#FFFFFF] border border-[#E3DDD0] rounded overflow-hidden flex flex-col justify-between transition-colors hover:border-[#14181A]"
                >
                  {/* Card Image Area with uncropped 4:3 ratio */}
                  <div className="relative aspect-[4/3] bg-[#FAF8F5] overflow-hidden">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />

                    {/* Wishlist toggle */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleWishlist(product.id);
                      }}
                      className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded border border-[#E3DDD0] text-[#5E6663] hover:text-[#C9A25D] transition-colors cursor-pointer"
                      title="Add to Wishlist"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isWishlisted ? 'text-[#C9A25D] fill-current' : ''
                        }`}
                      />
                    </button>

                    {/* Limited edition or low-stock indicator */}
                    {availableUnits <= 2 && availableUnits > 0 && (
                      <span className="absolute bottom-3 left-3 text-[10px] uppercase font-mono-tabular tracking-wider px-2 py-0.5 bg-[#FFFFFF]/95 border border-[#E3DDD0] text-[#B5483C] rounded font-medium">
                        Only {availableUnits} Remaining
                      </span>
                    )}

                    {availableUnits === 0 && (
                      <span className="absolute bottom-3 left-3 text-[10px] uppercase font-mono-tabular tracking-wider px-2 py-0.5 bg-[#14181A]/95 text-white rounded font-medium">
                        Allocation Exhausted
                      </span>
                    )}
                  </div>

                  {/* Card Content Area */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      {/* Zero-pill metadata */}
                      <div className="flex items-center gap-2 text-xs text-[#5E6663]">
                        <span>{product.category}</span>
                        <span>·</span>
                        <span>{seller?.name}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-[#C9A25D]">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{product.rating}</span>
                        </span>
                      </div>

                      <h3
                        onClick={() => onSelectProduct(product)}
                        className="font-editorial text-lg text-[#14181A] hover:text-[#0E3B3A] cursor-pointer transition-colors leading-snug"
                      >
                        {product.title}
                      </h3>

                      <p className="text-xs text-[#5E6663] line-clamp-2 leading-relaxed">
                        {product.shortDescription}
                      </p>
                    </div>

                    {/* Valuation & Action Bar */}
                    <div className="pt-3 border-t border-[#E3DDD0] flex items-center justify-between">
                      <div>
                        <span className="font-mono-tabular text-lg font-normal text-[#C9A25D] block">
                          ${product.basePrice.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#5E6663] font-mono-tabular">
                          {defaultVariant?.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectProduct(product)}
                          className="px-3.5 py-2 text-xs border border-[#E3DDD0] hover:border-[#14181A] text-[#14181A] rounded transition-colors cursor-pointer"
                        >
                          Details
                        </button>

                        <button
                          onClick={() => {
                            if (defaultVariant && availableUnits > 0) {
                              addToCart(product.id, defaultVariant.id, 1);
                              onOpenCart();
                            } else {
                              onSelectProduct(product);
                            }
                          }}
                          disabled={availableUnits <= 0}
                          className="px-4 py-2 bg-[#0E3B3A] hover:bg-[#164C4B] disabled:bg-[#d4dcd8] text-white text-xs font-semibold rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          {availableUnits > 0 ? 'Reserve' : 'Exhausted'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-12 text-center bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-3">
              <p className="font-editorial text-xl text-[#14181A]">No curated editions found</p>
              <p className="text-xs text-[#5E6663]">
                Try adjusting your search criteria or resetting filters.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Atelier Spotlight Directory */}
      <section className="px-6 lg:px-12 py-12 bg-[#FAF8F5] border-y border-[#E3DDD0]">
        <div className="max-w-[1440px] mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#0E3B3A] block mb-1">
                Direct Atelier Provenance
              </span>
              <h2 className="font-editorial text-3xl text-[#0E3B3A]">
                The Guild of Independent Makers
              </h2>
            </div>
            <p className="text-xs text-[#5E6663] max-w-md">
              Each workshop sets its own material standards, ships directly from its regional atelier, and receives automated split payouts upon completed delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sellers.filter(s => s.status === 'active').map(seller => (
              <div
                key={seller.id}
                className="p-5 bg-[#FFFFFF] border border-[#E3DDD0] rounded space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-tabular text-[#C9A25D] text-[11px]">
                      ★ {seller.rating}
                    </span>
                    <span className="text-[10px] text-[#5E6663] font-mono-tabular">
                      {seller.totalSalesCount} Editions Placed
                    </span>
                  </div>

                  <h3 className="font-editorial text-lg text-[#0E3B3A]">
                    {seller.name}
                  </h3>

                  <p className="text-xs text-[#5E6663] leading-relaxed">
                    {seller.tagline}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E3DDD0] flex items-center justify-between text-[11px] text-[#5E6663]">
                  <span>Origin: {seller.location}</span>
                  <span className="text-[#2F7D5B] font-medium">Verified Atelier</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
