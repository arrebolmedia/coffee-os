import { test, expect } from '@playwright/test';

test.describe('Offline Mode', () => {
  test.beforeEach(async ({ page, context }) => {
    // Navigate to POS page
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');
    
    // Wait for Service Worker to be registered
    await page.waitForTimeout(2000);
  });

  test('should show online indicator when connected', async ({ page }) => {
    const indicator = page.locator('[data-testid="offline-indicator"]');
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText(/en línea|online/i);
  });

  test('should show offline indicator when disconnected', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Check offline indicator
    const indicator = page.locator('[data-testid="offline-indicator"]');
    await expect(indicator).toContainText(/sin conexión|offline/i);
  });

  test('should load cached products when offline', async ({ page, context }) => {
    // First, ensure products are loaded and cached
    const products = page.locator('[data-testid="product-card"]');
    await expect(products.first()).toBeVisible();
    
    // Wait for cache to be populated
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check products are still visible from cache
    await expect(products.first()).toBeVisible();
  });

  test('should create order offline and add to sync queue', async ({ page, context }) => {
    // Add product to cart
    await page.locator('[data-testid="product-card"]').first().click();

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Complete payment
    await page.locator('[data-testid="pay-button"]').click();
    await page.locator('[data-testid="payment-cash"]').click();
    await page.locator('[data-testid="cash-input"]').fill('100');
    await page.locator('[data-testid="complete-payment"]').click();

    // Check success message
    await expect(page.locator('text=/venta completada|guardada localmente/i')).toBeVisible();

    // Open offline indicator modal
    await page.locator('[data-testid="offline-indicator"]').click();

    // Check sync queue has 1 item
    const queueCount = page.locator('[data-testid="sync-queue-count"]');
    await expect(queueCount).toContainText('1');
  });

  test('should sync pending orders when back online', async ({ page, context }) => {
    // Add product and create order while online
    await page.locator('[data-testid="product-card"]').first().click();

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Complete payment offline
    await page.locator('[data-testid="pay-button"]').click();
    await page.locator('[data-testid="payment-cash"]').click();
    await page.locator('[data-testid="cash-input"]').fill('100');
    await page.locator('[data-testid="complete-payment"]').click();

    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(3000); // Wait for auto-sync

    // Open offline indicator modal
    await page.locator('[data-testid="offline-indicator"]').click();

    // Check sync queue is empty or shows success
    const syncStatus = page.locator('[data-testid="sync-status"]');
    await expect(syncStatus).toContainText(/sincronizado|todos los cambios/i);
  });

  test('should show database stats in offline modal', async ({ page }) => {
    // Open offline indicator modal
    await page.locator('[data-testid="offline-indicator"]').click();

    // Check database stats are visible
    await expect(page.locator('[data-testid="db-stats-products"]')).toBeVisible();
    await expect(page.locator('[data-testid="db-stats-categories"]')).toBeVisible();
    await expect(page.locator('[data-testid="db-stats-orders"]')).toBeVisible();
  });

  test('should manually trigger sync', async ({ page, context }) => {
    // Create order offline
    await page.locator('[data-testid="product-card"]').first().click();
    await context.setOffline(true);
    await page.locator('[data-testid="pay-button"]').click();
    await page.locator('[data-testid="payment-cash"]').click();
    await page.locator('[data-testid="cash-input"]').fill('100');
    await page.locator('[data-testid="complete-payment"]').click();

    // Go back online
    await context.setOffline(false);

    // Open offline modal
    await page.locator('[data-testid="offline-indicator"]').click();

    // Click manual sync button
    await page.locator('[data-testid="manual-sync-button"]').click();

    // Check syncing indicator appears
    await expect(page.locator('[data-testid="syncing-indicator"]')).toBeVisible();

    // Wait for sync to complete
    await page.waitForTimeout(2000);

    // Check sync completed
    await expect(page.locator('text=/sincronización completada/i')).toBeVisible();
  });

  test('should show offline fallback page when app shell fails', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Try to navigate to a non-cached route
    await page.goto('/pos/reports');

    // Should see offline page
    await expect(page.locator('text=/sin conexión/i')).toBeVisible();
    await expect(page.locator('text=/funcionalidades disponibles/i')).toBeVisible();
  });

  test('should search products offline from IndexedDB', async ({ page, context }) => {
    // Load products first
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Search for product
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('espresso');
    await page.waitForTimeout(500);

    // Check results are shown from cache
    const products = page.locator('[data-testid="product-card"]');
    await expect(products.first()).toBeVisible();
  });

  test('should filter products by category offline', async ({ page, context }) => {
    // Load page first
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Click category filter
    await page.locator('[data-testid="category-filter"]').first().click();

    // Check filtered products are shown
    const products = page.locator('[data-testid="product-card"]');
    await expect(products.first()).toBeVisible();
  });

  test('should persist cart across page reloads', async ({ page }) => {
    // Add products to cart
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="product-card"]').nth(1).click();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check cart still has items
    const cartCount = page.locator('[data-testid="cart-count"]');
    await expect(cartCount).toHaveText('2');
  });

  test('should show sync error if server is unreachable', async ({ page, context }) => {
    // Create order offline
    await page.locator('[data-testid="product-card"]').first().click();
    await context.setOffline(true);
    await page.locator('[data-testid="pay-button"]').click();
    await page.locator('[data-testid="payment-cash"]').click();
    await page.locator('[data-testid="cash-input"]').fill('100');
    await page.locator('[data-testid="complete-payment"]').click();

    // Stay offline but try to sync
    await page.locator('[data-testid="offline-indicator"]').click();
    await page.locator('[data-testid="manual-sync-button"]').click();

    // Should show error
    await expect(page.locator('text=/error de sincronización|no se pudo conectar/i')).toBeVisible();
  });
});
