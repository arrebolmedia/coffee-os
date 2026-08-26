import { expect, test } from '@playwright/test';

/**
 * Smoke coverage for the pages whose frontend↔backend contracts were realigned
 * (commit 268473a) plus the Orders page unblocked by re-enabling OrdersModule
 * (commit 408798f). Each previously rendered "Sin nombre"/$NaN, crashed on a
 * missing nested field, or 404'd. This asserts they mount, reach a settled
 * state, and surface no client error overlay — the regression these fixes target.
 */

const PAGES: Array<{ path: string; heading: RegExp }> = [
  { path: '/inventory', heading: /Inventario/i },
  { path: '/products', heading: /Productos/i },
  { path: '/customers', heading: /Clientes/i },
  { path: '/expenses', heading: /Gastos/i },
  { path: '/suppliers', heading: /Proveedores/i },
  { path: '/locations', heading: /Sucursales|Ubicaciones/i },
  { path: '/orders', heading: /[OÓ]rdenes/i },
  { path: '/recipes', heading: /Recetas/i },
  { path: '/purchase-orders', heading: /Compras|[OÓ]rdenes de Compra/i },
];

for (const { path, heading } of PAGES) {
  test(`${path} renders without crashing`, async ({ page }) => {
    const clientErrors: string[] = [];
    page.on('pageerror', (e) => clientErrors.push(e.message));

    await page.goto(path);
    await page.waitForLoadState('networkidle');

    // The page heading must be present (the app shell + page body mounted).
    await expect(
      page.getByRole('heading', { name: heading }).first(),
    ).toBeVisible();

    // El overlay de error de Next vive dentro de <nextjs-portal>. Comprobar la
    // existencia del portal dejo de servir en Next 15: ahora se renderiza
    // SIEMPRE, porque tambien aloja el indicador de dev tools, asi que estas 9
    // paginas pasaron a fallar sin haberse roto. Lo que distingue un error es el
    // dialogo de dentro. Verificado en ambos sentidos contra una pagina que
    // lanza a proposito (1 dialogo) y una sana (0).
    await expect(
      page.locator('nextjs-portal [data-nextjs-dialog]'),
    ).toHaveCount(0);
    expect(clientErrors, `client errors on ${path}`).toEqual([]);
  });
}
