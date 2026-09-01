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
import { Banknote, Printer, ShoppingCart, X } from 'lucide-react';
import { OfflineIndicator } from '@/components/pos/OfflineIndicator';
import { CajaModal } from '@/components/pos/CajaModal';
import { usePrintReceipt } from '@/hooks/use-pos';
import { MainLayout } from '@/components/layout/MainLayout';
import type { Customer } from '@/types';
import { logger } from '@/lib/logger';

export default function POSPage() {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  // El carrito arranca cerrado. A partir de `lg` da igual: ahí es una columna
  // fija al lado del catálogo y este estado no lo mueve. Por debajo, en cambio,
  // es un panel `fixed` a pantalla completa, y arrancar abierto dejaba el POS
  // tapado por un carrito vacío nada más entrar, sin nada visible que lo
  // cerrara. Lo primero que necesita un barista es ver los productos.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<{
    ticketId: string;
    ticketNumber: string;
    total: number;
  } | null>(null);
  const imprimirTicket = usePrintReceipt();
  // Abrir y cerrar la caja del turno. No habia forma de hacerlo desde la
  // interfaz, y es lo primero y lo ultimo que se hace cada dia.
  const [cajaAbierta, setCajaAbierta] = useState(false);
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

  // Tras cobrar se queda a la vista la ultima venta con su ticket. Sin esto el
  // cliente no tenia forma de llevarse un comprobante: el endpoint existia y no
  // habia un solo boton que lo pidiera.
  const handlePaymentSuccess = (venta: {
    ticketId: string;
    ticketNumber: string;
    total: number;
  }) => {
    logger.debug('Venta cobrada:', venta.ticketNumber);
    setUltimaVenta(venta);
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col bg-gray-50">
        {/* POS Header - Status Bar */}
        {/* `relative z-40` para quedar por encima del velo del carrito (z-20) y
            del propio panel (z-30): si no, en móvil el botón del carrito queda
            debajo del velo y no hay forma de volver a abrirlo. */}
        <div className="relative z-40 bg-white border-b border-gray-200 px-4 py-3">
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
              <button
                type="button"
                onClick={() => setCajaAbierta(true)}
                aria-label="Abrir o cerrar la caja"
                title="Caja"
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Banknote className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">
                  Caja
                </span>
              </button>
              <OfflineIndicator />
              {/* Por debajo de `lg` el carrito es un panel que se abre y se
                  cierra, así que el contador tiene que ser el botón que lo
                  gobierna: antes era un `div` sin `onClick` y no existía ningún
                  control que tocara `isSidebarOpen`. A partir de `lg` el
                  carrito está siempre a la vista y el contador sólo informa. */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen((abierto) => !abierto)}
                aria-expanded={isSidebarOpen}
                aria-label={`${isSidebarOpen ? 'Ocultar' : 'Ver'} carrito (${itemCount} ${itemCount === 1 ? 'artículo' : 'artículos'})`}
                className="lg:hidden flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm font-bold">{itemCount}</span>
              </button>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg">
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
            {/* Volver al catálogo. El panel ocupa todo el ancho del teléfono,
                así que no queda «fuera» donde tocar para cerrarlo. */}
            <div className="lg:hidden flex items-center justify-between px-4 pt-4">
              <h2 className="text-sm font-semibold text-gray-700">Carrito</h2>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Cerrar carrito y volver al catálogo"
                className="p-2 -mr-2 text-gray-500 hover:text-gray-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
              {selectedCustomer &&
                (selectedCustomer.loyaltyPoints ?? 0) >= 9 && (
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

        {/*
          La venta recien cobrada, con su ticket. Se queda hasta que el cajero
          la cierra o empieza otra: el cliente puede pedir el comprobante
          despues de guardar la cartera, y muchos no lo quieren, asi que se
          ofrece en vez de imprimirse solo.
        */}
        {ultimaVenta && (
          <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 rounded-xl border border-green-200 bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-green-700">
                  Venta cobrada · {formatPrice(ultimaVenta.total)}
                </p>
                <p className="text-xs text-gray-500">
                  {ultimaVenta.ticketNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUltimaVenta(null)}
                aria-label="Cerrar aviso de venta"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => imprimirTicket.mutate(ultimaVenta.ticketId)}
              disabled={imprimirTicket.isPending}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              <Printer className="h-4 w-4" />
              {imprimirTicket.isPending
                ? 'Preparando ticket…'
                : 'Imprimir ticket'}
            </button>
          </div>
        )}

        {/* Payment Modal */}
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
          customer={selectedCustomer}
        />

        <CajaModal
          abierto={cajaAbierta}
          onClose={() => setCajaAbierta(false)}
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
