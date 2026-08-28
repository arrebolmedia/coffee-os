/**
 * CoffeeOS POS Web - Cart Component
 * Componente del carrito de compras
 */

'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cart.store';
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { CartItem } from '@/types';

export function Cart() {
  const cart = useCartStore((state) => state.cart);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const getItemCount = useCartStore((state) => state.getItemCount);

  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price);
  };

  const itemCount = hasHydrated ? getItemCount() : 0;

  if (!hasHydrated || itemCount === 0) {
    return (
      <div
        data-testid="cart-empty"
        className="h-full flex flex-col items-center justify-center text-gray-400"
      >
        <ShoppingCart className="w-24 h-24 mb-4" strokeWidth={1} />
        <p className="text-lg font-medium">Carrito vacío</p>
        <p className="text-sm">Agrega productos para comenzar</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-gray-900">
            Carrito ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </h2>
        </div>
        <button
          onClick={clearCart}
          className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          Limpiar
        </button>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
            onRemove={() => removeItem(item.id)}
            formatPrice={formatPrice}
          />
        ))}
      </div>

      {/* Totals */}
      {/*
        El orden importa y tiene que reconciliar a la vista del cajero.
        `cart.subtotal` es la base gravable YA descontada, asi que enseniarla
        arriba del descuento daba una resta que no cuadraba: 36.21 - 20 + 5.79
        para un total de 42. Lo que se enseña arriba es la suma de los precios
        de carta —el total mas lo descontado— y el IVA baja al final como lo
        que es: informativo, porque ya viene dentro del precio.
      */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal:</span>
          <span>{formatPrice(cart.total + cart.discount)}</span>
        </div>

        {cart.discount > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Descuento:</span>
            <span>-{formatPrice(cart.discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
          <span>Total:</span>
          <span className="text-amber-600">{formatPrice(cart.total)}</span>
        </div>

        <div className="flex justify-between text-xs text-gray-500">
          <span>IVA incluido:</span>
          <span>{formatPrice(cart.tax)}</span>
        </div>
      </div>

      {/* Notes */}
      {cart.notes && (
        <div className="border-t border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Notas: </span>
            {cart.notes}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CART ITEM ROW
// ============================================================================

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  formatPrice: (price: number) => string;
}

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  formatPrice,
}: CartItemRowProps) {
  // Prices are stored without tax; tax is applied to the cart total once.
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      {/* Product Info */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm">
            {item.product.name}
          </h4>
          <p className="text-xs text-gray-500">
            {formatPrice(item.unit_price)} c/u
          </p>
        </div>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-700 p-1"
          aria-label="Eliminar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modifiers */}
      {item.selected_modifiers.length > 0 && (
        <div className="mb-2 pl-2 border-l-2 border-amber-200">
          {item.selected_modifiers.map((mod, idx) => (
            <div
              key={idx}
              className="text-xs text-gray-600 flex justify-between"
            >
              <span>+ {mod.option_name}</span>
              {mod.price_adjustment > 0 && (
                <span className="text-amber-600">
                  +{formatPrice(mod.price_adjustment)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {item.notes && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 italic">{item.notes}</p>
        </div>
      )}

      {/* Quantity Controls & Subtotal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateQuantity(item.quantity - 1)}
            className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            disabled={item.quantity <= 1}
          >
            <Minus className="w-4 h-4 text-gray-700" />
          </button>

          <span className="w-8 text-center font-semibold text-gray-900">
            {item.quantity}
          </span>

          <button
            onClick={() => onUpdateQuantity(item.quantity + 1)}
            className="w-7 h-7 rounded-md bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-700" />
          </button>
        </div>

        <span className="font-bold text-gray-900">
          {formatPrice(item.subtotal)}
        </span>
      </div>
    </div>
  );
}
