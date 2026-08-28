/**
 * Sandbox: una cafetería completa y aislada para probar el día de operación.
 *
 * Crea su propia organización con slug `sandbox-tc`, así que no toca los datos
 * de demostración. Se puede correr las veces que haga falta: borra y recrea lo
 * suyo.
 *
 *   npm run sandbox:seed
 *
 * Lleva lo que hace falta para un día real: menú con recetas e inventario,
 * personal con sus contraseñas, un cliente con puntos, y un producto a tasa 0
 * conviviendo con los del 16 % —el caso de la panadería—.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { CUENTAS, PASSWORD, SLUG } from './constantes';

const prisma = new PrismaClient();

/** Insumos con su stock inicial, en la unidad en que se descuentan. */
const INSUMOS = [
  { code: 'CAFE', name: 'Café en grano', unit: 'g', costo: 0.45, stock: 5000 },
  {
    code: 'LECHE',
    name: 'Leche entera',
    unit: 'ml',
    costo: 0.028,
    stock: 20000,
  },
  { code: 'HARINA', name: 'Harina', unit: 'g', costo: 0.022, stock: 10000 },
  { code: 'VASO', name: 'Vaso de 12 oz', unit: 'unit', costo: 1.8, stock: 500 },
];

/**
 * El menú. `tasaIva` va como fracción y `recetaPor` describe cuánto insumo
 * consume UNA unidad del producto.
 */
const MENU = [
  {
    sku: 'SBX-LATTE',
    name: 'Latte',
    categoria: 'Café Caliente',
    precio: 62,
    tasaIva: 0.16,
    ivaIncluido: false,
    receta: { CAFE: 18, LECHE: 200, VASO: 1 },
  },
  {
    sku: 'SBX-AMERICANO',
    name: 'Americano',
    categoria: 'Café Caliente',
    precio: 48,
    tasaIva: 0.16,
    ivaIncluido: false,
    receta: { CAFE: 18, VASO: 1 },
  },
  {
    sku: 'SBX-CONCHA',
    name: 'Concha',
    categoria: 'Panadería',
    precio: 25,
    // Todo el catálogo va al 16 % por decisión del negocio. Se deja una a tasa
    // 0 para que el día de prueba ejercite las dos tasas conviviendo, que es
    // donde el cálculo se equivocaba.
    tasaIva: 0,
    ivaIncluido: false,
    receta: { HARINA: 80 },
  },
];

async function limpiar() {
  const org = await prisma.organization.findUnique({ where: { slug: SLUG } });
  if (!org) return;

  // El orden importa: primero lo que cuelga de los tickets.
  const tickets = await prisma.ticket.findMany({
    where: { location: { organizationId: org.id } },
    select: { id: true },
  });
  const ids = tickets.map((t) => t.id);

  if (ids.length) {
    const ordenes = await prisma.order.findMany({
      where: { ticketId: { in: ids } },
      select: { id: true },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: ordenes.map((o) => o.id) } },
    });
    await prisma.order.deleteMany({ where: { ticketId: { in: ids } } });
    await prisma.payment.deleteMany({ where: { ticketId: { in: ids } } });
    await prisma.ticketLineModifier.deleteMany({
      where: { ticketLine: { ticketId: { in: ids } } },
    });
    await prisma.ticketLine.deleteMany({ where: { ticketId: { in: ids } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
  }

  await prisma.inventoryMovement.deleteMany({
    where: { inventoryItem: { organizationId: org.id } },
  });
  await prisma.cashRegister.deleteMany({ where: { organizationId: org.id } });
  await prisma.shift.deleteMany({
    where: { location: { organizationId: org.id } },
  });
  await prisma.recipeIngredient.deleteMany({
    where: { recipe: { organizationId: org.id } },
  });
  await prisma.recipe.deleteMany({ where: { organizationId: org.id } });
  await prisma.inventoryItem.deleteMany({ where: { organizationId: org.id } });
  await prisma.loyaltyTransaction.deleteMany({
    where: { organizationId: org.id },
  });
  await prisma.customer.deleteMany({ where: { organizationId: org.id } });
  await prisma.productModifier.deleteMany({
    where: { product: { organizationId: org.id } },
  });
  await prisma.modifier.deleteMany({ where: { organizationId: org.id } });
  await prisma.product.deleteMany({ where: { organizationId: org.id } });
  await prisma.category.deleteMany({ where: { organizationId: org.id } });
  await prisma.setting.deleteMany({ where: { organizationId: org.id } });
  await prisma.userLocation.deleteMany({
    where: { user: { organizationId: org.id } },
  });
  await prisma.user.deleteMany({ where: { organizationId: org.id } });
  await prisma.location.deleteMany({ where: { organizationId: org.id } });
  await prisma.role.deleteMany({ where: { code: `sbx_${SLUG}` } });
  await prisma.organization.delete({ where: { id: org.id } });
}

async function main() {
  console.log('Sandbox TC — montando la cafetería\n');
  await limpiar();

  const org = await prisma.organization.create({
    data: {
      name: 'Cafetería Sandbox TC',
      slug: SLUG,
      timezone: 'America/Mexico_City',
    },
  });

  // El régimen fiscal del negocio: RESICO de persona física. El ISR sale de los
  // ingresos cobrados, no de la utilidad.
  await prisma.setting.create({
    data: {
      organizationId: org.id,
      category: 'finance',
      key: 'regimen_fiscal',
      type: 'string',
      value: 'resico_pf',
      description: 'RESICO persona física (art. 113-E LISR)',
    },
  });

  // El descuento automático de inventario NO viene activado por defecto: para un
  // negocio real activarlo es una decisión explícita. Aquí se activa porque el
  // día de prueba comprueba justamente que descuenta.
  await prisma.setting.create({
    data: {
      organizationId: org.id,
      category: 'inventory',
      key: 'auto_deduct',
      type: 'json',
      value: { enabled: true },
      description: 'Descontar insumos al cobrar',
    },
  });

  const location = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: 'Sucursal Centro',
      address: 'Av. Juárez 100',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06000',
      timezone: 'America/Mexico_City',
      active: true,
    },
  });

  const role = await prisma.role.create({
    data: { name: 'Sandbox', code: `sbx_${SLUG}`, scopes: ['*'] },
  });

  const hash = await bcrypt.hash(PASSWORD, 10);
  const usuarios: Record<string, string> = {};
  for (const [puesto, email] of Object.entries(CUENTAS)) {
    const u = await prisma.user.create({
      data: {
        email,
        password: hash,
        firstName: puesto[0].toUpperCase() + puesto.slice(1),
        lastName: 'Sandbox',
        organizationId: org.id,
        roleId: role.id,
        active: true,
      },
    });
    await prisma.userLocation.create({
      data: { userId: u.id, locationId: location.id },
    });
    usuarios[puesto] = u.id;
  }

  const categorias: Record<string, string> = {};
  for (const [i, nombre] of ['Café Caliente', 'Panadería'].entries()) {
    const c = await prisma.category.create({
      data: { organizationId: org.id, name: nombre, sortOrder: i },
    });
    categorias[nombre] = c.id;
  }

  const insumos: Record<string, string> = {};
  for (const ins of INSUMOS) {
    const item = await prisma.inventoryItem.create({
      data: {
        organizationId: org.id,
        code: ins.code,
        name: ins.name,
        unitOfMeasure: ins.unit,
        costPerUnit: ins.costo,
        currentStock: ins.stock,
        parLevel: ins.stock,
        reorderPoint: ins.stock * 0.2,
        active: true,
      },
    });
    insumos[ins.code] = item.id;
  }

  for (const p of MENU) {
    const producto = await prisma.product.create({
      data: {
        organizationId: org.id,
        categoryId: categorias[p.categoria],
        sku: p.sku,
        name: p.name,
        price: p.precio,
        basePrice: p.precio,
        cost: 0,
        taxRate: p.tasaIva,
        taxIncluded: p.ivaIncluido,
        trackInventory: false,
        active: true,
        tags: [],
      },
    });

    const receta = await prisma.recipe.create({
      data: {
        organizationId: org.id,
        productId: producto.id,
        name: `Receta de ${p.name}`,
        yield: 1,
        yieldUnit: 'unit',
        active: true,
        readyForPos: true,
      },
    });

    for (const [code, cantidad] of Object.entries(p.receta)) {
      const ins = INSUMOS.find((i) => i.code === code)!;
      await prisma.recipeIngredient.create({
        data: {
          recipeId: receta.id,
          inventoryItemId: insumos[code],
          quantity: cantidad,
          unit: ins.unit,
        },
      });
    }
  }

  const modificador = await prisma.modifier.create({
    data: {
      organizationId: org.id,
      name: 'Leche de avena',
      type: 'MILK',
      priceDelta: 12,
      active: true,
    },
  });
  const latte = await prisma.product.findFirst({
    where: { organizationId: org.id, sku: 'SBX-LATTE' },
  });
  await prisma.productModifier.create({
    data: { productId: latte!.id, modifierId: modificador.id },
  });

  // Un cliente con 9 puntos: el siguiente café le da el décimo y puede canjear.
  await prisma.customer.create({
    data: {
      organizationId: org.id,
      firstName: 'Cliente',
      lastName: 'Frecuente',
      phone: '5555550001',
      email: 'frecuente@sandbox.test',
      loyaltyPoints: 9,
      active: true,
    },
  });

  console.log(`  organización  ${org.name}  (${SLUG})`);
  console.log(`  sucursal      ${location.name}`);
  console.log(`  personal      ${Object.values(CUENTAS).join(', ')}`);
  console.log(`  contraseña    ${PASSWORD}`);
  console.log(`  menú          ${MENU.map((m) => m.name).join(', ')}`);
  console.log(`  insumos       ${INSUMOS.map((i) => i.code).join(', ')}`);
  console.log(`  régimen       RESICO persona física`);
  console.log('\nListo. Ahora: npm run sandbox:dia');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
