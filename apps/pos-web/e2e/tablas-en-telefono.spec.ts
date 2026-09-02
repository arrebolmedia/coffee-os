import { expect, test } from '@playwright/test';

/**
 * Las tablas en un telefono.
 *
 * Ninguna pantalla desborda ya el viewport, pero eso no es lo mismo que ser
 * usable: la tabla de productos mide 1427 px dentro de una columna de 325, o
 * sea cuatro pantallas de arrastre para leer una sola fila. `overflow-x` evita
 * que la pagina se rompa y ahi se acaba su merito.
 *
 * Debajo de `md` va una tarjeta por registro con lo que se consulta de pie en
 * el mostrador. Estas comprobaciones corren en los proyectos moviles (375 px) y
 * se saltan en escritorio, que es donde la tabla si cabe.
 */
const ANCHO_MOVIL = 768;

test.describe('Las tablas se leen en un telefono', () => {
  test('productos enseña tarjetas, no una tabla de nueve columnas', async ({
    page,
  }, testInfo) => {
    const ancho = testInfo.project.use.viewport?.width ?? 1280;
    test.skip(ancho >= ANCHO_MOVIL, 'en escritorio la tabla si cabe');

    await page.goto('/products');

    const tarjetas = page.locator('article');
    await expect(
      tarjetas.first(),
      'debe haber una tarjeta por producto',
    ).toBeVisible({ timeout: 25_000 });

    // La tabla existe en el DOM para escritorio, pero no se enseña aqui.
    await expect(page.locator('table')).toBeHidden();

    // La tarjeta trae lo que hace falta de pie en el mostrador.
    const primera = tarjetas.first();
    await expect(primera).toContainText(/\$\d/);

    // Y las acciones siguen ahi.
    await expect(
      primera.getByRole('button', { name: /^Editar /i }),
    ).toBeVisible();
    await expect(
      primera.getByRole('button', { name: /^Eliminar /i }),
    ).toBeVisible();

    // Nada de arrastrar la pagina de lado.
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(desborda, 'la pagina no se arrastra de lado').toBe(false);
  });

  test('el inventario se revisa de pie, sin arrastrar la tabla', async ({
    page,
  }, testInfo) => {
    const ancho = testInfo.project.use.viewport?.width ?? 1280;
    test.skip(ancho >= ANCHO_MOVIL, 'en escritorio la tabla si cabe');

    await page.goto('/inventory');

    const tarjetas = page.locator('article');
    await expect(tarjetas.first()).toBeVisible({ timeout: 25_000 });

    // La lista principal de insumos. La pantalla tiene ademas una tabla de
    // comparacion de stock teorico que sigue siendo tabla en movil: esta
    // comprobacion no la cubre, y esta anotado como pendiente.
    await expect(page.getByTestId('tabla-insumos')).toBeHidden();

    // Lo que se mira de pie: cuanto queda y si esta bajo.
    await expect(tarjetas.first()).toContainText(/m.n\./i);
    await expect(
      tarjetas.first().getByRole('button', { name: /^Editar /i }),
    ).toBeVisible();

    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(desborda, 'la pagina no se arrastra de lado').toBe(false);
  });

  test('las comandas se avanzan sin perseguir el boton de lado a lado', async ({
    page,
  }, testInfo) => {
    const ancho = testInfo.project.use.viewport?.width ?? 1280;
    test.skip(ancho >= ANCHO_MOVIL, 'en escritorio la tabla si cabe');

    await page.goto('/orders');

    // Puede no haber comandas abiertas; lo que se comprueba es que cuando las
    // hay se enseñan como tarjetas y no como una tabla de siete columnas.
    const tarjetas = page.locator('article');
    const vacio = page.getByText(/No hay .rdenes|aparecer.n aqu./i);

    await expect(tarjetas.first().or(vacio.first())).toBeVisible({
      timeout: 25_000,
    });

    if (
      await tarjetas
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(page.locator('table')).toBeHidden();
      await expect(tarjetas.first()).toContainText(/\$\d/);
    }

    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(desborda, 'la pagina no se arrastra de lado').toBe(false);
  });
});
