import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Obtener el organization ID
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No se encontró organización');
    return;
  }

  console.log('✅ Organización encontrada:', org.name);

  // Obtener location ID
  const location = await prisma.location.findFirst({
    where: { organizationId: org.id },
  });

  if (!location) {
    console.error('❌ No se encontró ubicación');
    return;
  }

  console.log('✅ Ubicación encontrada:', location.name);

  // Crear categoría simple (sin type, solo para productos del POS)
  const category = await prisma.category.create({
    data: {
      name: 'Lácteos',
      description: 'Leche, crema, yogurt',
      organizationId: org.id,
      sortOrder: 1,
      active: true,
    },
  });

  console.log('✅ Categoría creada:', category.name);

  // Verificar si el producto ya existe
  const existingProduct = await prisma.inventoryItem.findFirst({
    where: {
      code: 'COFF-001',
      organizationId: org.id,
    },
  });

  if (existingProduct) {
    console.log('\n📦 Producto COFF-001 ya existe, no se creará de nuevo');

    console.log('\n📁 Categoría creada:');
    console.log('   ID:', category.id);
    console.log('   Nombre:', category.name);
    console.log('   Descripción:', category.description || 'N/A');

    console.log('\n✅ Categoría creada! Refresca el navegador');
    console.log('\n⚠️  NOTA:');
    console.log('   - La categoría "Lácteos" es para Productos del POS');
    console.log('   - Para inventario, usa texto libre en el campo category');
    console.log('   - El producto existente tiene category="Café en Grano"');
    return;
  }

  // Crear producto de inventario
  const product = await prisma.inventoryItem.create({
    data: {
      code: 'COFF-001',
      name: 'Café Red Honey',
      description: 'San Felipe, Los Altos, Veracruz',
      category: 'Café en Grano',
      unitOfMeasure: 'kg',
      costPerUnit: 350,
      parLevel: 50,
      reorderPoint: 10,
      active: true,
      organizationId: org.id,
    },
  });

  console.log('\n📦 Producto de Inventario creado:');
  console.log('   Código:', product.code);
  console.log('   Nombre:', product.name);
  console.log('   Categoría:', product.category);
  console.log('   Descripción:', product.description);
  console.log('   Unidad:', product.unitOfMeasure);
  console.log('   Costo: $', product.costPerUnit, 'MXN');
  console.log('   Nivel Par:', product.parLevel);
  console.log('   Punto Reorden:', product.reorderPoint);

  console.log('\n📁 Categoría creada:');
  console.log('   ID:', category.id);
  console.log('   Nombre:', category.name);
  console.log('   Descripción:', category.description || 'N/A');

  console.log('\n✅ Datos creados! Refresca el navegador para verlos');
  console.log('\n⚠️  NOTA: La categoría creada es para Productos (POS).');
  console.log(
    '   Para inventario, la categoría se guarda como texto en el campo "category".',
  );
  console.log('   El inventoryItem ya tiene category="Café en Grano"');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
