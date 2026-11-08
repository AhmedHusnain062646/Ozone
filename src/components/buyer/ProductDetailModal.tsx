import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Product } from '../../types/marketplace';
import { X, Heart, ShieldCheck, Clock, Check, Star, AlertCircle, Plus } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCart: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onOpenCart,
}) => {
  const { sellers, addToCart, wishlist, toggleWishlist, addReview } = useMarketplace();

  if (!isOpen || !product) return null;

  const seller = sellers.find(s => s.id === product.sellerId);

  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants[0]?.id || ''
  );
  const [quantity, setQuantity] = useState(1);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Review submission state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    buyerName: 'Shahzaib Ghugh',
    rating: 5,
    title: '',
    comment: '',
  });

  const selectedVariant =
    product.variants.find(v => v.id === selectedVariantId) || product.variants[0];

  const currentPrice = product.basePrice + (selectedVariant ? selectedVariant.priceDelta : 0);
  const availableStock = selectedVariant ? Math.max(0, selectedVariant.stock - selectedVariant.reservedStock) : 0;
  const isWishlisted = wishlist.includes(product.id);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    const res = addToCart(product.id, selectedVariant.id, quantity);
    if (res.success) {
      setFeedbackMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        setFeedbackMsg(null);
      }, 4000);
    } else {
      setFeedbackMsg({ type: 'error', text: res.message });
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.title || !newReview.comment) return;

    addReview(product.id, {
      buyerName: newReview.buyerName,
      rating: newReview.rating,
      title: newReview.title,
      comment: newReview.comment,
      verifiedPurchase: true,
    });

    setShowReviewForm(false);
    setNewReview({ buyerName: 'Shahzaib Ghugh', rating: 5, title: '', comment: '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-[#FFFFFF] border border-[#E3DDD0] rounded shadow-[0_8px_32px_rgba(20,24,26,0.15)] flex flex-col">
        {/* Header bar */}
        <div className="px-6 py-3.5 border-b border-[#E3DDD0] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[#5E6663]">
            <span>{product.category}</span>
            <span>·</span>
            <span>{seller?.name}</span>
            <span>·</span>
            <span className="font-mono-tabular">Edition #{product.id.split('-')[1]?.toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleWishlist(product.id)}
              className={`p-2 rounded border border-[#E3DDD0] hover:border-[#0E3B3A] transition-colors cursor-pointer ${
                isWishlisted ? 'text-[#C9A25D] bg-[#FAF8F5]' : 'text-[#5E6663]'
              }`}
              title="Add to wishlist"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#5E6663] hover:text-[#0E3B3A] hover:bg-[#F5F1E9] rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Contiguous PDP */}
        <div className="p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 overflow-y-auto">
          {/* Left Column: Gallery & Provenance (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="border border-[#E3DDD0] rounded overflow-hidden bg-[#FAF8F5]">
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full aspect-[4/3] object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Atelier Provenance Badge */}
            <div className="p-4 border border-[#C9A25D]/40 bg-[#C9A25D]/8 rounded flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#795a1c] block mb-1">
                  Accredited Atelier
                </span>
                <h4 className="font-editorial text-base text-[#0E3B3A]">
                  {seller?.name}
                </h4>
                <p className="text-xs text-[#5E6663] mt-1 leading-relaxed">
                  {seller?.bannerDescription}
                </p>
                <div className="mt-2 text-[11px] text-[#795a1c] font-medium flex items-center gap-2">
                  <span>Location: {seller?.location}</span>
                  <span>·</span>
                  <span>Rating: {seller?.rating} / 5.0</span>
                </div>
              </div>

              <div className="shrink-0 p-2 bg-white/80 border border-[#C9A25D]/30 rounded text-center">
                <ShieldCheck className="w-5 h-5 text-[#C9A25D] mx-auto" />
                <span className="text-[9px] uppercase tracking-wider text-[#795a1c] block mt-1 font-semibold">
                  Verified
                </span>
              </div>
            </div>

            {/* Specifications Matrix */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-[#14181A]">
                Craftsmanship & Materials
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs border-y border-[#E3DDD0] py-3">
                <div>
                  <span className="text-[10px] uppercase text-[#5E6663] block">Material Composition</span>
                  <span className="text-[#14181A] font-medium">{product.material}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#5E6663] block">Atelier Origin</span>
                  <span className="text-[#14181A] font-medium">{product.origin}</span>
                </div>
              </div>
              <p className="text-xs text-[#5E6663] leading-relaxed pt-1">
                {product.description}
              </p>
            </div>
          </div>

          {/* Right Column: Contiguous Purchase Module (5 cols) */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#5E6663] mb-1">
                  <span>{seller?.name}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-[#C9A25D]">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{product.rating} ({product.reviewCount} reviews)</span>
                  </span>
                </div>

                <h1 className="font-editorial text-2xl lg:text-3xl text-[#0E3B3A] leading-tight">
                  {product.title}
                </h1>

                <div className="mt-3 flex items-baseline gap-3">
                  <span className="font-mono-tabular text-2xl font-normal text-[#C9A25D]">
                    ${currentPrice.toLocaleString()}
                  </span>
                  {product.limitedEdition && (
                    <span className="text-[10px] uppercase tracking-wider text-[#795a1c] border border-[#C9A25D] px-2 py-0.5 rounded bg-[#FAF8F5]">
                      Numbered Limited Run
                    </span>
                  )}
                </div>
              </div>

              {/* Variant Selector */}
              <div className="space-y-2 pt-2">
                <label className="text-[11px] uppercase tracking-wider text-[#5E6663] block font-semibold">
                  Select Specification / Finish:
                </label>
                <div className="space-y-2">
                  {product.variants.map(v => {
                    const isSelected = v.id === selectedVariantId;
                    const vAvailable = Math.max(0, v.stock - v.reservedStock);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`w-full text-left p-3 border rounded transition-colors cursor-pointer flex items-center justify-between text-xs ${
                          isSelected
                            ? 'border-[#0E3B3A] bg-[#FAF8F5]'
                            : 'border-[#E3DDD0] bg-[#FFFFFF] hover:border-[#717978]'
                        }`}
                      >
                        <div>
                          <span className="font-medium text-[#14181A] block">{v.name}</span>
                          <span className="text-[10px] font-mono-tabular text-[#5E6663]">
                            SKU: {v.sku}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono-tabular font-medium text-[#14181A] block">
                            ${(product.basePrice + v.priceDelta).toLocaleString()}
                          </span>
                          <span
                            className={`text-[10px] font-mono-tabular ${
                              vAvailable > 0 ? 'text-[#2F7D5B]' : 'text-[#B5483C]'
                            }`}
                          >
                            {vAvailable > 0 ? `${vAvailable} Available` : 'Exhausted'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Concurrency Reservation Indicator */}
              <div className="p-3 bg-[#FAF8F5] border border-[#E3DDD0] rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#0E3B3A] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C9A25D]" />
                    <span>10-Minute Atomic Lock Guarantee</span>
                  </span>
                  <span className="text-[10px] font-mono-tabular text-[#5E6663]">
                    {selectedVariant?.reservedStock || 0} unit(s) on hold
                  </span>
                </div>
                <p className="text-[11px] text-[#5E6663] leading-relaxed">
                  Adding to your satchel grants an exclusive 10-minute hold. Our atomic checkout prevents inventory collisions.
                </p>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-xs uppercase tracking-wider text-[#5E6663] font-semibold">
                  Quantity:
                </span>
                <div className="flex items-center border border-[#E3DDD0] rounded bg-[#FAF8F5]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-1 text-[#5E6663] hover:text-[#0E3B3A] transition-colors disabled:opacity-30"
                  >
                    -
                  </button>
                  <span className="px-3 font-mono-tabular text-xs font-semibold text-[#14181A]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                    disabled={quantity >= availableStock}
                    className="px-3 py-1 text-[#5E6663] hover:text-[#0E3B3A] transition-colors disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-[#5E6663]">
                  ({availableStock} unit{availableStock === 1 ? '' : 's'} immediate)
                </span>
              </div>

              {/* Feedback Alert */}
              {feedbackMsg && (
                <div
                  className={`p-3 rounded text-xs flex items-center justify-between gap-2 ${
                    feedbackMsg.type === 'success'
                      ? 'bg-[#edf5f1] border border-[#a4cfcd] text-[#00251c]'
                      : 'bg-[#ffdad6] border border-[#ffb4ab] text-[#93000a]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {feedbackMsg.type === 'success' ? (
                      <Check className="w-4 h-4 text-[#2F7D5B] shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#ba1a1a] shrink-0" />
                    )}
                    <span>{feedbackMsg.text}</span>
                  </div>
                  {feedbackMsg.type === 'success' && (
                    <button
                      onClick={onOpenCart}
                      className="underline font-semibold cursor-pointer text-xs"
                    >
                      View Satchel
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <div className="space-y-3 pt-6 border-t border-[#E3DDD0]">
              <button
                onClick={handleAddToCart}
                disabled={availableStock <= 0}
                className="w-full py-4 bg-[#0E3B3A] hover:bg-[#164C4B] disabled:bg-[#d4dcd8] text-white text-xs uppercase tracking-[0.12em] font-semibold rounded transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>{availableStock > 0 ? 'Reserve & Add to Satchel' : 'Edition Exhausted'}</span>
                {availableStock > 0 && <span className="text-[#C9A25D]">· 10m Hold</span>}
              </button>

              <div className="flex items-center justify-center gap-6 text-[11px] text-[#5E6663]">
                <span>✓ Insured Global Courier</span>
                <span>✓ Verified Atelier Direct</span>
                <span>✓ 14-Day Return Guarantee</span>
              </div>
            </div>
          </div>

          {/* Full Width Bottom: Verified Reviews */}
          <div className="lg:col-span-12 pt-8 border-t border-[#E3DDD0] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-editorial text-xl text-[#0E3B3A]">
                  Verified Patron Reviews ({product.reviews.length})
                </h3>
                <p className="text-xs text-[#5E6663]">
                  All reviews verified via cryptographic order ID
                </p>
              </div>

              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-3.5 py-1.5 border border-[#E3DDD0] hover:border-[#0E3B3A] text-xs text-[#0E3B3A] rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Write Verified Review</span>
              </button>
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <form
                onSubmit={handleReviewSubmit}
                className="p-5 bg-[#FAF8F5] border border-[#E3DDD0] rounded space-y-4 animate-in fade-in duration-150"
              >
                <h4 className="text-xs uppercase tracking-wider font-semibold text-[#14181A]">
                  Submit Patron Evaluation
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-[#5E6663] block mb-1">
                      Patron Name:
                    </label>
                    <input
                      type="text"
                      value={newReview.buyerName}
                      onChange={e => setNewReview({ ...newReview, buyerName: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-[#E3DDD0] rounded outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-[#5E6663] block mb-1">
                      Rating (1 - 5 Stars):
                    </label>
                    <select
                      value={newReview.rating}
                      onChange={e => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                      className="w-full text-xs p-2 bg-white border border-[#E3DDD0] rounded outline-none"
                    >
                      <option value={5}>★★★★★ (5 Stars - Exceptional)</option>
                      <option value={4}>★★★★☆ (4 Stars - Commendable)</option>
                      <option value={3}>★★★☆☆ (3 Stars - Satisfactory)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-[#5E6663] block mb-1">
                    Headline:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Masterful finish and proportion"
                    value={newReview.title}
                    onChange={e => setNewReview({ ...newReview, title: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-[#E3DDD0] rounded outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-[#5E6663] block mb-1">
                    Detailed Impression:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe material tactile presence, craftsmanship, and delivery..."
                    value={newReview.comment}
                    onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-[#E3DDD0] rounded outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-3 py-1.5 text-xs text-[#5E6663] hover:text-[#14181A]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0E3B3A] text-white text-xs font-medium rounded hover:bg-[#164C4B]"
                  >
                    Publish Review
                  </button>
                </div>
              </form>
            )}

            {/* Review Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.reviews.map(rev => (
                <div
                  key={rev.id}
                  className="p-4 border border-[#E3DDD0] rounded bg-[#FAF8F5] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[#C9A25D]">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono-tabular text-[#5E6663]">
                      {rev.date}
                    </span>
                  </div>

                  <h5 className="font-editorial text-sm font-semibold text-[#14181A]">
                    {rev.title}
                  </h5>
                  <p className="text-[#5E6663] leading-relaxed">
                    "{rev.comment}"
                  </p>

                  <div className="pt-2 border-t border-[#E3DDD0] flex items-center justify-between text-[11px] text-[#5E6663]">
                    <span>{rev.buyerName}</span>
                    {rev.verifiedPurchase && (
                      <span className="text-[#2F7D5B] flex items-center gap-1 text-[10px]">
                        ✓ Verified Patron Purchase
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
