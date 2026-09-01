import { type APIRequestContext, expect, test } from '@playwright/test';
import { abrirCarrito } from './pos-drawer';

/**
 * La venta completa, contra el stack real: cobrar en el POS por interfaz y
 * comprobar en la base que la orden existe y que el inventario bajó.
 *
 * Los demás specs de esta carpeta son smoke de interfaz: comprueban que las
 * pantallas montan y que la aritmética del carrito cuadra, pero **ninguno
 * completaba una venta**. Hasta agosto no podían: cobrar fallaba porque el
 * login no devolvía la sucursal del usuario. Este es el flujo que cruza los
 * módulos con deuda —POS, órdenes, recetas, inventario— y por eso sirve de red
 * de seguridad para todo lo demás.
 *
 * El paso de cocina va por interfaz, en /orders: PENDING → IN_PROGRESS →
 * READY → SERVED, que es lo que hace el barista. Durante un tiempo tuvo que ir
 * por API porque esa pantalla era de solo lectura y no habia nada que conducir.
 */

const API = 'http://localhost:4000/api/v1';

interface Ingrediente {
  inventory_item_id: string;
  inventory_item_name: string;
  quantity: number;
  unit: string;
}

async function login(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'owner@coffeedemo.mx', password: 'password123' },
  });
  expect(res.ok(), 'el login de la API debe funcionar').toBeTruthy();
  const body = await res.json();
  return {
    token: body.accessToken as string,
    locationId: (body.user?.locationId ?? body.locationId) as string,
  };
}

function auth(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/** Existencia actual de un insumo, leída de la API. */
async function stockDe(
  request: APIRequestContext,
  token: string,
  itemId: string,
): Promise<number> {
  const res = await request.get(`${API}/inventory/${itemId}`, auth(token));
  expect(res.ok(), `debe poder leerse el insumo ${itemId}`).toBeTruthy();
  const item = await res.json();
  const stock = item.current_stock ?? item.currentStock ?? item.stock;
  expect(typeof stock, 'el insumo debe traer existencia numérica').toBe(
    'number',
  );
  return stock as number;
}

test.describe('Venta completa punta a punta', () => {
  test('cobrar en el POS crea la orden y descuenta los insumos', async ({
    page,
    request,
  }) => {
    const { token, locationId } = await login(request);
    expect(locationId, 'el login debe devolver la sucursal').toBeTruthy();

    // --- Elegir un producto que tenga receta activa con insumos -------------
    const recetasRes = await request.get(`${API}/recipes`, auth(token));
    expect(recetasRes.ok()).toBeTruthy();
    const recetas = await recetasRes.json();
    const receta = (Array.isArray(recetas) ? recetas : []).find(
      (r: { product_id?: string; ingredients?: Ingrediente[] }) =>
        r.product_id && (r.ingredients?.length ?? 0) > 0,
    );
    expect(
      receta,
      'el seed debe traer al menos una receta activa ligada a un producto',
    ).toBeTruthy();

    const productosRes = await request.get(`${API}/products`, auth(token));
    const productos = await productosRes.json();
    const lista = Array.isArray(productos)
      ? productos
      : (productos.items ?? productos.data ?? []);
    const producto = lista.find(
      (p: { id: string }) => p.id === receta.product_id,
    );
    expect(
      producto,
      'la receta debe apuntar a un producto existente',
    ).toBeTruthy();

    const porcion = Number(receta.servings) > 0 ? Number(receta.servings) : 1;
    const ingredientes: Ingrediente[] = receta.ingredients;

    const antes = new Map<string, number>();
    for (const ing of ingredientes) {
      antes.set(
        ing.inventory_item_id,
        await stockDe(request, token, ing.inventory_item_id),
      );
    }

    // --- La venta, por interfaz --------------------------------------------
    await page.goto('/pos');

    const buscador = page.locator('input[placeholder*="Buscar productos"]');
    await expect(buscador).toBeVisible({ timeout: 20_000 });
    await buscador.fill(producto.name);

    const tarjeta = page
      .locator(`button[aria-label^="${producto.name} - "]`)
      .first();
    await expect(tarjeta).toBeVisible({ timeout: 15_000 });
    await tarjeta.click();
    await expect(page.locator('[data-testid="cart-empty"]')).not.toBeVisible();

    // En móvil el carrito arranca cerrado y «Cobrar» vive dentro. En
    // escritorio no hace nada.
    await abrirCarrito(page);

    await page.getByRole('button', { name: /Cobrar/i }).click();
    await expect(
      page.getByRole('heading', { name: /Procesar Pago/i }),
    ).toBeVisible();

    // Tarjeta: el importe siempre es exacto, así que Confirmar se habilita solo.
    await page
      .getByRole('button', { name: /Tarjeta Débito o crédito/i })
      .click();
    const confirmar = page.getByRole('button', { name: /Confirmar Pago/i });
    await expect(confirmar).toBeEnabled();
    await confirmar.click();

    // El toast de éxito es lo que enlaza la venta de la interfaz con la
    // verificación en la base.
    //
    // Ojo con el texto: dice «Orden #TKT-…», pero ese identificador es el
    // número de TICKET, no el de la orden de cocina (que tiene forma ORD-…).
    // El aviso rotulaba el número del ticket como «Orden #TKT-…», mezclando la
    // venta con la comanda de cocina, que en este proyecto es otra cosa y lleva
    // su propio número `ORD-…`. Ahora dice lo que es: una venta cobrada.
    const exito = page.getByText(/Venta TKT-\S+ cobrada/i).first();
    await expect(exito).toBeVisible({ timeout: 20_000 });
    const textoExito = await exito.innerText();
    const numeroTicket = textoExito.match(/Venta (\S+) cobrada/)?.[1];
    expect(numeroTicket, 'el toast debe traer el identificador').toBeTruthy();

    // El comprobante del cliente. No existia forma de pedirlo desde la
    // interfaz: el endpoint estaba y no habia un solo boton que lo llamara, asi
    // que el cliente no se llevaba ticket.
    const panelVenta = page.getByText(/Venta cobrada/i).first();
    await expect(panelVenta, 'tras cobrar se ofrece el ticket').toBeVisible({
      timeout: 20_000,
    });

    const botonImprimir = page.getByRole('button', {
      name: /Imprimir ticket/i,
    });
    await expect(botonImprimir).toBeVisible();

    // El contenido se comprueba contra la API con el mismo id que usa el boton:
    // abrir la ventana de impresion en un navegador sin impresora no demuestra
    // nada, y lo que importa es que el papel diga lo correcto.
    const ticketsRes = await request.get(
      `${API}/pos/tickets?locationId=${locationId}`,
      auth(token),
    );
    expect(ticketsRes.ok()).toBeTruthy();
    const tickets = await ticketsRes.json();
    const ticket = (
      Array.isArray(tickets) ? tickets : (tickets.data ?? [])
    ).find((t: any) => t.ticketNumber === numeroTicket);
    expect(ticket, 'el ticket cobrado debe existir').toBeTruthy();

    const reciboRes = await request.get(
      `${API}/pos/orders/${ticket.id}/receipt`,
      auth(token),
    );
    expect(reciboRes.ok()).toBeTruthy();
    const { receipt } = await reciboRes.json();

    expect(receipt, 'el recibo trae el numero de ticket').toContain(
      numeroTicket,
    );
    expect(receipt, 'el recibo trae el producto vendido').toContain(
      producto.name,
    );
    expect(
      receipt,
      'el recibo desglosa el IVA que ya lleva el precio',
    ).toContain('IVA incluido');
    expect(receipt, 'sale con el ancho del rollo de 80 mm').toContain('80mm');
    expect(receipt, 'no promete una factura que no puede emitir').toContain(
      'No es un CFDI',
    );

    // La venta se consumó: el carrito queda vacío.
    await expect(page.locator('[data-testid="cart-empty"]')).toBeVisible({
      timeout: 15_000,
    });

    // --- Cocina: llevar la orden a SERVED ----------------------------------
    const ordenesRes = await request.get(
      `${API}/pos/orders?locationId=${locationId}`,
      auth(token),
    );
    expect(ordenesRes.ok()).toBeTruthy();
    const ordenes = await ordenesRes.json();
    const orden = (Array.isArray(ordenes) ? ordenes : []).find(
      (o: { ticket?: { ticketNumber?: string } }) =>
        o.ticket?.ticketNumber === numeroTicket,
    );
    expect(
      orden,
      `debe existir la orden del ticket ${numeroTicket}`,
    ).toBeTruthy();
    expect(orden.status, 'la orden nace en cocina como PENDING').toBe(
      'PENDING',
    );

    // --- El inventario ya bajó AL COBRAR ------------------------------------
    // El descuento ocurre cuando se consuma la venta, no cuando cocina sirve:
    // el pago siempre pasa, el paso por el KDS depende de que alguien lo
    // avance. Así que a estas alturas el stock ya tiene que haber bajado.
    const despuesDeCobrar = new Map<string, number>();
    for (const ing of ingredientes) {
      const despues = await stockDe(request, token, ing.inventory_item_id);
      despuesDeCobrar.set(ing.inventory_item_id, despues);
      const esperado =
        (antes.get(ing.inventory_item_id) ?? 0) - ing.quantity / porcion;
      expect(
        despues,
        `${ing.inventory_item_name} debe bajar ${ing.quantity / porcion} ${ing.unit} al cobrar`,
      ).toBeCloseTo(esperado, 4);
    }

    // --- Cocina, por interfaz -----------------------------------------------
    // El barista avanza la orden en /orders. El backend impone la maquina de
    // estados, asi que este recorrido tambien comprueba que el orden de los
    // saltos es el que el API acepta.
    await page.goto('/orders');

    const fila = page.getByRole('row').filter({ hasText: orden.orderNumber });
    await expect(fila).toBeVisible({ timeout: 20_000 });

    for (const etiqueta of ['Preparar', 'Listo', 'Entregar']) {
      const boton = fila.getByRole('button', { name: etiqueta });
      await expect(boton).toBeVisible({ timeout: 15_000 });
      await boton.click();
    }

    // Tras entregar, la orden esta SERVED y el unico boton que queda es Cerrar.
    await expect(fila.getByRole('button', { name: 'Cerrar' })).toBeVisible({
      timeout: 15_000,
    });

    const trasServir = await request.get(
      `${API}/pos/orders/${orden.id}`,
      auth(token),
    );
    expect((await trasServir.json()).status).toBe('SERVED');

    // --- Servir NO vuelve a descontar ---------------------------------------
    // Esta es la parte que importa: hubo un momento en que el cobro descontaba
    // por su cuenta Y servir descontaba otra vez, asi que cada venta se comia
    // el doble de insumos. Lo destapo justamente este test.
    for (const ing of ingredientes) {
      const despues = await stockDe(request, token, ing.inventory_item_id);
      expect(
        despues,
        `${ing.inventory_item_name} no debe moverse al pasar por cocina`,
      ).toBeCloseTo(despuesDeCobrar.get(ing.inventory_item_id) ?? 0, 4);
    }
  });
});
