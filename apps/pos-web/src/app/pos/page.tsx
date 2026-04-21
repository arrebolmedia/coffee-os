/**
 * CoffeeOS POS Web - POS Main Page
 * Pantalla principal del punto de venta
 */

'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cart.store';
import { ProductCatalog } from '@/components/pos/ProductCatalog';
import { Cart } from '@/components/pos/Cart';
import { PaymentModal } from '@/components/pos/PaymentModal';
import CustomerSearch from '@/components/pos/CustomerSearch';
import { ShoppingCart } from 'lucide-react';
import { OfflineIndicator } from '@/components/pos/OfflineIndicator';
import { MainLayout } from '@/components/layout/MainLayout';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  segment: 'vip' | 'frequent' | 'regular' | 'new';
  totalPurchases: number;
  lastVisit: string;
}

export default function POSPage() {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Cart sidebar visible por defecto
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  const cart = useCartStore((state) => state.cart);
  const getItemCount = useCartStore((state) => state.getItemCount);

  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const itemCount = hasHydrated ? getItemCount() : 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price);
  };

  const handleCheckout = () => {
    if (itemCount === 0) return;
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (orderId: string) => {
    console.log('Order created:', orderId);
    // Could navigate to receipt page or show success message
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col bg-gray-50">
        {/* POS Header - Status Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    Punto de Venta
                  </h1>
                  <p className="text-xs text-gray-500">Sistema POS</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <OfflineIndicator />
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm font-bold">{itemCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Product Catalog */}
          <div className="flex-1 overflow-hidden">
            <ProductCatalog />
          </div>

          {/* Right: Cart Sidebar */}
          <aside
            className={`
            ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
            lg:translate-x-0
            fixed lg:relative
            right-0 top-[65px] lg:top-0
            h-[calc(100vh-65px)] lg:h-auto
            w-full sm:w-96
            bg-gray-50 border-l border-gray-200 shadow-xl lg:shadow-none
            transition-transform duration-300 ease-in-out
            z-30
            flex flex-col
          `}
          >
            {/* Customer Search */}
            <div className="p-4 bg-gray-50">
              <CustomerSearch
                selectedCustomer={selectedCustomer}
                onCustomerSelect={setSelectedCustomer}
              />
            </div>

            {/* Cart */}
            <div className="flex-1 overflow-hidden bg-white">
              <Cart />
            </div>

            {/* Checkout Button */}
            <div className="p-4 border-t border-gray-200 bg-white">
              {/* Loyalty Point Info */}
              {selectedCustomer && selectedCustomer.loyaltyPoints >= 9 && (
                <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 text-center">
                    🎉 ¡Bebida GRATIS disponible!
                  </p>
                  <p className="text-xs text-green-600 text-center mt-1">
                    Se aplicará automáticamente al cobrar
                  </p>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={itemCount === 0}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              >
                {itemCount === 0 ? (
                  'Agregar productos'
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <span>Cobrar</span>
                    <span className="bg-white/20 px-3 py-1 rounded-lg">
                      {formatPrice(hasHydrated ? cart.total : 0)}
                    </span>
                  </div>
                )}
              </button>
            </div>
          </aside>
        </div>

        {/* Payment Modal */}
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
          customer={selectedCustomer}
        />

        {/* Overlay for mobile cart sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </MainLayout>
  );
}
