/**
 * CoffeeOS POS Web - Cart Store
 * Estado global del carrito de compras usando Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import { Cart, CartItem, Customer, Product, SelectedModifier } from '@/types';

interface CartState {
  cart: Cart;
  // Actions
  addItem: (
    product: Product,
    quantity?: number,
    modifiers?: SelectedModifier[],
    notes?: string,
  ) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateNotes: (itemId: string, notes: string) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: number) => void;
  setNotes: (notes: string) => void;
  // Computed
  getItemCount: () => number;
  calculateTotals: () => void;
}

export const TAX_RATE = 0.16; // 16% IVA en México

const calculateItemSubtotal = (item: CartItem): number => {
  const modifiersTotal = item.selected_modifiers.reduce(
    (sum, mod) => sum + mod.price_adjustment,
    0,
  );
  return (item.unit_price + modifiersTotal) * item.quantity;
};

const initialCart: Cart = {
  items: [],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: initialCart,

      // ============================================================================
      // ADD ITEM
      // ============================================================================
      addItem: (product, quantity = 1, modifiers = [], notes = '') => {
        if (
          !Number.isFinite(quantity) ||
          quantity <= 0 ||
          !Number.isInteger(quantity)
        ) {
          return;
        }
        const state = get();
        const existingItemIndex = state.cart.items.findIndex((item) => {
          // Check if same product
          if (item.product.id !== product.id) return false;

          // Check if same modifiers
          if (item.selected_modifiers.length !== modifiers.length) return false;

          const sameModifiers = item.selected_modifiers.every((mod) =>
            modifiers.some((m) => m.option_id === mod.option_id),
          );

          return sameModifiers && item.notes === notes;
        });

        if (existingItemIndex >= 0) {
          // Update existing item quantity (immutable map)
          const updatedItems = state.cart.items.map((item, i) => {
            if (i !== existingItemIndex) return item;
            const merged = { ...item, quantity: item.quantity + quantity };
            return { ...merged, subtotal: calculateItemSubtotal(merged) };
          });

          set({ cart: { ...state.cart, items: updatedItems } });
        } else {
          // Add new item
          const newItem: CartItem = {
            id: uuid(),
            product,
            quantity,
            unit_price: product.price,
            selected_modifiers: modifiers,
            subtotal: 0,
            notes,
          };
          newItem.subtotal = calculateItemSubtotal(newItem);

          set({
            cart: { ...state.cart, items: [...state.cart.items, newItem] },
          });
        }

        get().calculateTotals();
      },

      // ============================================================================
      // REMOVE ITEM
      // ============================================================================
      removeItem: (itemId) => {
        const state = get();
        const updatedItems = state.cart.items.filter(
          (item) => item.id !== itemId,
        );
        set({ cart: { ...state.cart, items: updatedItems } });
        get().calculateTotals();
      },

      // ============================================================================
      // UPDATE QUANTITY
      // ============================================================================
      updateQuantity: (itemId, quantity) => {
        if (!Number.isFinite(quantity) || !Number.isInteger(quantity)) {
          return;
        }
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        const state = get();
        const updatedItems = state.cart.items.map((item) => {
          if (item.id === itemId) {
            const updatedItem = { ...item, quantity };
            updatedItem.subtotal = calculateItemSubtotal(updatedItem);
            return updatedItem;
          }
          return item;
        });

        set({ cart: { ...state.cart, items: updatedItems } });
        get().calculateTotals();
      },

      // ============================================================================
      // UPDATE NOTES
      // ============================================================================
      updateNotes: (itemId, notes) => {
        const state = get();
        const updatedItems = state.cart.items.map((item) =>
          item.id === itemId ? { ...item, notes } : item,
        );
        set({ cart: { ...state.cart, items: updatedItems } });
      },

      // ============================================================================
      // CLEAR CART
      // ============================================================================
      clearCart: () => {
        set({
          cart: {
            items: [],
            customer_id: undefined,
            discount: 0,
            notes: '',
            subtotal: 0,
            tax: 0,
            total: 0,
          },
        });
      },

      // ============================================================================
      // SET CUSTOMER
      // ============================================================================
      setCustomer: (customer) => {
        const state = get();
        set({
          cart: {
            ...state.cart,
            customer_id: customer?.id,
          },
        });
      },

      // ============================================================================
      // SET DISCOUNT
      // ============================================================================
      setDiscount: (discount) => {
        // discount in absolute currency units
        const state = get();
        const clamped = Math.max(discount, 0);
        set({ cart: { ...state.cart, discount: clamped } });
        get().calculateTotals();
      },

      // ============================================================================
      // SET NOTES
      // ============================================================================
      setNotes: (notes) => {
        const state = get();
        set({ cart: { ...state.cart, notes } });
      },

      // ============================================================================
      // GET ITEM COUNT
      // ============================================================================
      getItemCount: () => {
        const state = get();
        return state.cart.items.reduce(
          (count, item) => count + item.quantity,
          0,
        );
      },

      // ============================================================================
      // CALCULATE TOTALS
      // ============================================================================
      calculateTotals: () => {
        const state = get();
        const subtotal = state.cart.items.reduce(
          (sum, item) => sum + item.subtotal,
          0,
        );
        const discount = state.cart.discount || 0;
        const taxableAmount = Math.max(0, subtotal - discount);
        const tax = taxableAmount * TAX_RATE;
        const total = Math.max(0, taxableAmount + tax);

        set({
          cart: {
            ...state.cart,
            subtotal,
            tax,
            total,
          },
        });
      },
    }),
    {
      name: 'coffeeos-cart',
      partialize: (state) => ({ cart: state.cart }),
    },
  ),
);
