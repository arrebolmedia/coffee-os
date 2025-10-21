/**
 * CoffeeOS POS Web - POS Main Page
 * Pantalla principal del punto de venta
 */

'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { ProductCatalog } from '@/components/pos/ProductCatalog';
import { Cart } from '@/components/pos/Cart';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ShoppingCart, User, LogOut, Menu, X, Wifi, WifiOff } from 'lucide-react';
import { useOfflineStore } from '@/store/offline.store';
import Link from 'next/link';

export default function POSPage() {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const cart = useCartStore((state) => state.cart);
  const getItemCount = useCartStore((state) => state.getItemCount);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isOnline = useOfflineStore((state) => state.isOnline);
  const syncQueueSize = useOfflineStore((state) => state.getQueueSize());

  const itemCount = getItemCount();

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

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Logo & Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">CoffeeOS</h1>
                <p className="text-xs text-gray-500">Punto de Venta</p>
              </div>
            </Link>
          </div>

          {/* Center: Status */}
          <div className="flex items-center gap-4">
            {/* Online/Offline Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                isOnline
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">En línea</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Sin conexión</span>
                  {syncQueueSize > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-200 text-red-800 text-xs font-bold rounded-full">
                      {syncQueueSize}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Cart Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm font-bold">{itemCount}</span>
            </div>
          </div>

          {/* Right: User Menu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

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
            bg-white border-l border-gray-200 shadow-xl lg:shadow-none
            transition-transform duration-300 ease-in-out
            z-30
            flex flex-col
          `}
        >
          <Cart />

          {/* Checkout Button */}
          <div className="p-4 border-t border-gray-200">
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
                    {formatPrice(cart.total)}
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
      />

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
