import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * Los tres botones de cada fila de la tabla de productos.
 *
 * Estaban pintados sin `onClick`: se veían accionables y no hacían nada. El del
 * lápiz se conectó al diálogo de régimen fiscal; aquí se cubren los otros dos.
 *
 * El producto de prueba se crea y se borra por la interfaz, que es justamente
 * lo que hay que comprobar del botón de la papelera.
 */

const API = 'http://localhost:4000/api/v1';

async function login(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'owner@coffeedemo.mx', password: 'password123' },
  });
  expect(res.ok(), 'el login de la API debe funcionar').toBeTruthy();
  const body = await res.json();
  return {
    token: body.accessToken as string,
    organizationId: body.user.organizationId as string,
  };
}

test.describe('Acciones de la tabla de productos', () => {
  let token: string;
  let organizationId: string;
  let sku: string;
  let nombre: string;

  test.beforeEach(async ({ request }) => {
    ({ token, organizationId } = await login(request));

    const cats = await request.get(`${API}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const lista = await cats.json();
    const categoria = (Array.isArray(lista) ? lista : (lista.data ?? []))[0];

    sku = `E2E-ACC-${Date.now()}`;
    nombre = `Producto de prueba ${sku}`;
    const creado = await request.post(`${API}/products`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        organization_id: organizationId,
        category_id: categoria.id,
        sku,
        name: nombre,
        description: 'Creado por el e2e de acciones de productos',
        base_price: 33,
        cost: 11,
        tax_rate: 0,
      },
    });
    expect(creado.status(), 'el producto de prueba debe crearse').toBe(201);
  });

  test('el ojo abre la ficha con lo que la fila recorta', async ({ page }) => {
    await page.goto('/products');

    const fila = page.locator('tr', { hasText: nombre }).first();
    await expect(fila).toBeVisible({ timeout: 20_000 });

    await fila.getByRole('button', { name: /Ver la ficha/i }).click();

    const ficha = page.getByRole('dialog');
    await expect(ficha).toBeVisible();
    await expect(ficha).toContainText(sku);
    // La tasa 0 del producto se ve completa en la ficha.
    await expect(ficha).toContainText('Tasa 0');
    await expect(ficha).toContainText('Creado por el e2e');
  });

  test('la papelera pide confirmación y cancelar no borra', async ({
    page,
    request,
  }) => {
    await page.goto('/products');

    const fila = page.locator('tr', { hasText: nombre }).first();
    await expect(fila).toBeVisible({ timeout: 20_000 });
    await fila.getByRole('button', { name: /Eliminar/i }).click();

    await expect(page.getByText(/¿Eliminar «/)).toBeVisible();
    await page.getByRole('button', { name: /Cancelar/i }).click();

    // Sigue existiendo en la base.
    const res = await request.get(`${API}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const lista = await res.json();
    const skus = (Array.isArray(lista) ? lista : (lista.data ?? [])).map(
      (p: any) => p.sku,
    );
    expect(skus).toContain(sku);
  });

  test('confirmar borra el producto de verdad', async ({ page, request }) => {
    await page.goto('/products');

    const fila = page.locator('tr', { hasText: nombre }).first();
    await expect(fila).toBeVisible({ timeout: 20_000 });
    await fila.getByRole('button', { name: /Eliminar/i }).click();

    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Eliminar$/ })
      .click();

    await expect(page.getByText(/eliminado exitosamente/i)).toBeVisible({
      timeout: 15_000,
    });

    // Y ya no está en la base: el botón no se limita a quitarlo de la pantalla.
    await expect
      .poll(
        async () => {
          const res = await request.get(`${API}/products`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const lista = await res.json();
          return (Array.isArray(lista) ? lista : (lista.data ?? [])).map(
            (p: any) => p.sku,
          );
        },
        { timeout: 15_000 },
      )
      .not.toContain(sku);
  });

  test.afterEach(async ({ request }) => {
    // Si el test no llegó a borrarlo, se limpia aquí.
    const res = await request.get(`${API}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const lista = await res.json();
    const sobrante = (Array.isArray(lista) ? lista : (lista.data ?? [])).find(
      (p: any) => p.sku === sku,
    );
    if (sobrante) {
      await request.delete(`${API}/products/${sobrante.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});
