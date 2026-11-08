import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { ShoppingBag, Sparkles, ShieldCheck, Store, User, Clock, Bookmark, Layers, SlidersHorizontal, FileText } from 'lucide-react';
import { UserRole } from '../../types/marketplace';

interface HeaderProps {
  onOpenCart: () => void;
  onOpenConcurrencyLab: () => void;
  onOpenAuth: () => void;
  currentView: 'catalog' | 'orders' | 'wishlist';
  setCurrentView: (view: 'catalog' | 'orders' | 'wishlist') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCart,
  onOpenConcurrencyLab,
  onOpenAuth,
  currentView,
  setCurrentView,
}) => {
  const {
    currentRole,
    setCurrentRole,
    cart,
    reservationCountdown,
    wishlist,
    sellers,
    activeSellerId,
    setActiveSellerId,
  } = useMarketplace();

  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E3DDD0] px-4 sm:px-8 py-3 transition-colors shadow-2xs">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setCurrentRole('buyer');
                setCurrentView('catalog');
              }}
              className="text-left group cursor-pointer flex items-baseline gap-2"
            >
              <span className="font-editorial text-2xl lg:text-3xl font-normal tracking-[-0.02em] text-[#0E3B3A]">
                Ozone
              </span>
              <div className="hidden sm:block text-left border-l border-[#E3DDD0] pl-2.5">
                <span className="text-[9px] uppercase tracking-[0.16em] font-bold text-[#0E3B3A] block leading-none">
                  Ozone
                </span>
                <span className="text-[8px] uppercase tracking-[0.14em] text-[#717978] block leading-none mt-0.5">
                  Archival Commerce
                </span>
              </div>
            </button>
          </div>

          {/* Center Navigation Breadcrumbs matching Stitch */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#717978]">
            <button
              onClick={() => {
                setCurrentRole('buyer');
                setCurrentView('catalog');
              }}
              className={`transition-colors cursor-pointer pb-0.5 border-b-2 ${
                currentRole === 'buyer' && currentView === 'catalog'
                  ? 'text-[#0E3B3A] border-[#0E3B3A]'
                  : 'border-transparent hover:text-[#0E3B3A]'
              }`}
            >
              Curation
            </button>

            <span className="text-[#E3DDD0] font-light">/</span>

            <button
              onClick={() => setCurrentRole('seller')}
              className={`transition-colors cursor-pointer pb-0.5 border-b-2 ${
                currentRole === 'seller'
                  ? 'text-[#0E3B3A] border-[#0E3B3A]'
                  : 'border-transparent hover:text-[#0E3B3A]'
              }`}
            >
              Atelier
            </button>

            <span className="text-[#E3DDD0] font-light">/</span>

            <button
              onClick={() => setCurrentRole('admin')}
              className={`transition-colors cursor-pointer pb-0.5 border-b-2 ${
                currentRole === 'admin'
                  ? 'text-[#0E3B3A] border-[#0E3B3A]'
                  : 'border-transparent hover:text-[#0E3B3A]'
              }`}
            >
              Control Room
            </button>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3 shrink-0">
            {/* 10-Minute Escrow Lock Indicator */}
            {reservationCountdown > 0 && (
              <div
                onClick={onOpenCart}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#E8F3EE] border border-[#C3DED3] rounded text-[11px] text-[#0E3B3A] cursor-pointer"
                title="10-minute escrow reservation active"
              >
                <Clock className="w-3.5 h-3.5 text-[#C9A25D] animate-spin-slow" />
                <span className="font-mono-tabular font-bold">
                  {formatTime(reservationCountdown)}
                </span>
              </div>
            )}

            {/* Concurrency Lab Button */}
            <button
              onClick={onOpenConcurrencyLab}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FAF8F5] border border-[#E3DDD0] hover:border-[#0E3B3A] rounded text-[11px] font-semibold text-[#0E3B3A] transition-colors cursor-pointer"
              title="Open Concurrency Stress Simulator"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C9A25D]" />
              <span className="uppercase tracking-wider">Concurrency Lab</span>
            </button>

            {/* Saved Reserve / Wishlist Icon */}
            <button
              onClick={() => {
                setCurrentRole('buyer');
                setCurrentView('wishlist');
              }}
              className="relative p-2 text-[#5E6663] hover:text-[#0E3B3A] rounded border border-[#E3DDD0] bg-[#FFFFFF] hover:border-[#0E3B3A] transition-colors cursor-pointer"
              title="Saved Reserve"
            >
              <Bookmark className={`w-4 h-4 ${wishlist.length > 0 ? 'fill-current text-[#C9A25D]' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0E3B3A] text-white text-[9px] font-mono-tabular font-bold flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Bag Button */}
            <button
              onClick={onOpenCart}
              className="relative p-2 text-[#5E6663] hover:text-[#0E3B3A] rounded border border-[#E3DDD0] bg-[#FFFFFF] hover:border-[#0E3B3A] transition-colors cursor-pointer flex items-center gap-1"
              title="Acquisition Salon (Bag)"
            >
              <ShoppingBag className="w-4 h-4 text-[#0E3B3A]" />
              <span className="font-mono-tabular text-xs font-bold text-[#0E3B3A]">
                {cartTotalItems < 10 ? `0${cartTotalItems}` : cartTotalItems}
              </span>
            </button>

            {/* Account / User Avatar */}
            <button
              onClick={onOpenAuth}
              className="w-8 h-8 rounded-full bg-[#0E3B3A] text-white flex items-center justify-center text-xs font-serif font-bold cursor-pointer hover:ring-2 hover:ring-[#C9A25D] transition-all"
              title="Authentication & Sovereign Profile"
            >
              JS
            </button>
          </div>
        </div>
      </header>

      {/* Luxury Bottom Navigation Bar matching Stitch Screens */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E3DDD0] py-2 px-4 flex items-center justify-around shadow-[0_-4px_16px_rgba(20,24,26,0.06)] md:hidden">
        <button
          onClick={() => {
            setCurrentRole('buyer');
            setCurrentView('catalog');
          }}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            currentRole === 'buyer' && currentView === 'catalog' ? 'text-[#0E3B3A]' : 'text-[#717978]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[9px] font-semibold uppercase tracking-wider">Curations</span>
        </button>

        <button
          onClick={() => setCurrentRole('seller')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            currentRole === 'seller' ? 'text-[#0E3B3A]' : 'text-[#717978]'
          }`}
        >
          <Store className="w-4 h-4" />
          <span className="text-[9px] font-semibold uppercase tracking-wider">Atelier</span>
        </button>

        <button
          onClick={() => {
            setCurrentRole('buyer');
            setCurrentView('orders');
          }}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            currentView === 'orders' ? 'text-[#0E3B3A]' : 'text-[#717978]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="text-[9px] font-semibold uppercase tracking-wider">Orders</span>
        </button>

        <button
          onClick={() => setCurrentRole('admin')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            currentRole === 'admin' ? 'text-[#0E3B3A]' : 'text-[#717978]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[9px] font-semibold uppercase tracking-wider">Admin</span>
        </button>

        <button
          onClick={onOpenAuth}
          className="flex flex-col items-center gap-0.5 cursor-pointer text-[#717978] hover:text-[#0E3B3A]"
        >
          <User className="w-4 h-4" />
          <span className="text-[9px] font-semibold uppercase tracking-wider">Account</span>
        </button>
      </div>
    </>
  );
};
