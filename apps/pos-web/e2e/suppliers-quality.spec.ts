import { test, expect } from '@playwright/test';

const SUPPLIERS_ROUTE = '/suppliers';
const QUALITY_ROUTE = '/quality';

test.describe('Suppliers Dashboard Smoke', () => {
  test('renders header and filters', async ({ page }) => {
    await page.goto(SUPPLIERS_ROUTE, { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { name: /Proveedores/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/Gestión de proveedores/i)).toBeVisible();

    await expect(page.locator('input[placeholder*="Buscar" i]')).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();

    // Stats cards fall back to zero state when no data is available
    await expect(page.getByText(/Total Proveedores/i)).toBeVisible();
  });

  test('surfaces supplier actions', async ({ page }) => {
    await page.goto(SUPPLIERS_ROUTE, { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('button', { name: /Nuevo Proveedor/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Exportar/i })).toBeVisible();
  });
});

test.describe('Quality Dashboard Smoke', () => {
  test('renders compliance summary', async ({ page }) => {
    await page.goto(QUALITY_ROUTE, { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { name: /Control de Calidad/i, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: /Estado de Cumplimiento NOM-251/i,
        level: 2,
      }),
    ).toBeVisible();
  });

  test('shows actions panel access', async ({ page }) => {
    await page.goto(QUALITY_ROUTE, { waitUntil: 'domcontentloaded' });

    const newChecklist = page.getByRole('button', { name: /Nuevo Checklist/i });
    await expect(newChecklist).toBeVisible();
  });
});
