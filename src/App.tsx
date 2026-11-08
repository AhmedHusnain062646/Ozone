import React, { useState } from 'react';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { Storefront } from './components/buyer/Storefront';
import { ProductDetailModal } from './components/buyer/ProductDetailModal';
import { CartDrawer } from './components/buyer/CartDrawer';
import { CheckoutModal } from './components/buyer/CheckoutModal';
import { OrderTrackingView } from './components/buyer/OrderTrackingView';
import { WishlistView } from './components/buyer/WishlistView';
import { SellerDashboard } from './components/seller/SellerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ConcurrencyLabModal } from './components/concurrency/ConcurrencyLabModal';
import { AuthenticationModal } from './components/auth/AuthenticationModal';
import { Product } from './types/marketplace';
import { CheckCircle2 } from 'lucide-react';

const MarketplaceApp: React.FC = () => {
  const { currentRole } = useMarketplace();

  // Navigation state
  const [currentView, setCurrentView] = useState<'catalog' | 'orders' | 'wishlist'>('catalog');

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isConcurrencyLabOpen, setIsConcurrencyLabOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [orderConfirmationId, setOrderConfirmationId] = useState<string | null>(null);

  const handleOrderSuccess = (orderId: string) => {
    setOrderConfirmationId(orderId);
    setCurrentView('orders');
    setTimeout(() => {
      setOrderConfirmationId(null);
    }, 6000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F1E9] text-[#14181A] pb-14 md:pb-0">
      {/* Top Header */}
      <Header
        onOpenCart={() => setIsCartOpen(true)}
        onOpenConcurrencyLab={() => setIsConcurrencyLabOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      {/* Order Confirmation Toast */}
      {orderConfirmationId && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-[#FFFFFF] border border-[#0E3B3A] rounded shadow-lg flex items-start gap-3 animate-in slide-in-from-top-4 duration-200 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-[#2F7D5B] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-editorial text-sm font-semibold text-[#0E3B3A]">
              Order Placed & Partitioned
            </h4>
            <p className="text-[#5E6663]">
              Parent order <code className="font-mono-tabular font-medium text-[#14181A]">{orderConfirmationId}</code> created. Split sub-orders dispatched to individual ateliers.
            </p>
          </div>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1">
        {currentRole === 'buyer' && (
          <>
            {currentView === 'catalog' && (
              <Storefront
                onSelectProduct={prod => setSelectedProduct(prod)}
                onOpenConcurrencyLab={() => setIsConcurrencyLabOpen(true)}
                onOpenCart={() => setIsCartOpen(true)}
              />
            )}

            {currentView === 'orders' && <OrderTrackingView />}

            {currentView === 'wishlist' && (
              <WishlistView
                onSelectProduct={prod => setSelectedProduct(prod)}
                onOpenCart={() => setIsCartOpen(true)}
                onBrowseCatalog={() => setCurrentView('catalog')}
              />
            )}
          </>
        )}

        {currentRole === 'seller' && <SellerDashboard />}

        {currentRole === 'admin' && <AdminDashboard />}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenCart={() => {
          setSelectedProduct(null);
          setIsCartOpen(true);
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOpenCheckout={() => setIsCheckoutOpen(true)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
      />

      <ConcurrencyLabModal
        isOpen={isConcurrencyLabOpen}
        onClose={() => setIsConcurrencyLabOpen(false)}
      />

      <AuthenticationModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <MarketplaceProvider>
      <MarketplaceApp />
    </MarketplaceProvider>
  );
}
