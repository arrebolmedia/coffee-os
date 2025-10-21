import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '../cart.store';
import type { Product, ProductStatus, ProductType } from '@/types';

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

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
    });

    it('should add item with modifiers', () => {
      const { result } = renderHook(() => useCartStore());

      const modifiers = [
        { id: 'mod1', name: 'Extra shot', price: 10 },
      ];

      act(() => {
        result.current.addItem(mockProduct, 1, modifiers);
      });

      expect(result.current.items[0].modifiers).toEqual(modifiers);
      expect(result.current.items[0].unitPrice).toBe(55); // 45 + 10
    });

    it('should treat items with different modifiers as separate items', () => {
      const { result } = renderHook(() => useCartStore());

      const modifiers1 = [{ id: 'mod1', name: 'Extra shot', price: 10 }];
      const modifiers2 = [{ id: 'mod2', name: 'Soy milk', price: 5 }];

      act(() => {
        result.current.addItem(mockProduct, 1, modifiers1);
        result.current.addItem(mockProduct, 1, modifiers2);
      });

      expect(result.current.items).toHaveLength(2);
    });

    it('should add note to item', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1, [], 'Sin azúcar');
      });

      expect(result.current.items[0].note).toBe('Sin azúcar');
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      const itemId = result.current.items[0].id;

      act(() => {
        result.current.removeItem(itemId);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      const itemId = result.current.items[0].id;

      act(() => {
        result.current.updateQuantity(itemId, 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it('should remove item if quantity is 0', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      const itemId = result.current.items[0].id;

      act(() => {
        result.current.updateQuantity(itemId, 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should not allow negative quantities', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      const itemId = result.current.items[0].id;

      act(() => {
        result.current.updateQuantity(itemId, -5);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
        result.current.addItem({ ...mockProduct, id: '2' }, 2);
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.customer).toBeNull();
      expect(result.current.discount).toBe(0);
    });
  });

  describe('setCustomer', () => {
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

      expect(result.current.customer).toEqual(customer);
    });
  });

  describe('setDiscount', () => {
    it('should set discount percentage', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setDiscount(10);
      });

      expect(result.current.discount).toBe(10);
    });

    it('should not allow discount > 100', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setDiscount(150);
      });

      expect(result.current.discount).toBe(100);
    });

    it('should not allow negative discount', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setDiscount(-10);
      });

      expect(result.current.discount).toBe(0);
    });
  });

  describe('totals calculation', () => {
    it('should calculate subtotal correctly', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2); // 45 * 2 = 90
        result.current.addItem({ ...mockProduct, id: '2', price: 55 }, 3); // 55 * 3 = 165
      });

      expect(result.current.subtotal).toBe(255);
    });

    it('should calculate tax correctly', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1); // 45 * 0.16 = 7.2
      });

      expect(result.current.tax).toBeCloseTo(7.2, 2);
    });

    it('should calculate discount correctly', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1); // 45
        result.current.setDiscount(10); // 10% discount
      });

      expect(result.current.discountAmount).toBeCloseTo(4.5, 2);
    });

    it('should calculate total correctly', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1); // subtotal: 45, tax: 7.2, total: 52.2
        result.current.setDiscount(10); // discount: 4.5
      });

      // total = (subtotal - discount) + tax
      // total = (45 - 4.5) + 6.48 = 46.98
      expect(result.current.total).toBeCloseTo(46.98, 2);
    });

    it('should return 0 for empty cart', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.subtotal).toBe(0);
      expect(result.current.tax).toBe(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('itemCount', () => {
    it('should return total number of items', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2);
        result.current.addItem({ ...mockProduct, id: '2' }, 3);
      });

      expect(result.current.itemCount).toBe(5);
    });

    it('should return 0 for empty cart', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.itemCount).toBe(0);
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

      expect(result2.current.items).toHaveLength(1);
      expect(result2.current.items[0].quantity).toBe(2);
      expect(result2.current.discount).toBe(15);
    });
  });
});
