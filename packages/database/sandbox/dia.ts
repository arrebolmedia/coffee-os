/**
 * Un día completo en la cafetería sandbox, contra la API en marcha.
 *
 *   npm run sandbox:seed     (monta la cafetería)
 *   npm run sandbox:dia      (abre, vende, cierra y dice qué falló)
 *
 * Recorre lo que hace una cafetería de verdad —abrir caja, cobrar de varias
 * formas, mandar a cocina, descontar insumos, cerrar y cuadrar— y va anotando
 * qué funciona y qué no. No es una suite de tests: es la lista de lo que
 * pasaría el primer día, con los números a la vista.
 *
 * Todo va por HTTP, no por Prisma, para que pase por los guards, los DTO y el
 * cálculo real. La base sólo se consulta al final para comprobar el inventario.
 */

import { PrismaClient } from '@prisma/client';
import { CUENTAS, PASSWORD, SLUG } from './constantes';

const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const prisma = new PrismaClient();

// ---------------------------------------------------------------- utilidades

type Estado = 'ok' | 'falla' | 'ausente';
const resultados: Array<{ paso: string; estado: Estado; nota: string }> = [];

function anota(paso: string, estado: Estado, nota = '') {
  resultados.push({ paso, estado, nota });
  const marca =
    estado === 'ok' ? '  ok  ' : estado === 'falla' ? ' FALLA' : ' FALTA';
  console.log(`${marca}  ${paso}${nota ? `  — ${nota}` : ''}`);
}

const dinero = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    n,
  );

let token = '';

async function api(
  metodo: string,
  ruta: string,
  cuerpo?: unknown,
): Promise<{ status: number; body: any }> {
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

/** Redondeo a centavos, para comparar dinero sin ruido de coma flotante. */
const c2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// -------------------------------------------------------------------- el día

async function main() {
  console.log('\nUn día en la Cafetería Sandbox TC');
  console.log('='.repeat(64));

  const org = await prisma.organization.findUnique({ where: { slug: SLUG } });
  if (!org) {
    console.error('\nNo existe el sandbox. Corre antes: npm run sandbox:seed');
    process.exit(1);
  }

  // ---------------------------------------------------------------- apertura
  console.log('\nAPERTURA');

  const login = await api('POST', '/auth/login', {
    email: CUENTAS.cajero,
    password: PASSWORD,
  });
  if (login.status !== 200) {
    anota('El cajero entra al sistema', 'falla', `HTTP ${login.status}`);
    return resumen();
  }
  token = login.body.accessToken;
  anota('El cajero entra al sistema', 'ok');

  const location = await prisma.location.findFirst({
    where: { organizationId: org.id },
  });
  const cajero = await prisma.user.findFirst({
    where: { email: CUENTAS.cajero },
  });
  const productos = await prisma.product.findMany({
    where: { organizationId: org.id },
  });
  const latte = productos.find((p) => p.sku === 'SBX-LATTE')!;
  const americano = productos.find((p) => p.sku === 'SBX-AMERICANO')!;
  const concha = productos.find((p) => p.sku === 'SBX-CONCHA')!;

  const caja = await api('POST', '/pos/cash-register/open', {
    organization_id: org.id,
    initial_amount: 1000,
    user_id: cajero!.id,
    location_id: location!.id,
  });
  const cajaId = caja.body?.id;
  anota(
    'Abrir caja con fondo de ' + dinero(1000),
    caja.status < 300 ? 'ok' : 'falla',
    caja.status >= 300 ? `HTTP ${caja.status}` : '',
  );

  // -------------------------------------------------------------- operación
  console.log('\nOPERACIÓN');

  let efectivoCobrado = 0;
  let ventasTotales = 0;
  const ticketsDelDia: string[] = [];

  /** Cobra un ticket y devuelve el cerrado. */
  async function vender(
    descripcion: string,
    lineas: any[],
    pagos: any[],
    extra: Record<string, unknown> = {},
  ) {
    const creado = await api('POST', '/pos/tickets', {
      locationId: location!.id,
      userId: cajero!.id,
      lines: lineas,
      ...extra,
    });
    if (creado.status >= 300) {
      anota(descripcion, 'falla', `al crear: HTTP ${creado.status}`);
      return null;
    }
    const cerrado = await api('PATCH', `/pos/tickets/${creado.body.id}/close`, {
      payments: pagos,
    });
    if (cerrado.status >= 300) {
      anota(descripcion, 'falla', `al cobrar: HTTP ${cerrado.status}`);
      return null;
    }
    ticketsDelDia.push(cerrado.body.id);
    ventasTotales += cerrado.body.total;
    for (const p of pagos) {
      if (p.method === 'CASH') efectivoCobrado += p.amount;
    }
    anota(descripcion, 'ok', `total ${dinero(cerrado.body.total)}`);
    return cerrado.body;
  }

  // Un latte en efectivo. 62 + 16 % = 71.92
  const t1 = await vender(
    'Cobrar un latte en efectivo',
    [{ productId: latte.id, quantity: 1, unitPrice: latte.price }],
    [{ method: 'CASH', amount: 71.92 }],
  );
  if (t1 && c2(t1.total) !== 71.92) {
    anota(
      '  el total del latte cuadra',
      'falla',
      `esperado 71.92, dio ${t1.total}`,
    );
  }

  // Concha a tasa 0 + americano al 16 %, con tarjeta.
  const t2 = await vender(
    'Cobrar una concha (tasa 0) y un americano (16 %) con tarjeta',
    [
      { productId: concha.id, quantity: 1, unitPrice: concha.price },
      { productId: americano.id, quantity: 1, unitPrice: americano.price },
    ],
    [{ method: 'CARD', amount: 80.68 }],
  );
  // 25 (sin IVA) + 48 + 7.68 = 80.68
  if (t2 && c2(t2.total) !== 80.68) {
    anota(
      '  la mezcla de tasas cuadra',
      'falla',
      `esperado 80.68, dio ${t2.total}`,
    );
  } else if (t2) {
    anota('  la mezcla de tasas cuadra', 'ok', 'IVA sólo sobre el americano');
  }

  // Pago mixto: parte efectivo, parte tarjeta.
  await vender(
    'Cobrar con pago mixto (efectivo + tarjeta)',
    [{ productId: americano.id, quantity: 2, unitPrice: americano.price }],
    [
      { method: 'CASH', amount: 50 },
      { method: 'CARD', amount: 61.36 },
    ],
  );

  // Con modificador.
  const modificador = await prisma.modifier.findFirst({
    where: { organizationId: org.id },
  });
  await vender(
    'Cobrar un latte con leche de avena (modificador)',
    [
      {
        productId: latte.id,
        quantity: 1,
        unitPrice: latte.price,
        modifiers: [
          { modifierId: modificador!.id, priceDelta: modificador!.priceDelta },
        ],
      },
    ],
    [{ method: 'CASH', amount: 85.84 }],
  );

  // Con descuento.
  await vender(
    'Cobrar con un descuento de ' + dinero(20),
    [{ productId: latte.id, quantity: 1, unitPrice: latte.price }],
    [{ method: 'CASH', amount: 48.72 }],
    { discount: 20 },
  );

  // Cocina.
  const ordenes = await api('GET', `/pos/orders?locationId=${location!.id}`);
  if (
    ordenes.status < 300 &&
    Array.isArray(ordenes.body) &&
    ordenes.body.length
  ) {
    anota(
      'Las ventas llegan a cocina como comandas',
      'ok',
      `${ordenes.body.length} comandas`,
    );
    const orden = ordenes.body[0];
    let avances = 0;
    for (const estado of ['IN_PROGRESS', 'READY', 'SERVED']) {
      const r = await api('PATCH', `/orders/${orden.id}/status`, {
        status: estado,
      });
      if (r.status < 300) avances++;
    }
    anota(
      'El barista mueve una comanda hasta entregada',
      avances === 3 ? 'ok' : 'falla',
      `${avances}/3 saltos`,
    );
  } else {
    anota(
      'Las ventas llegan a cocina como comandas',
      'falla',
      'no hay comandas',
    );
  }

  // ----------------------------------------------------------------- cierre
  console.log('\nCIERRE');

  const hoy = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const corte = await api('GET', `/pos/stats/daily/${org.id}?date=${hoy}`);
  if (corte.status < 300) {
    const cuadra = c2(corte.body.total_sales) === c2(ventasTotales);
    anota(
      'El corte del día suma lo vendido',
      cuadra ? 'ok' : 'falla',
      `corte ${dinero(corte.body.total_sales)} vs ventas ${dinero(ventasTotales)}`,
    );
  } else {
    anota('El corte del día suma lo vendido', 'falla', `HTTP ${corte.status}`);
  }

  // Arqueo: lo que debería haber en el cajón.
  const esperadoEnCajon = 1000 + efectivoCobrado;
  if (cajaId) {
    const cierre = await api('POST', `/pos/cash-register/${cajaId}/close`, {
      final_amount: esperadoEnCajon,
    });
    const dif = cierre.body?.difference;
    anota(
      'Arqueo: contar ' + dinero(esperadoEnCajon) + ' y que no haya diferencia',
      cierre.status < 300 && c2(dif) === 0 ? 'ok' : 'falla',
      cierre.status >= 300
        ? `HTTP ${cierre.status}`
        : `el sistema reporta una diferencia de ${dinero(dif)} — el fondo de ${dinero(1000)} más ${dinero(efectivoCobrado)} de ventas en efectivo`,
    );
  }

  // Estado de resultados con el régimen del negocio.
  const pl = await api('GET', `/finance/pnl?start_date=${hoy}&end_date=${hoy}`);
  if (pl.status < 300) {
    anota(
      'El estado de resultados aplica RESICO',
      pl.body.tax_regime === 'resico_pf' && pl.body.tax_basis === 'ingresos'
        ? 'ok'
        : 'falla',
      `régimen ${pl.body.tax_regime}, ISR ${dinero(pl.body.taxes)} sobre ${pl.body.tax_basis}`,
    );
  } else {
    anota(
      'El estado de resultados aplica RESICO',
      'falla',
      `HTTP ${pl.status}`,
    );
  }

  // Inventario: se comprueba en la base, que es donde vive la verdad.
  const insumos = await prisma.inventoryItem.findMany({
    where: { organizationId: org.id },
    orderBy: { code: 'asc' },
  });
  const cafe = insumos.find((i) => i.code === 'CAFE')!;
  const harina = insumos.find((i) => i.code === 'HARINA')!;
  // 3 lattes (18 g c/u) + 3 americanos (18 g c/u) = 108 g de café.
  const cafeEsperado = 5000 - 108;
  const harinaEsperada = 10000 - 80;
  anota(
    'El inventario descontó los insumos vendidos',
    c2(cafe.currentStock) === cafeEsperado &&
      c2(harina.currentStock) === harinaEsperada
      ? 'ok'
      : 'falla',
    `café ${cafe.currentStock} g (esperado ${cafeEsperado}), harina ${harina.currentStock} g (esperado ${harinaEsperada})`,
  );

  // ------------------------------------------------- lo que no existe aún
  console.log('\nLO QUE NO SE PUEDE HACER DESDE LA INTERFAZ');
  anota(
    'Dar de alta un producto o cambiarle el precio',
    'ausente',
    'no hay formulario',
  );
  anota('Abrir o cerrar la caja', 'ausente', 'sólo por API');
  anota('Facturar (CFDI)', 'ausente', 'bloqueado a propósito: falta un PAC');
  anota('Cobrar con terminal bancaria', 'ausente', 'no hay integración');

  resumen();
}

function resumen() {
  const ok = resultados.filter((r) => r.estado === 'ok').length;
  const falla = resultados.filter((r) => r.estado === 'falla').length;
  const ausente = resultados.filter((r) => r.estado === 'ausente').length;

  console.log('\n' + '='.repeat(64));
  console.log(`${ok} funcionan · ${falla} fallan · ${ausente} no existen`);

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
    console.error('\nEl día se interrumpió:', e.message);
    resumen();
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
