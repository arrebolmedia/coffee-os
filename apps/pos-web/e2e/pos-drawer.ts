import type { Page } from '@playwright/test';

/**
 * Deja el carrito a la vista antes de tocar sus controles.
 *
 * A partir de `lg` el carrito es una columna fija al lado del catálogo y no hay
 * nada que abrir: el botón que lo gobierna lleva `lg:hidden`, así que en
 * escritorio esta función no hace nada. Por debajo es un panel que se abre y se
 * cierra, y arranca cerrado —el POS tiene que abrirse sobre los productos—, de
 * modo que pulsar «+», «Cobrar» o «Limpiar» sin abrirlo antes es pulsar algo
 * que está fuera de la pantalla.
 *
 * Es el mismo gesto que haría un barista con el teléfono en la mano.
 */
export async function abrirCarrito(page: Page): Promise<void> {
  const boton = page.getByRole('button', { name: /Ver carrito/i });

  if (await boton.isVisible().catch(() => false)) {
    await boton.click();
    // El panel entra con una transición de 300 ms; sin esperarla, el clic
    // siguiente puede aterrizar sobre el sitio por el que va pasando.
    await page.waitForTimeout(400);
  }
}
