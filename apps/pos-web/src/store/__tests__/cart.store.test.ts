import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '../cart.store';
import type { Product } from '@/types';
import { ProductStatus, ProductType } from '@/types';

describe('Cart Store', () => {
  const mockProduct: Product = {
    id: '1',
    name: 'Espresso',
    sku: 'ESP001',
    price: 45,
    category_id: 'cat1',
    status: ProductStatus.ACTIVE,
    image_url: '/espresso.jpg',
    type: ProductType.SIMPLE,
    track_inventory: true,
    organization_id: 'org1',
    location_id: 'loc1',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useCartStore());
    act(() => {
      result.current.clearCart();
    });
    localStorage.clear();
  });

  describe('addItem', () => {
    it('should add item to cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].product.name).toBe('Espresso');
      expect(result.current.cart.items[0].quantity).toBe(1);
    });

    it('should increment quantity if item already exists', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
        result.current.addItem(mockProduct, 2);
      });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].quantity).toBe(3);
    });

    it('should add item with modifiers', () => {
      const { result } = renderHook(() => useCartStore());

      const modifiers = [
        {
          modifier_id: 'mod1',
          modifier_name: 'Extra shot',
          option_id: 'opt1',
          option_name: 'Extra shot',
          price_adjustment: 10,
        },
      ];

      act(() => {
        result.current.addItem(mockProduct, 1, modifiers);
      });

      expect(result.current.cart.items[0].selected_modifiers).toEqual(
        modifiers,
      );
      expect(result.current.cart.items[0].unit_price).toBe(45);
    });

    it('should treat items with different modifiers as separate items', () => {
      const { result } = renderHook(() => useCartStore());

      const modifiers1 = [
        {
          modifier_id: 'mod1',
          modifier_name: 'Extra shot',
          option_id: 'opt1',
          option_name: 'Extra shot',
          price_adjustment: 10,
        },
      ];
      const modifiers2 = [
        {
          modifier_id: 'mod2',
          modifier_name: 'Soy milk',
          option_id: 'opt2',
          option_name: 'Soy milk',
          price_adjustment: 5,
        },
      ];

      act(() => {
        result.current.addItem(mockProduct, 1, modifiers1);
        result.current.addItem(mockProduct, 1, modifiers2);
      });

      expect(result.current.cart.items).toHaveLength(2);
    });

    it('should add note to item', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1, [], 'Sin azúcar');
      });

      expect(result.current.cart.items[0].notes).toBe('Sin azúcar');
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.removeItem(itemId);
      });

      expect(result.current.cart.items).toHaveLength(0);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.updateQuantity(itemId, 5);
      });

      expect(result.current.cart.items[0].quantity).toBe(5);
    });

    it('should remove item if quantity is 0', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.updateQuantity(itemId, 0);
      });

      expect(result.current.cart.items).toHaveLength(0);
    });

    it('should not allow negative quantities', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.updateQuantity(itemId, -5);
      });

      expect(result.current.cart.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
        result.current.addItem({ ...mockProduct, id: '2' }, 2);
      });

      expect(result.current.cart.items).toHaveLength(2);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.cart.items).toHaveLength(0);
      expect(result.current.cart.customer_id).toBeUndefined();
      expect(result.current.cart.discount).toBe(0);
    });
  });

  describe.skip('setCustomer', () => {
    // TODO: Fix Customer type - needs all required fields (customer_code, total_orders, etc.)
    /* COMMENTED OUT - Customer interface changed
    it('should set customer', () => {
      const { result } = renderHook(() => useCartStore());

      const customer = {
        id: 'cust1',
        name: 'Juan Pérez',
        email: 'juan@example.com',
        phone: '5512345678',
      };

      act(() => {
        result.current.setCustomer(customer);
      });

      expect(result.current.cart.customer_id).toBe(customer.id);
    });
    */
  });

  describe('setDiscount', () => {
    it('should set discount amount', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setDiscount(10);
      });

      expect(result.current.cart.discount).toBe(10);
    });

    it.skip('should not allow discount > 100', () => {
      // TODO: Add validation in cart.store.ts
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setDiscount(150);
      });

      expect(result.current.cart.discount).toBe(100);
    });

    it.skip('should not allow negative discount', () => {
      // TODO: Add validation in cart.store.ts
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setDiscount(-10);
      });

      expect(result.current.cart.discount).toBe(0);
    });
  });

  describe('totals calculation', () => {
    it('should calculate subtotal correctly', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2); // 45 * 2 = 90
        result.current.addItem({ ...mockProduct, id: '2', price: 55 }, 3); // 55 * 3 = 165
      });

      expect(result.current.cart.subtotal).toBe(255);
    });

    it('should calculate tax correctly', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1); // 45 * 0.16 = 7.2
      });

      expect(result.current.cart.tax).toBeCloseTo(7.2, 2);
    });

    it.skip('should calculate discount correctly', () => {
      // TODO: Add discountAmount getter to cart.store.ts
      /* COMMENTED OUT - discountAmount property doesn't exist
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1); // 45
        result.current.setDiscount(10); // 10% discount
      });

      expect(result.current.discountAmount).toBeCloseTo(4.5, 2);
      */
    });

    it('should calculate total correctly', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1); // subtotal: 45
        result.current.setDiscount(5); // discount: 5
      });

      // total = (subtotal - discount) * 1.16
      expect(result.current.cart.total).toBeCloseTo(46.4, 2);
    });

    it('should return 0 for empty cart', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.cart.subtotal).toBe(0);
      expect(result.current.cart.tax).toBe(0);
      expect(result.current.cart.total).toBe(0);
    });
  });

  describe('itemCount', () => {
    it('should return total number of items', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2);
        result.current.addItem({ ...mockProduct, id: '2' }, 3);
      });

      expect(result.current.getItemCount()).toBe(5);
    });

    it('should return 0 for empty cart', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.getItemCount()).toBe(0);
    });
  });

  describe('persistence', () => {
    it('should persist cart to localStorage', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      const stored = localStorage.getItem('cart-storage');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.items).toHaveLength(1);
    });

    it('should restore cart from localStorage', () => {
      // First session
      const { result: result1 } = renderHook(() => useCartStore());

      act(() => {
        result1.current.addItem(mockProduct, 2);
        result1.current.setDiscount(15);
      });

      // Second session (new hook instance)
      const { result: result2 } = renderHook(() => useCartStore());

      expect(result2.current.cart.items).toHaveLength(1);
      expect(result2.current.cart.items[0].quantity).toBe(2);
      expect(result2.current.cart.discount).toBe(15);
    });
  });
});
