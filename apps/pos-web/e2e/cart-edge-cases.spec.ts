import { expect, type Locator, type Page, test } from '@playwright/test';

const POS_ROUTE = '/pos';

function parseMoney(text: string): number {
  const match = text.match(/-?\$?\s?[\d,]+(?:\.\d+)?/);
  if (!match) throw new Error(`No money amount found in: "${text}"`);
  return parseFloat(match[0].replace(/[^0-9.-]/g, ''));
}

function productCard(page: Page): Locator {
  return page.locator('.grid button[aria-label*="$"]:not([disabled])').first();
}

const cartAside = (page: Page) => page.locator('aside');

async function addFirstProduct(page: Page): Promise<void> {
  const card = productCard(page);
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.click();
  await expect(page.locator('[data-testid="cart-empty"]')).not.toBeVisible();
}

async function readTotal(page: Page): Promise<number> {
  const row = cartAside(page)
    .locator('div.flex.justify-between')
    .filter({ hasText: /^Total:/ });
  await expect(row).toBeVisible();
  return parseMoney(await row.locator('span').last().innerText());
}

test.describe('Cart Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(POS_ROUTE);
  });

  test('checkout button is disabled when the cart is empty', async ({
    page,
  }) => {
    await expect(page.locator('[data-testid="cart-empty"]')).toBeVisible();

    // With 0 items the checkout button renders "Agregar productos" and is
    // disabled — there is no enabled "Cobrar" button anywhere.
    await expect(
      page.getByRole('button', { name: /Agregar productos/i }),
    ).toBeDisabled();
    await expect(page.getByRole('button', { name: /Cobrar/i })).toHaveCount(0);
  });

  test('minus button is disabled at quantity 1 (cannot reach 0 from the UI)', async ({
    page,
  }) => {
    await addFirstProduct(page);

    // Icon-only buttons: locate via lucide icon classes inside the cart row.
    const minusButton = cartAside(page)
      .locator('button:has(.lucide-minus)')
      .first();
    const plusButton = cartAside(page)
      .locator('button:has(.lucide-plus)')
      .first();

    // Implementation: CartItemRow disables "-" when quantity <= 1, so the UI
    // never lets quantity hit 0 (removal is done via the X / "Eliminar" button).
    await expect(minusButton).toBeDisabled();

    // Raise to 2 → "-" becomes enabled
    await plusButton.click();
    await expect(
      cartAside(page).getByRole('heading', { name: /Carrito \(2 items/i }),
    ).toBeVisible();
    await expect(minusButton).toBeEnabled();

    // Lower back to 1 → "-" disabled again and the item is still in the cart
    await minusButton.click();
    await expect(
      cartAside(page).getByRole('heading', { name: /Carrito \(1 item/i }),
    ).toBeVisible();
    await expect(minusButton).toBeDisabled();
    await expect(page.locator('[data-testid="cart-empty"]')).not.toBeVisible();
  });

  test('removing the item via X empties the cart cleanly', async ({ page }) => {
    await addFirstProduct(page);

    await cartAside(page)
      .getByRole('button', { name: /Eliminar/i })
      .first()
      .click();

    await expect(page.locator('[data-testid="cart-empty"]')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Agregar productos/i }),
    ).toBeDisabled();
  });

  test('total is never displayed as a negative amount', async ({ page }) => {
    await addFirstProduct(page);

    // With items, the displayed total must be > 0
    const total = await readTotal(page);
    expect(total).toBeGreaterThan(0);

    // No negative currency anywhere in the cart sidebar
    await expect(cartAside(page).getByText(/-\$\s?\d/)).toHaveCount(0);

    // After clearing, no totals are rendered at all (empty state), so no
    // negative value can be displayed either.
    await cartAside(page)
      .getByRole('button', { name: /Limpiar/i })
      .click();
    await expect(page.locator('[data-testid="cart-empty"]')).toBeVisible();
    await expect(cartAside(page).getByText(/^Total:/)).toHaveCount(0);
  });
});
