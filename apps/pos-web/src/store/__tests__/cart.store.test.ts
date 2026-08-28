import { act, renderHook } from '@testing-library/react';
import { useCartStore } from '../cart.store';
import type { Product } from '@/types';
import { CustomerStatus, ProductStatus, ProductType } from '@/types';

describe('Cart Store', () => {
  const mockProduct: Product = {
    id: '1',
    name: 'Espresso',
    sku: 'ESP001',
    price: 45,
    categoryId: 'cat1',
    status: ProductStatus.ACTIVE,
    image: '/espresso.jpg',
    type: ProductType.SIMPLE,
    trackInventory: true,
    organization_id: 'org1',
    location_id: 'loc1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

  describe('setCustomer', () => {
    it('should set customer', () => {
      const { result } = renderHook(() => useCartStore());

      const customer = {
        id: 'cust1',
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        phone: '5512345678',
        totalVisits: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
        consentMarketing: false,
        consentWhatsapp: false,
        consentEmail: false,
        consentSms: false,
        status: CustomerStatus.ACTIVE,
        active: true,
        organization_id: 'org1',
        location_id: 'loc1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      act(() => {
        result.current.setCustomer(customer);
      });

      expect(result.current.cart.customer_id).toBe(customer.id);
    });
  });

  describe('setDiscount', () => {
    it('should set discount amount', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setDiscount(10);
      });

      expect(result.current.cart.discount).toBe(10);
    });

    it('should allow discount > 100 (discount is absolute currency, not percentage)', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setDiscount(150);
      });

      expect(result.current.cart.discount).toBe(150);
    });

    it('should not allow negative discount', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setDiscount(-10);
      });

      expect(result.current.cart.discount).toBe(0);
    });
  });

  // El precio de la carta ya lleva el IVA dentro (art. 7 bis LFPC), que es el
  // default del sistema. Por eso el `subtotal` de estos casos es la base
  // gravable —lo que queda al sacar el impuesto— y no la suma de los precios.
  describe('totals calculation', () => {
    it('el subtotal es la base gravable, no la suma de los precios de carta', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2); // 45 * 2 = 90 de carta
        result.current.addItem({ ...mockProduct, id: '2', price: 55 }, 3); // 165 de carta
      });

      // 255 de carta = 219.83 de base + 35.17 de IVA
      expect(result.current.cart.subtotal).toBeCloseTo(219.83, 2);
      expect(result.current.cart.tax).toBeCloseTo(35.17, 2);
    });

    it('lo que paga el cliente es el precio de la carta, ni un peso más', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2);
        result.current.addItem({ ...mockProduct, id: '2', price: 55 }, 3);
      });

      // Ésta es la razón de ser del modelo: la carta dice 255, se cobran 255.
      expect(result.current.cart.total).toBeCloseTo(255, 2);
    });

    it('should calculate tax correctly', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1); // 45 de carta: 38.79 + 6.21
      });

      expect(result.current.cart.tax).toBeCloseTo(6.21, 2);
    });

    it('should apply discount to total calculation', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1); // 45 de carta
        result.current.setDiscount(10); // discount: 10
      });

      // El descuento se aplica sobre el precio de carta: 45 - 10 = 35.
      expect(result.current.cart.total).toBeCloseTo(35, 2);
      expect(result.current.cart.tax).toBeCloseTo(4.83, 2);
    });

    it('should calculate total correctly', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1); // 45 de carta
        result.current.setDiscount(5); // discount: 5
      });

      expect(result.current.cart.total).toBeCloseTo(40, 2);
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

      const stored = localStorage.getItem('coffeeos-cart');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.cart.items).toHaveLength(1);
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
  describe('IVA por producto', () => {
    // El backend calcula el impuesto del ticket con la tasa de cada producto.
    // El carrito aplicaba un 0.16 fijo, asi que coincidian solo mientras todo
    // estuviera al 16 %.
    const panLlevar: Product = {
      ...mockProduct,
      id: '2',
      name: 'Concha de Vainilla',
      sku: 'PAN001',
      price: 100,
      taxRate: 0,
    };

    it('grava cada linea con la tasa de su producto', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(
          { ...mockProduct, price: 100, taxRate: 0.16 },
          1,
        );
        result.current.addItem(panLlevar, 1);
      });

      // Con el IVA dentro: de los $100 gravados salen 86.21 + 13.79; el pan a
      // tasa 0 aporta sus $100 enteros a la base. El cliente paga 200 en
      // cualquier caso, que es lo que dice la carta.
      expect(result.current.cart.subtotal).toBeCloseTo(186.21, 2);
      expect(result.current.cart.tax).toBeCloseTo(13.79, 2);
      expect(result.current.cart.total).toBeCloseTo(200, 2);
    });

    it('usa 16 % por defecto si el producto no trae tasa', () => {
      const { result } = renderHook(() => useCartStore());
      const sinTasa: Product = { ...mockProduct, price: 100 };
      delete (sinTasa as { taxRate?: number }).taxRate;

      act(() => {
        result.current.addItem(sinTasa, 1);
      });

      // $100 de carta al 16 % dentro = 86.21 + 13.79.
      expect(result.current.cart.tax).toBeCloseTo(13.79, 2);
    });

    it('el descuento reduce la base gravable', () => {
      // Es la aritmetica que el backend hacia mal: calculaba el IVA sobre el
      // subtotal sin descontar, de modo que el canje de lealtad de $50 cobraba
      // $8 de mas y la pantalla no cuadraba con el cobro.
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(
          { ...mockProduct, price: 100, taxRate: 0.16 },
          1,
        );
        result.current.setDiscount(50);
      });

      // Quedan $50 de carta: 43.10 de base + 6.90 de IVA.
      expect(result.current.cart.subtotal).toBeCloseTo(43.1, 2);
      expect(result.current.cart.tax).toBeCloseTo(6.9, 2);
      expect(result.current.cart.total).toBeCloseTo(50, 2);
    });

    it('reparte el descuento proporcionalmente entre tasas distintas', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(
          { ...mockProduct, price: 100, taxRate: 0.16 },
          1,
        );
        result.current.addItem(panLlevar, 1);
        result.current.setDiscount(100); // la mitad del subtotal
      });

      // Cada linea se queda a la mitad: $50 gravados (43.10 + 6.90) y $50 de
      // pan a tasa 0. El cliente paga los $100 que quedan de carta.
      expect(result.current.cart.subtotal).toBeCloseTo(93.1, 2);
      expect(result.current.cart.tax).toBeCloseTo(6.9, 2);
      expect(result.current.cart.total).toBeCloseTo(100, 2);
    });
  });

  describe('precio con el IVA dentro', () => {
    // Es el caso normal en Mexico y hoy el default del sistema, pero durante
    // mucho tiempo la columna existia, el DTO la aceptaba y no la miraba nadie:
    // ni el backend al cobrar ni el carrito al enseniar el total. Un producto
    // con el IVA en el precio se lo comia otra vez por encima.
    const conIvaDentro: Product = {
      ...mockProduct,
      id: 'inc',
      name: 'Cafe con IVA incluido',
      price: 116,
      taxRate: 0.16,
      taxIncluded: true,
    };

    it('extrae el impuesto del precio en vez de sumarlo', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(conIvaDentro, 1);
      });

      // Lo que paga el cliente es el precio de la carta.
      expect(result.current.cart.subtotal).toBe(100);
      expect(result.current.cart.tax).toBe(16);
      expect(result.current.cart.total).toBe(116);
    });

    it('a tasa 0 el precio entero es base', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ ...conIvaDentro, price: 40, taxRate: 0 }, 1);
      });

      expect(result.current.cart.subtotal).toBe(40);
      expect(result.current.cart.tax).toBe(0);
      expect(result.current.cart.total).toBe(40);
    });

    it('convive con uno de IVA por fuera', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(conIvaDentro, 1);
        result.current.addItem(
          {
            ...mockProduct,
            id: 'fuera',
            price: 100,
            taxRate: 0.16,
            // Explicito: sin la marca el producto se lee como precio de carta,
            // que es el default nacional.
            taxIncluded: false,
          },
          1,
        );
      });

      expect(result.current.cart.subtotal).toBe(200);
      expect(result.current.cart.tax).toBe(32);
      expect(result.current.cart.total).toBe(232);
    });

    it('coincide con lo que cobra el backend, que es de lo que se trata', () => {
      // Mismos numeros que `pos.impuestos.spec.ts` en la API: si las dos
      // cuentas se separan, el cajero ve un total y se cobra otro.
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(conIvaDentro, 1);
      });

      expect({
        subtotal: result.current.cart.subtotal,
        tax: result.current.cart.tax,
        total: result.current.cart.total,
      }).toEqual({ subtotal: 100, tax: 16, total: 116 });
    });
  });
});
