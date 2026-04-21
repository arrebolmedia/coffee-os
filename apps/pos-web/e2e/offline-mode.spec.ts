import { test, expect } from '@playwright/test';

const POS_ROUTE = '/pos';

test.describe('Offline Indicator', () => {
  test('reflects connectivity changes', async ({ page, context }) => {
    await page.goto(POS_ROUTE);

    const indicator = page.locator('[aria-label^="Estado de conexión"]');

    await expect(indicator).toBeVisible({ timeout: 10000 });

    // Simulate offline
    await context.setOffline(true);
    await page.waitForTimeout(200);
    await expect(indicator).toContainText(/Sin conexión|offline/i);

    // Back online
    await context.setOffline(false);
    await page.waitForTimeout(200);
    await expect(indicator).toContainText(/En línea|online/i);
  });

  test('opens modal with connectivity details', async ({ page }) => {
    await page.goto(POS_ROUTE);

    const indicator = page.locator('[aria-label^="Estado de conexión"]');
    await indicator
      .first()
      .evaluate((button) => (button as HTMLButtonElement).click());

    await expect(
      page.getByRole('heading', { name: /Estado de Conexión/i }),
    ).toBeVisible();
    await expect(page.getByText(/Sincronización/i)).toBeVisible();

    // Close modal via close button (×)
    await page.getByRole('button', { name: '×' }).click();
    await expect(
      page.getByRole('heading', { name: /Estado de Conexión/i }),
    ).not.toBeVisible();
  });
});
