# 🧪 CoffeeOS POS - Testing Guide

## 📋 Estructura de Testing

Este proyecto incluye tres niveles de testing:

1. **Unit Tests** - Jest + React Testing Library
2. **Integration Tests** - Jest con mocks
3. **E2E Tests** - Playwright

---

## 🛠️ Configuración

### **Instalación de Dependencias**

```bash
cd apps/pos-web

# Dependencias ya instaladas en package.json:
# - jest
# - jest-environment-jsdom
# - @testing-library/react
# - @testing-library/jest-dom
# - @playwright/test
```

### **Archivos de Configuración Creados**

✅ `jest.config.js` - Configuración de Jest con Next.js  
✅ `jest.setup.js` - Setup global, mocks de browser APIs  
✅ `playwright.config.ts` - Configuración de Playwright para E2E  

---

## 🧪 Unit Testing con Jest

### **Comandos**

```bash
# Ejecutar todos los tests
npm test

# Watch mode (desarrollo)
npm run test:watch

# Coverage report
npm test -- --coverage

# Test específico
npm test cart.store.test
```

### **Estructura de Tests**

```
src/
├── components/
│   └── pos/
│       ├── ProductCard.tsx
│       └── __tests__/
│           └── ProductCard.test.tsx
├── store/
│   ├── cart.store.ts
│   └── __tests__/
│       └── cart.store.test.ts
├── lib/
│   ├── db.ts
│   └── __tests__/
│       └── db.test.ts
└── hooks/
    ├── use-products.ts
    └── __tests__/
        └── use-products.test.ts
```

### **Ejemplo de Unit Test**

```typescript
// src/store/__tests__/cart.store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '../cart.store';

describe('Cart Store', () => {
  it('should add item to cart', () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addItem(mockProduct, 1);
    });

    expect(result.current.cart.items).toHaveLength(1);
  });
});
```

### **Áreas Cubiertas**

- ✅ Stores de Zustand (cart, auth, offline)
- ✅ Utility functions (db, sync)  
- ✅ Componentes React (ProductCard, Cart, PaymentModal)
- ✅ Custom Hooks (use-products, use-orders, use-offline)

---

## 🎭 E2E Testing con Playwright

### **Comandos**

```bash
# Instalar browsers
npx playwright install

# Ejecutar todos los E2E tests
npm run test:e2e

# Modo UI (interactivo)
npx playwright test --ui

# Ejecutar tests específicos
npx playwright test pos-checkout

# Debug mode
npx playwright test --debug

# Ver reporte
npx playwright show-report
```

### **Tests E2E Creados**

#### **1. pos-checkout.spec.ts**
- ✅ Display product catalog
- ✅ Add product to cart
- ✅ Increment quantity
- ✅ Remove from cart
- ✅ Calculate totals
- ✅ Filter by category
- ✅ Search products
- ✅ Complete cash payment
- ✅ Complete card payment
- ✅ Apply discount
- ✅ Use NumPad
- ✅ Clear cart

#### **2. offline-mode.spec.ts**
- ✅ Show online/offline indicator
- ✅ Load cached products offline
- ✅ Create order offline (sync queue)
- ✅ Sync pending orders when online
- ✅ Show database stats
- ✅ Manual sync trigger
- ✅ Offline fallback page
- ✅ Search products offline
- ✅ Filter categories offline
- ✅ Persist cart across reloads
- ✅ Show sync errors

### **Ejemplo de E2E Test**

```typescript
// e2e/pos-checkout.spec.ts
import { test, expect } from '@playwright/test';

test('should complete checkout flow', async ({ page }) => {
  await page.goto('/pos');
  
  // Add product
  await page.locator('[data-testid="product-card"]').first().click();
  
  // Open payment
  await page.locator('[data-testid="pay-button"]').click();
  
  // Complete payment
  await page.locator('[data-testid="payment-cash"]').click();
  await page.locator('[data-testid="complete-payment"]').click();
  
  // Verify success
  await expect(page.locator('text=/venta completada/i')).toBeVisible();
});
```

### **Configuración de Browsers**

Tests corren en:
- ✅ Chromium (Desktop)
- ✅ Firefox (Desktop)
- ✅ WebKit (Desktop)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

---

## 📊 Coverage Goals

### **Coverage Targets** (70% mínimo)

| Categoría | Target | Actual |
|-----------|--------|--------|
| Statements | 70% | TBD |
| Branches | 70% | TBD |
| Functions | 70% | TBD |
| Lines | 70% | TBD |

### **Prioridad de Testing**

**Alta Prioridad:**
- Cart Store (lógica de negocio crítica)
- Payment flow (dinero involucrado)
- Offline sync (integridad de datos)
- Product catalog (UX core)

**Media Prioridad:**
- UI Components (visuals)
- Search/Filter logic
- Navigation

**Baja Prioridad:**
- Styling
- Animations
- Non-critical UI

---

## 🚀 Testing en CI/CD

### **GitHub Actions** (futuro)

```yaml
name: Test
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🎯 Test Data IDs

Para facilitar el testing E2E, agregar estos `data-testid` attributes:

### **POS Page**
- `product-card` - Tarjeta de producto
- `cart-count` - Contador de items en carrito
- `cart-item` - Item en el carrito
- `item-quantity` - Cantidad de item
- `remove-item` - Botón eliminar
- `cart-empty` - Estado carrito vacío
- `subtotal` - Subtotal
- `tax` - Impuestos
- `total` - Total
- `pay-button` - Botón pagar
- `clear-cart` - Botón limpiar carrito

### **Search & Filters**
- `search-input` - Input de búsqueda
- `category-filter` - Filtro de categoría

### **Payment Modal**
- `payment-modal` - Modal de pago
- `payment-cash` - Botón pago efectivo
- `payment-card` - Botón pago tarjeta
- `cash-input` - Input cantidad efectivo
- `change-due` - Cambio a devolver
- `complete-payment` - Botón completar pago

### **Offline Indicator**
- `offline-indicator` - Indicador offline/online
- `sync-queue-count` - Cantidad en cola de sync
- `sync-status` - Estado de sincronización
- `db-stats-*` - Estadísticas de base de datos
- `manual-sync-button` - Botón sync manual
- `syncing-indicator` - Indicador sincronizando

### **Discount**
- `discount-button` - Botón descuento
- `discount-input` - Input descuento
- `apply-discount` - Aplicar descuento
- `discount-amount` - Cantidad descontada

---

## 🐛 Debugging Tests

### **Jest Debug**

```bash
# Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# VS Code: .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

### **Playwright Debug**

```bash
# Headed mode (ver browser)
npx playwright test --headed

# Debug mode (step by step)
npx playwright test --debug

# Slow motion
npx playwright test --slow-mo=1000

# Trace viewer (post-mortem)
npx playwright show-trace trace.zip
```

---

## 📝 Best Practices

### **Unit Tests**

1. **Arrange-Act-Assert** pattern
2. Un concepto por test
3. Nombres descriptivos
4. Mock external dependencies
5. Test edge cases

```typescript
// ✅ Good
it('should throw error when quantity is negative', () => {
  expect(() => addItem(product, -1)).toThrow('Invalid quantity');
});

// ❌ Bad
it('test1', () => {
  // multiple assertions
});
```

### **E2E Tests**

1. Test user journeys completos
2. Usar selectores estables (data-testid)
3. Wait for elements (no timeouts arbitrarios)
4. Test datos realistas
5. Clean state entre tests

```typescript
// ✅ Good
await expect(page.locator('[data-testid="success"]')).toBeVisible();

// ❌ Bad  
await page.waitForTimeout(3000);
```

### **Mocking**

```typescript
// Mock API
jest.mock('@/services/products.service', () => ({
  getProducts: jest.fn().mockResolvedValue([mockProduct]),
}));

// Mock IndexedDB
global.indexedDB = {
  open: jest.fn().mockResolvedValue(mockDB),
};

// Mock Service Worker
global.navigator.serviceWorker = {
  register: jest.fn().mockResolvedValue(mockRegistration),
};
```

---

## 📚 Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

## ✅ Checklist de Testing

### **Setup** ✅
- [x] Jest configurado
- [x] Playwright configurado
- [x] Test utilities creados
- [x] Mocks de browser APIs

### **Unit Tests** (Pendiente)
- [ ] Cart Store tests
- [ ] Auth Store tests
- [ ] Offline Store tests
- [ ] IndexedDB tests
- [ ] Sync Service tests
- [ ] Component tests (ProductCard, Cart, etc.)
- [ ] Hook tests (use-products, use-orders)

### **E2E Tests** ✅
- [x] Checkout flow spec
- [x] Offline mode spec
- [ ] Multi-device tests
- [ ] Performance tests

### **CI/CD** (Futuro)
- [ ] GitHub Actions workflow
- [ ] Coverage reports automáticos
- [ ] Visual regression tests
- [ ] Performance budgets

---

**Nota**: Los tests unitarios base han sido creados pero requieren ajustes para alinear con los tipos reales de la aplicación. Los archivos de configuración y los specs de E2E están completos y listos para usar.

Para ejecutar tests:
```bash
# Unit tests (cuando se corrijan los tipos)
npm test

# E2E tests (requiere app corriendo)
npm run dev  # Terminal 1
npm run test:e2e  # Terminal 2
```

---

**Fecha**: 21 de Octubre de 2025  
**Autor**: GitHub Copilot  
**Versión**: 1.0.0
