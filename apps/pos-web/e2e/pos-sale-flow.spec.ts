import { expect, type Locator, type Page, test } from '@playwright/test';

const POS_ROUTE = '/pos';
const TAX_RATE = 0.16; // matches TAX_RATE in src/store/cart.store.ts

// Parses es-MX currency strings like "$1,234.56" into a number.
function parseMoney(text: string): number {
  const match = text.match(/-?\$?\s?[\d,]+(?:\.\d+)?/);
  if (!match) throw new Error(`No money amount found in: "${text}"`);
  return parseFloat(match[0].replace(/[^0-9.-]/g, ''));
}

// First enabled product card in the catalog grid. ProductCard renders a
// button with aria-label `${name} - ${formatPrice(price)}`.
function productCard(page: Page): Locator {
  return page.locator('.grid button[aria-label*="$"]:not([disabled])').first();
}

const cartAside = (page: Page) => page.locator('aside');

// Totals rows in the Cart component: <div class="flex justify-between"><span>Label</span><span>$amount</span></div>
function totalsRow(page: Page, label: RegExp): Locator {
  return cartAside(page)
    .locator('div.flex.justify-between')
    .filter({ hasText: label });
}

async function readRowAmount(page: Page, label: RegExp): Promise<number> {
  const row = totalsRow(page, label);
  await expect(row).toBeVisible();
  return parseMoney(await row.locator('span').last().innerText());
}

async function addFirstProduct(page: Page): Promise<number> {
  const card = productCard(page);
  await expect(card).toBeVisible({ timeout: 15_000 });
  const label = (await card.getAttribute('aria-label')) ?? '';
  const price = parseMoney(label);
  await card.click();
  await expect(page.locator('[data-testid="cart-empty"]')).not.toBeVisible();
  return price;
}

test.describe('POS Sale Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(POS_ROUTE);
  });

  test('clicking a product adds it to the cart', async ({ page }) => {
    await expect(page.locator('[data-testid="cart-empty"]')).toBeVisible();

    const card = productCard(page);
    await expect(card).toBeVisible({ timeout: 15_000 });
    const productName = ((await card.getAttribute('aria-label')) ?? '')
      .split(' - ')[0]
      .trim();

    await card.click();

    // Cart header reflects 1 item and shows the product name
    await expect(
      cartAside(page).getByRole('heading', { name: /Carrito \(1 item/i }),
    ).toBeVisible();
    await expect(
      cartAside(page).getByRole('heading', { name: productName }),
    ).toBeVisible();
  });

  test('cart total equals price x quantity x 1.16 (IVA applied once)', async ({
    page,
  }) => {
    const price = await addFirstProduct(page);

    const subtotal = await readRowAmount(page, /^Subtotal:/);
    const tax = await readRowAmount(page, /^IVA/);
    const total = await readRowAmount(page, /^Total:/);

    // IVA is applied once over the subtotal — never compounded per item.
    expect(subtotal).toBeCloseTo(price, 1);
    expect(tax).toBeCloseTo(subtotal * TAX_RATE, 1);
    expect(total).toBeCloseTo(subtotal * (1 + TAX_RATE), 1);
    expect(Math.abs(total - (subtotal + tax))).toBeLessThanOrEqual(0.01);
  });

  test('increasing quantity with + updates the total proportionally', async ({
    page,
  }) => {
    await addFirstProduct(page);

    const totalBefore = await readRowAmount(page, /^Total:/);

    // The +/- buttons have no accessible name (icon-only); locate the plus
    // button via its lucide icon class inside the cart item row.
    const plusButton = cartAside(page)
      .locator('button:has(.lucide-plus)')
      .first();
    await plusButton.click();

    // Quantity badge in the cart header shows 2 items
    await expect(
      cartAside(page).getByRole('heading', { name: /Carrito \(2 items/i }),
    ).toBeVisible();

    const totalAfter = await readRowAmount(page, /^Total:/);
    expect(totalAfter).toBeCloseTo(totalBefore * 2, 1);
    expect(Math.abs(totalAfter - totalBefore * 2)).toBeLessThanOrEqual(0.01);
  });

  test('payment modal opens and shows the correct total', async ({ page }) => {
    await addFirstProduct(page);
    const cartTotal = await readRowAmount(page, /^Total:/);

    // The checkout button shows "Cobrar" + formatted total once cart has items
    await page.getByRole('button', { name: /Cobrar/i }).click();

    await expect(
      page.getByRole('heading', { name: /Procesar Pago/i }),
    ).toBeVisible();

    const totalLine = page.locator('p', { hasText: 'Total a cobrar:' });
    await expect(totalLine).toBeVisible();
    const modalTotal = parseMoney(await totalLine.innerText());
    expect(Math.abs(modalTotal - cartTotal)).toBeLessThanOrEqual(0.01);
  });

  test('charging without an assigned location shows an error (expected current behavior)', async ({
    page,
  }) => {
    // KNOWN LIMITATION (documented): the demo user owner@coffeedemo.mx has no
    // UserLocation (session locationId = null). useCreateOrder() in
    // src/hooks/use-pos.ts throws "El usuario no tiene una sucursal asignada"
    // before hitting the API. The onError handler reads
    // error?.response?.data?.message (an Axios shape) which is undefined for a
    // plain Error, so the toast shown to the cashier is the GENERIC
    // "Error al crear la orden" — the specific "sucursal" message is swallowed.
    // We assert the error toast appears and the cart is NOT cleared.
    await addFirstProduct(page);

    await page.getByRole('button', { name: /Cobrar/i }).click();
    await expect(
      page.getByRole('heading', { name: /Procesar Pago/i }),
    ).toBeVisible();

    // Card payments are always "exact", so Confirmar Pago enables immediately.
    // ("Tarjeta Débito o crédito" — avoid matching the "Mixto Efectivo + Tarjeta" button)
    await page
      .getByRole('button', { name: /Tarjeta Débito o crédito/i })
      .click();
    const confirm = page.getByRole('button', { name: /Confirmar Pago/i });
    await expect(confirm).toBeEnabled();
    await confirm.click();

    // Error toast (generic message wraps the missing-location error)
    await expect(
      page.getByText(/Error al crear la orden|sucursal/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // The sale did not complete: cart still has the item after closing modal
    await page.getByRole('button', { name: /^Atrás$/ }).click();
    await page.getByRole('button', { name: /^Cancelar$/ }).click();
    await expect(
      cartAside(page).getByRole('heading', { name: /Carrito \(1 item/i }),
    ).toBeVisible();
  });

  test('clearing the cart returns to the empty state', async ({ page }) => {
    await addFirstProduct(page);
    await expect(
      cartAside(page).getByRole('heading', { name: /Carrito \(1 item/i }),
    ).toBeVisible();

    await cartAside(page)
      .getByRole('button', { name: /Limpiar/i })
      .click();

    await expect(page.locator('[data-testid="cart-empty"]')).toBeVisible();
    // Checkout button reverts to the disabled "Agregar productos" state
    await expect(
      page.getByRole('button', { name: /Agregar productos/i }),
    ).toBeDisabled();
  });
});
