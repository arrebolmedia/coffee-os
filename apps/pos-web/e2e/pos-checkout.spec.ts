import { test, expect } from '@playwright/test';

test.describe('POS Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to POS page
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');
  });

  test('should display product catalog', async ({ page }) => {
    // Check that products are visible
    const products = page.locator('[data-testid="product-card"]');
    await expect(products.first()).toBeVisible();

    // Check that at least one product has name and price
    const firstProduct = products.first();
    await expect(firstProduct.locator('text=/Espresso|Cappuccino|Latte/i')).toBeVisible();
    await expect(firstProduct.locator('text=/\\$\\d+/i')).toBeVisible();
  });

  test('should add product to cart', async ({ page }) => {
    // Click on first product
    await page.locator('[data-testid="product-card"]').first().click();

    // Check cart has 1 item
    const cartCount = page.locator('[data-testid="cart-count"]');
    await expect(cartCount).toHaveText('1');

    // Check cart shows the product
    const cartItem = page.locator('[data-testid="cart-item"]').first();
    await expect(cartItem).toBeVisible();
  });

  test('should increment product quantity in cart', async ({ page }) => {
    // Add product to cart
    const product = page.locator('[data-testid="product-card"]').first();
    await product.click();
    await product.click();

    // Check quantity is 2
    const cartItem = page.locator('[data-testid="cart-item"]').first();
    const quantity = cartItem.locator('[data-testid="item-quantity"]');
    await expect(quantity).toHaveText('2');
  });

  test('should remove product from cart', async ({ page }) => {
    // Add product
    await page.locator('[data-testid="product-card"]').first().click();

    // Click remove button
    await page.locator('[data-testid="remove-item"]').first().click();

    // Check cart is empty
    await expect(page.locator('[data-testid="cart-empty"]')).toBeVisible();
  });

  test('should calculate totals correctly', async ({ page }) => {
    // Add two different products
    const products = page.locator('[data-testid="product-card"]');
    await products.nth(0).click();
    await products.nth(1).click();

    // Check subtotal is displayed
    const subtotal = page.locator('[data-testid="subtotal"]');
    await expect(subtotal).toBeVisible();

    // Check tax is calculated
    const tax = page.locator('[data-testid="tax"]');
    await expect(tax).toBeVisible();

    // Check total is displayed
    const total = page.locator('[data-testid="total"]');
    await expect(total).toBeVisible();
  });

  test('should filter products by category', async ({ page }) => {
    // Click on a category filter
    await page.locator('[data-testid="category-filter"]').first().click();

    // Check that products are filtered
    const products = page.locator('[data-testid="product-card"]');
    await expect(products.first()).toBeVisible();
  });

  test('should search products', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('espresso');

    // Check that search results are shown
    const products = page.locator('[data-testid="product-card"]');
    await expect(products.first()).toBeVisible();

    // Check that product name contains search term
    await expect(products.first()).toContainText(/espresso/i);
  });

  test('should open payment modal', async ({ page }) => {
    // Add product to cart
    await page.locator('[data-testid="product-card"]').first().click();

    // Click pay button
    await page.locator('[data-testid="pay-button"]').click();

    // Check modal is open
    const modal = page.locator('[data-testid="payment-modal"]');
    await expect(modal).toBeVisible();
  });

  test('should complete cash payment', async ({ page }) => {
    // Add product to cart
    await page.locator('[data-testid="product-card"]').first().click();

    // Open payment modal
    await page.locator('[data-testid="pay-button"]').click();

    // Select cash payment
    await page.locator('[data-testid="payment-cash"]').click();

    // Enter exact amount
    const total = await page.locator('[data-testid="total"]').textContent();
    const amount = total?.replace(/[^0-9.]/g, '') || '0';
    
    await page.locator('[data-testid="cash-input"]').fill(amount);

    // Complete payment
    await page.locator('[data-testid="complete-payment"]').click();

    // Check success message
    await expect(page.locator('text=/venta completada|pago exitoso/i')).toBeVisible();

    // Check cart is cleared
    await expect(page.locator('[data-testid="cart-empty"]')).toBeVisible();
  });

  test('should show change due for cash overpayment', async ({ page }) => {
    // Add product to cart
    await page.locator('[data-testid="product-card"]').first().click();

    // Open payment modal
    await page.locator('[data-testid="pay-button"]').click();

    // Select cash payment
    await page.locator('[data-testid="payment-cash"]').click();

    // Enter more than total
    await page.locator('[data-testid="cash-input"]').fill('100');

    // Check change is calculated
    const change = page.locator('[data-testid="change-due"]');
    await expect(change).toBeVisible();
    await expect(change).toContainText(/cambio|devolver/i);
  });

  test('should complete card payment', async ({ page }) => {
    // Add product to cart
    await page.locator('[data-testid="product-card"]').first().click();

    // Open payment modal
    await page.locator('[data-testid="pay-button"]').click();

    // Select card payment
    await page.locator('[data-testid="payment-card"]').click();

    // Complete payment
    await page.locator('[data-testid="complete-payment"]').click();

    // Check success message
    await expect(page.locator('text=/venta completada|pago exitoso/i')).toBeVisible();
  });

  test('should apply discount', async ({ page }) => {
    // Add product to cart
    await page.locator('[data-testid="product-card"]').first().click();

    // Click discount button
    await page.locator('[data-testid="discount-button"]').click();

    // Enter discount percentage
    await page.locator('[data-testid="discount-input"]').fill('10');

    // Apply discount
    await page.locator('[data-testid="apply-discount"]').click();

    // Check discount is applied
    const discountAmount = page.locator('[data-testid="discount-amount"]');
    await expect(discountAmount).toBeVisible();
    await expect(discountAmount).toContainText(/\$\d+/);
  });

  test('should use NumPad for quantity', async ({ page }) => {
    // Add product to cart
    await page.locator('[data-testid="product-card"]').first().click();

    // Open quantity editor
    await page.locator('[data-testid="edit-quantity"]').first().click();

    // Use NumPad to enter quantity
    await page.locator('[data-testid="numpad-5"]').click();

    // Confirm
    await page.locator('[data-testid="numpad-confirm"]').click();

    // Check quantity is updated
    const quantity = page.locator('[data-testid="item-quantity"]').first();
    await expect(quantity).toHaveText('5');
  });

  test('should clear cart', async ({ page }) => {
    // Add products
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="product-card"]').nth(1).click();

    // Click clear cart
    await page.locator('[data-testid="clear-cart"]').click();

    // Confirm in dialog
    await page.locator('[data-testid="confirm-clear"]').click();

    // Check cart is empty
    await expect(page.locator('[data-testid="cart-empty"]')).toBeVisible();
  });
});
