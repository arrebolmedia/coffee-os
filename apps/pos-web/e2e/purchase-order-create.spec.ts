import { expect, test } from '@playwright/test';

/**
 * Covers the "Nueva Orden" → PurchaseOrderFormModal create flow.
 *
 * The button was previously inert (no onClick). This verifies the modal opens,
 * exposes the supplier select, and validates input. If the seed has at least
 * one supplier and one inventory item, it also submits and asserts the success
 * toast or that the modal closes. If the seed lacks those, the test only
 * asserts the modal opens and the submit button stays disabled (documented).
 */

const ROUTE = '/purchase-orders';

// Opens the create modal robustly: waits for the page to hydrate (its own
// heading visible) before clicking, otherwise the onClick handler may not be
// attached yet on a cold dev server and the click is a no-op.
async function openModal(page: import('@playwright/test').Page) {
  await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('heading', { name: /Órdenes de Compra/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Nueva Orden/i }).click();
  await expect(
    page.getByRole('heading', { name: /Nueva Orden de Compra/i }),
  ).toBeVisible();
}

test.describe('Purchase Order Create Modal', () => {
  test('opens the modal and shows the supplier select', async ({ page }) => {
    await openModal(page);

    const supplierSelect = page.locator('#supplier_id');
    await expect(supplierSelect).toBeVisible();

    // With no supplier and no valid item selected, "Crear Orden" is disabled.
    const submit = page.getByRole('button', { name: /Crear Orden/i });
    await expect(submit).toBeDisabled();
  });

  test('creates an order when seed data exists, else validates', async ({
    page,
  }) => {
    await openModal(page);

    const supplierSelect = page.locator('#supplier_id');
    await expect(supplierSelect).toBeVisible();

    // Real supplier options (skip the placeholder "" value).
    const supplierValues = (
      await supplierSelect
        .locator('option')
        .evaluateAll((opts) =>
          (opts as HTMLOptionElement[]).map((o) => o.value),
        )
    ).filter((v) => v !== '');

    const itemSelect = page.getByLabel('Insumo 1');
    const itemValues = (
      await itemSelect
        .locator('option')
        .evaluateAll((opts) =>
          (opts as HTMLOptionElement[]).map((o) => o.value),
        )
    ).filter((v) => v !== '');

    const submit = page.getByRole('button', { name: /Crear Orden/i });

    if (supplierValues.length === 0 || itemValues.length === 0) {
      // Documented fallback: no seed suppliers/items → only assert validation.
      test.info().annotations.push({
        type: 'note',
        description:
          'Seed lacks suppliers and/or inventory items; verified modal opens and submit stays disabled.',
      });
      await expect(submit).toBeDisabled();
      return;
    }

    // Fill a valid order: supplier + one line (item + qty + price).
    await supplierSelect.selectOption(supplierValues[0]);
    await itemSelect.selectOption(itemValues[0]);
    await page.getByLabel('Cantidad 1').fill('2');

    // Selecting an item pre-fills unit price from cost_per_unit; if it was 0/empty,
    // set an explicit price so the line is valid.
    const priceInput = page.getByLabel('Precio unitario 1');
    const currentPrice = await priceInput.inputValue();
    if (!currentPrice || Number(currentPrice) <= 0) {
      await priceInput.fill('10');
    }

    await expect(submit).toBeEnabled();
    await submit.click();

    // Success: either the toast appears or the modal closes (onSuccess closes it).
    const successToast = page.getByText(/creada exitosamente/i);
    const modalHeading = page.getByRole('heading', {
      name: /Nueva Orden de Compra/i,
    });

    await Promise.race([
      successToast.waitFor({ state: 'visible', timeout: 15_000 }),
      modalHeading.waitFor({ state: 'hidden', timeout: 15_000 }),
    ]);

    // Final assertion: the modal is gone (created and closed).
    await expect(modalHeading).toBeHidden();
  });
});
