/**
 * La trastienda: todo lo que pasa cuando no hay nadie en la barra.
 *
 *   npm run sandbox:seed         (monta la cafetería)
 *   npm run sandbox:trastienda   (da de alta insumos, recetas, productos,
 *                                 proveedores, compras y ajustes de inventario)
 *
 * El día de operación (`sandbox:dia`) prueba el mostrador. Esto prueba lo otro:
 * montar el negocio y mantenerlo. Cada paso va por HTTP para que pase por los
 * guards, los DTO y la validación real, y se comprueba contra la base que la
 * cosa quedó como debe.
 */

import { PrismaClient } from '@prisma/client';
import { CUENTAS, PASSWORD, SLUG } from './constantes';

/**
 * La base de la API.
 *
 * `API_URL` es ambigua en este repo: en unos sitios significa el origen
 * (`http://localhost:4000`) y en otros la raiz versionada
 * (`http://localhost:4000/api/v1`). `packages/database/.env` trae la primera y
 * Prisma la carga sola, asi que el script pedia `POST /auth/login` y recibia un
 * 404 con "Cannot POST /auth/login" — un mensaje que no dice nada de lo que
 * realmente pasa. Se normaliza en vez de adivinar.
 */
const RAIZ = (process.env.API_URL ?? 'http://localhost:4000').replace(
  /[/]+$/,
  '',
);
const API = RAIZ.includes('/api/') ? RAIZ : RAIZ + '/api/v1';

/** Que la API este viva antes de medir nada, y decirlo claro si no lo esta. */
async function exigirApiViva(): Promise<boolean> {
  try {
    const res = await fetch(API + '/health');
    if (res.ok) return true;
    console.log('');
    console.log('  La API contesta ' + res.status + ' en ' + API + '/health.');
  } catch {
    console.log('');
    console.log('  No hay nadie escuchando en ' + API + '.');
  }
  console.log('  Levantala antes de medir:  cd apps/api && npm run dev');
  console.log('');
  return false;
}

const prisma = new PrismaClient();

type Estado = 'ok' | 'falla';
const resultados: Array<{ paso: string; estado: Estado; nota: string }> = [];

function anota(paso: string, estado: Estado, nota = '') {
  resultados.push({ paso, estado, nota });
  console.log(
    `${estado === 'ok' ? '  ok  ' : ' FALLA'}  ${paso}${nota ? `  — ${nota}` : ''}`,
  );
}

let token = '';

async function api(metodo: string, ruta: string, cuerpo?: unknown) {
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });
  const texto = await res.text();
  let body: any = null;
  try {
    body = texto ? JSON.parse(texto) : null;
  } catch {
    body = texto;
  }
  return { status: res.status, body };
}

/** Un mensaje de error legible a partir de la respuesta. */
const porQue = (r: { status: number; body: any }) =>
  `HTTP ${r.status}${r.body?.message ? `: ${JSON.stringify(r.body.message).slice(0, 110)}` : ''}`;

const c2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

async function main() {
  if (!(await exigirApiViva())) {
    process.exitCode = 1;
    return;
  }

  console.log('\nLa trastienda de la Cafetería Sandbox TC');
  console.log('='.repeat(64));

  const org = await prisma.organization.findUnique({ where: { slug: SLUG } });
  if (!org) {
    console.error('\nNo existe el sandbox. Corre antes: npm run sandbox:seed');
    process.exit(1);
  }

  const login = await api('POST', '/auth/login', {
    email: CUENTAS.dueño,
    password: PASSWORD,
  });
  if (login.status !== 200) {
    anota('La dueña entra al sistema', 'falla', porQue(login));
    return resumen();
  }
  token = login.body.accessToken;
  anota('La dueña entra al sistema', 'ok');

  const location = await prisma.location.findFirst({
    where: { organizationId: org.id },
  });
  const categoria = await prisma.category.findFirst({
    where: { organizationId: org.id },
  });
  const sufijo = Date.now().toString().slice(-6);

  // ------------------------------------------------------------- inventario
  console.log('\nDAR DE ALTA UN INSUMO NUEVO');

  const insumo = await api('POST', '/inventory-items', {
    organizationId: org.id,
    code: `CHOCO-${sufijo}`,
    name: 'Chocolate en polvo',
    unitOfMeasure: 'g',
    costPerUnit: 0.35,
    parLevel: 3000,
    reorderPoint: 500,
  });
  anota(
    'Crear el insumo «Chocolate en polvo»',
    insumo.status < 300 ? 'ok' : 'falla',
    insumo.status >= 300 ? porQue(insumo) : `id ${insumo.body?.id}`,
  );
  const insumoId = insumo.body?.id;

  // Un insumo nace sin existencias: el stock entra por un movimiento, que es lo
  // correcto —así queda el rastro de de dónde salió— pero conviene saberlo.
  if (insumoId) {
    const carga = await api('POST', '/inventory-movements', {
      inventoryItemId: insumoId,
      type: 'IN',
      reason: 'PURCHASE',
      quantity: 2000,
      unitCost: 0.35,
      notes: 'Existencia inicial',
    });
    anota(
      'Cargarle existencia inicial con un movimiento de entrada',
      carga.status < 300 ? 'ok' : 'falla',
      carga.status >= 300 ? porQue(carga) : '2000 g',
    );
  }

  // ---------------------------------------------------------------- recetas
  console.log('\nCREAR UNA RECETA Y SU PRODUCTO');

  const producto = await api('POST', '/products', {
    organization_id: org.id,
    category_id: categoria!.id,
    sku: `SBX-MOCHA-${sufijo}`,
    name: 'Mocha',
    base_price: 72,
    cost: 0,
    tax_rate: 0.16,
  });
  anota(
    'Crear el producto «Mocha»',
    producto.status < 300 ? 'ok' : 'falla',
    producto.status >= 300 ? porQue(producto) : '',
  );
  const productoId = producto.body?.id;

  const insumosExistentes = await prisma.inventoryItem.findMany({
    where: { organizationId: org.id },
  });
  const cafe = insumosExistentes.find((i) => i.code === 'CAFE');
  const leche = insumosExistentes.find((i) => i.code === 'LECHE');

  const receta = await api('POST', '/recipes', {
    organization_id: org.id,
    product_id: productoId,
    name: 'Receta de Mocha',
    category: 'Bebidas Calientes',
    servings: 1,
    yield_unit: 'unit',
    ingredients: [
      { inventory_item_id: cafe!.id, quantity: 18, unit: 'g' },
      { inventory_item_id: leche!.id, quantity: 180, unit: 'ml' },
      ...(insumoId
        ? [{ inventory_item_id: insumoId, quantity: 20, unit: 'g' }]
        : []),
    ],
  });
  anota(
    'Crear la receta con sus tres ingredientes',
    receta.status < 300 ? 'ok' : 'falla',
    receta.status >= 300 ? porQue(receta) : '',
  );
  const recetaId = receta.body?.id;

  if (recetaId) {
    const enBase = await prisma.recipeIngredient.count({
      where: { recipeId: recetaId },
    });
    anota(
      'La receta guardó sus ingredientes',
      enBase === 3 ? 'ok' : 'falla',
      `${enBase} de 3 en la base`,
    );

    const costo = await api('GET', `/recipes/${recetaId}/cost`);
    // 18 g café × 0.45 + 180 ml leche × 0.028 + 20 g choco × 0.35 = 20.14
    const soloIngredientes = 18 * 0.45 + 180 * 0.028 + 20 * 0.35;
    const dado = costo.body?.total_ingredients_cost;
    anota(
      'El costeo de la receta suma sus ingredientes',
      costo.status < 300 && Math.abs(c2(dado) - c2(soloIngredientes)) < 0.05
        ? 'ok'
        : 'falla',
      costo.status >= 300
        ? porQue(costo)
        : `ingredientes ${c2(dado)} (esperado ${c2(soloIngredientes)})`,
    );

    // El costo total añade 20 % de mano de obra y 10 % de gastos generales
    // sobre los ingredientes. No es un error de cálculo, es el criterio del
    // sistema — pero conviene tenerlo a la vista al fijar precios.
    anota(
      'El costo total añade mano de obra (20 %) y gastos generales (10 %)',
      costo.status < 300 &&
        Math.abs(c2(costo.body?.total_cost) - c2(soloIngredientes * 1.3)) < 0.05
        ? 'ok'
        : 'falla',
      costo.status < 300
        ? `total ${c2(costo.body?.total_cost)} = ${c2(soloIngredientes)} × 1.30`
        : '',
    );
  }

  // ------------------------------------------------------------ proveedores
  console.log('\nPROVEEDORES Y COMPRAS');

  const proveedor = await api('POST', '/suppliers', {
    organization_id: org.id,
    name: `Café del Alto ${sufijo}`,
    contact_person: 'Ana Robles',
    email: `alto.${sufijo}@sandbox.test`,
    phone: '5555551234',
  });
  anota(
    'Dar de alta un proveedor',
    proveedor.status < 300 ? 'ok' : 'falla',
    proveedor.status >= 300 ? porQue(proveedor) : '',
  );
  const proveedorId = proveedor.body?.id;

  const stockAntes =
    (await prisma.inventoryItem.findUnique({ where: { id: cafe!.id } }))
      ?.currentStock ?? 0;

  const compra = await api('POST', '/purchase-orders', {
    organization_id: org.id,
    supplier_id: proveedorId,
    items: [
      {
        inventory_item_id: cafe!.id,
        quantity_ordered: 1000,
        unit_price: 0.42,
      },
    ],
  });
  anota(
    'Crear una orden de compra de 1 kg de café',
    compra.status < 300 ? 'ok' : 'falla',
    compra.status >= 300
      ? porQue(compra)
      : `folio ${compra.body?.order_number ?? compra.body?.orderNumber ?? ''}`,
  );
  const compraId = compra.body?.id;

  if (compraId) {
    const aprobada = await api(
      'PATCH',
      `/purchase-orders/${compraId}/approve`,
      {
        approved_by_user_id: (
          await prisma.user.findFirst({ where: { email: CUENTAS.dueño } })
        )?.id,
      },
    );
    anota(
      'Aprobar la orden de compra',
      aprobada.status < 300 ? 'ok' : 'falla',
      aprobada.status >= 300 ? porQue(aprobada) : '',
    );

    // Entre aprobar y recibir hay un paso más: enviar la orden al proveedor.
    const enviada = await api('PATCH', `/purchase-orders/${compraId}/send`, {});
    anota(
      'Enviar la orden al proveedor',
      enviada.status < 300 ? 'ok' : 'falla',
      enviada.status >= 300 ? porQue(enviada) : '',
    );

    const recibida = await api(
      'PATCH',
      `/purchase-orders/${compraId}/receive`,
      {
        received_by: (
          await prisma.user.findFirst({ where: { email: CUENTAS.dueño } })
        )?.id,
        items: [{ inventory_item_id: cafe!.id, quantity_received: 1000 }],
      },
    );
    anota(
      'Recibir la mercancía',
      recibida.status < 300 ? 'ok' : 'falla',
      recibida.status >= 300 ? porQue(recibida) : '',
    );

    const stockDespues =
      (await prisma.inventoryItem.findUnique({ where: { id: cafe!.id } }))
        ?.currentStock ?? 0;
    anota(
      'Recibir la compra SUBE el stock del insumo',
      c2(stockDespues) === c2(stockAntes + 1000) ? 'ok' : 'falla',
      `café ${stockAntes} g → ${stockDespues} g (esperado ${stockAntes + 1000})`,
    );
  }

  // ------------------------------------------------- movimientos a mano
  console.log('\nAJUSTES DE INVENTARIO');

  const antesMerma =
    (await prisma.inventoryItem.findUnique({ where: { id: leche!.id } }))
      ?.currentStock ?? 0;

  const merma = await api('POST', '/inventory-movements', {
    inventoryItemId: leche!.id,
    type: 'OUT',
    reason: 'WASTE',
    quantity: 500,
    notes: 'Se cortó un litro de leche',
  });
  anota(
    'Registrar una merma de 500 ml de leche',
    merma.status < 300 ? 'ok' : 'falla',
    merma.status >= 300 ? porQue(merma) : '',
  );

  const despuesMerma =
    (await prisma.inventoryItem.findUnique({ where: { id: leche!.id } }))
      ?.currentStock ?? 0;
  anota(
    'La merma BAJA el stock',
    c2(despuesMerma) === c2(antesMerma - 500) ? 'ok' : 'falla',
    `leche ${antesMerma} ml → ${despuesMerma} ml (esperado ${antesMerma - 500})`,
  );

  // ------------------------------------------- el producto nuevo se vende
  console.log('\nEL PRODUCTO NUEVO SE PUEDE VENDER');

  if (productoId) {
    const cajero = await prisma.user.findFirst({
      where: { email: CUENTAS.cajero },
    });
    const antesChoco = insumoId
      ? ((await prisma.inventoryItem.findUnique({ where: { id: insumoId } }))
          ?.currentStock ?? 0)
      : 0;

    const ticket = await api('POST', '/pos/tickets', {
      locationId: location!.id,
      userId: cajero!.id,
      lines: [{ productId: productoId, quantity: 1, unitPrice: 72 }],
    });
    if (ticket.status < 300) {
      const cerrado = await api(
        'PATCH',
        `/pos/tickets/${ticket.body.id}/close`,
        { payments: [{ method: 'CASH', amount: 83.52 }] },
      );
      anota(
        'Vender el Mocha recién creado',
        cerrado.status < 300 ? 'ok' : 'falla',
        cerrado.status >= 300 ? porQue(cerrado) : `total ${cerrado.body.total}`,
      );

      if (insumoId) {
        const despuesChoco =
          (await prisma.inventoryItem.findUnique({ where: { id: insumoId } }))
            ?.currentStock ?? 0;
        anota(
          'Venderlo descuenta el insumo nuevo de su receta',
          c2(despuesChoco) === c2(antesChoco - 20) ? 'ok' : 'falla',
          `chocolate ${antesChoco} g → ${despuesChoco} g (esperado ${antesChoco - 20})`,
        );
      }
    } else {
      anota('Vender el Mocha recién creado', 'falla', porQue(ticket));
    }
  }

  resumen();
}

function resumen() {
  const ok = resultados.filter((r) => r.estado === 'ok').length;
  const falla = resultados.filter((r) => r.estado === 'falla').length;
  console.log('\n' + '='.repeat(64));
  console.log(`${ok} funcionan · ${falla} fallan`);
  if (falla) {
    console.log('\nLo que falla:');
    resultados
      .filter((r) => r.estado === 'falla')
      .forEach((r) => console.log(`  · ${r.paso}\n      ${r.nota}`));
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error('\nSe interrumpió:', e.message);
    resumen();
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
