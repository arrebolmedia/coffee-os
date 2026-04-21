import { test, expect } from '@playwright/test';

const POS_ROUTE = '/pos';

test.describe('POS Shell Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(POS_ROUTE);
  });

  test('renders POS header and offline indicator', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Punto de Venta/i }),
    ).toBeVisible();
    await expect(page.getByText(/Sistema POS/i)).toBeVisible();

    // Offline indicator renders with accessible label once hydrated
    const indicator = page.getByRole('button', { name: /Estado de conexión/i });
    await expect(indicator).toBeVisible();
  });

  test('exposes search input and category filter controls', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Buscar productos"]');
    await expect(searchInput).toBeVisible();

    const categoryFilter = page.getByRole('button', { name: /Todos/i });
    await expect(categoryFilter).toBeVisible();
  });

  test('shows empty cart call to action by default', async ({ page }) => {
    await expect(page.getByText(/Agregar productos/i)).toBeVisible();
    await expect(page.locator('[data-testid="cart-empty"]')).toBeVisible();
  });
});
