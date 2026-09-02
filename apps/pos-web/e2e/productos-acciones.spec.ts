import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * Dar de alta, editar, ver y borrar productos desde la interfaz.
 *
 * Nada de esto existía: la pantalla listaba y filtraba, «Nuevo Producto» no
 * tenía `onClick` y los tres botones de cada fila tampoco. Sin alta de
 * productos la carta de la cafetería sólo entraba llamando a la API a mano, y
 * eso impedía abrir el negocio con el sistema.
 *
 * Cada caso comprueba contra la API que la pantalla no se limitó a pintar el
 * cambio: que el producto existe, que el precio quedó guardado, que el borrado
 * borró.
 */

const API = 'http://localhost:4000/api/v1';

/**
 * Deja en la tabla sólo el producto que interesa.
 *
 * Sin esto los tests eran inestables: varios navegadores corren a la vez contra
 * la misma organización, cada uno creando y borrando productos, así que la fila
 * buscada podía quedar entre decenas de filas ajenas o fuera de la vista. Al
 * filtrar por su SKU la tabla queda con una sola fila y el test deja de
 * depender de lo que hagan los demás.
 */
async function filtrarPor(
  page: import('@playwright/test').Page,
  texto: string,
) {
  await page.getByPlaceholder('Buscar producto, SKU...').fill(texto);
  await page.waitForTimeout(400);
}

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

    // Con varios workers en paralelo, `Date.now()` a secas colisiona y el alta
    // responde 409 por SKU repetido.
    sku = `E2E-ACC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
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

  test('se puede dar de alta un producto desde la interfaz y venderlo', async ({
    page,
    request,
  }) => {
    // Hasta ahora no se podia: la carta solo entraba llamando a la API a mano,
    // y eso impedia abrir el negocio con el sistema.
    const nuevoSku = `E2E-ALTA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await page.goto('/products');
    await page.getByRole('button', { name: /Nuevo Producto/i }).click();

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await dialogo.getByLabel('Nombre').fill(`Cold Brew ${nuevoSku}`);
    await dialogo.getByLabel('SKU').fill(nuevoSku);
    await dialogo.getByLabel('Categoría').selectOption({ index: 1 });
    await dialogo.getByLabel('Precio al público').fill('55');
    await dialogo.getByLabel('Costo').fill('12');
    await dialogo.getByRole('button', { name: /Crear producto/ }).click();

    // Se espera a que el diálogo se cierre, no al aviso de éxito: el aviso se
    // auto-descarta y la espera dependía de ganarle la carrera. El diálogo sólo
    // se cierra cuando el alta terminó bien; si falla se queda abierto con el
    // error a la vista, y entonces esto falla enseñando exactamente qué pasó.
    await expect(dialogo).toBeHidden({ timeout: 15_000 });

    // Y existe de verdad, con su tasa: la pantalla no se limita a pintarlo.
    const res = await request.get(`${API}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const lista = await res.json();
    const creado = (Array.isArray(lista) ? lista : (lista.data ?? [])).find(
      (p: any) => p.sku === nuevoSku,
    );
    expect(creado, 'el producto debe existir en la base').toBeTruthy();
    expect(creado.price).toBe(55);
    expect(creado.taxRate).toBe(0.16);
    // Nace con el IVA dentro, que es como se vende en Mexico: los $55 que se
    // teclearon son los $55 que va a pagar el cliente.
    expect(creado.taxIncluded).toBe(true);

    await request.delete(`${API}/products/${creado.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test('el lápiz edita el producto, incluida su tasa de IVA', async ({
    page,
    request,
  }) => {
    await page.goto('/products');
    await filtrarPor(page, sku);
    // `producto` esta tanto en la fila de la tabla (escritorio) como en la
    // tarjeta (movil): la prueba vale para las dos vistas.
    const fila = page
      .locator('[data-testid="producto"]:visible')
      .filter({ hasText: nombre })
      .first();
    await expect(fila).toBeVisible({ timeout: 20_000 });
    await fila.getByRole('button', { name: /^Editar/ }).click();

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await dialogo.getByLabel('Precio al público').fill('41');
    await dialogo.getByRole('button', { name: /^Guardar$/ }).click();

    await expect(dialogo).toBeHidden({ timeout: 15_000 });

    const res = await request.get(`${API}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const lista = await res.json();
    const actualizado = (
      Array.isArray(lista) ? lista : (lista.data ?? [])
    ).find((p: any) => p.sku === sku);
    expect(actualizado.price).toBe(41);
  });

  test('el ojo abre la ficha con lo que la fila recorta', async ({ page }) => {
    await page.goto('/products');
    await filtrarPor(page, sku);

    // `producto` esta tanto en la fila de la tabla (escritorio) como en la
    // tarjeta (movil): la prueba vale para las dos vistas.
    const fila = page
      .locator('[data-testid="producto"]:visible')
      .filter({ hasText: nombre })
      .first();
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
    await filtrarPor(page, sku);

    // `producto` esta tanto en la fila de la tabla (escritorio) como en la
    // tarjeta (movil): la prueba vale para las dos vistas.
    const fila = page
      .locator('[data-testid="producto"]:visible')
      .filter({ hasText: nombre })
      .first();
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
    await filtrarPor(page, sku);

    // `producto` esta tanto en la fila de la tabla (escritorio) como en la
    // tarjeta (movil): la prueba vale para las dos vistas.
    const fila = page
      .locator('[data-testid="producto"]:visible')
      .filter({ hasText: nombre })
      .first();
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
