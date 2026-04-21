import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createMilkModifiers() {
  try {
    console.log('🥛 Creando modificadores de leche...\n');

    // 1. Obtener la organización
    const organization = await prisma.organization.findFirst({
      where: { name: 'Coffee Demo' },
    });

    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    // 2. Crear items de inventario para leches alternativas
    console.log('📦 Creando items de inventario para leches alternativas...');

    // Leche de Almendra
    let lecheAlmendra = await prisma.inventoryItem.findUnique({
      where: { code: 'INV-008' },
    });

    if (!lecheAlmendra) {
      lecheAlmendra = await prisma.inventoryItem.create({
        data: {
          code: 'INV-008',
          name: 'Leche de Almendra',
          description: 'Leche vegetal de almendra',
          unitOfMeasure: 'l',
          costPerUnit: 28, // 28 MXN por litro (más cara que regular)
          parLevel: 20,
          reorderPoint: 5,
          category: 'DAIRY_ALTERNATIVE',
          active: true,
        },
      });
    }
    console.log(`✅ ${lecheAlmendra.name} (${lecheAlmendra.code})`);

    // Leche de Soya
    let lecheSoya = await prisma.inventoryItem.findUnique({
      where: { code: 'INV-009' },
    });

    if (!lecheSoya) {
      lecheSoya = await prisma.inventoryItem.create({
        data: {
          code: 'INV-009',
          name: 'Leche de Soya',
          description: 'Leche vegetal de soya',
          unitOfMeasure: 'l',
          costPerUnit: 25, // 25 MXN por litro
          parLevel: 20,
          reorderPoint: 5,
          category: 'DAIRY_ALTERNATIVE',
          active: true,
        },
      });
    }
    console.log(`✅ ${lecheSoya.name} (${lecheSoya.code})`);

    // Leche de Coco
    let lecheCoco = await prisma.inventoryItem.findUnique({
      where: { code: 'INV-010' },
    });

    if (!lecheCoco) {
      lecheCoco = await prisma.inventoryItem.create({
        data: {
          code: 'INV-010',
          name: 'Leche de Coco',
          description: 'Leche vegetal de coco',
          unitOfMeasure: 'l',
          costPerUnit: 32, // 32 MXN por litro (la más cara)
          parLevel: 15,
          reorderPoint: 5,
          category: 'DAIRY_ALTERNATIVE',
          active: true,
        },
      });
    }
    console.log(`✅ ${lecheCoco.name} (${lecheCoco.code})\n`);

    // 3. Obtener todos los productos con leche (Espresso category)
    const espressoCategory = await prisma.category.findFirst({
      where: { name: 'Espresso' },
    });

    const products = await prisma.product.findMany({
      where: { categoryId: espressoCategory?.id },
    });

    console.log(
      `📋 Creando modificadores para ${products.length} productos...\n`,
    );

    // 4. Crear modificadores individuales para cada tipo de leche
    for (const product of products) {
      console.log(`☕ Producto: ${product.name} (${product.sku})`);

      // Crear modificadores de leche
      const milkModifiers = [
        {
          name: 'Leche de Almendra',
          priceDelta: 10,
        },
        {
          name: 'Leche de Soya',
          priceDelta: 8,
        },
        {
          name: 'Leche de Coco',
          priceDelta: 12,
        },
        {
          name: 'Sin Leche',
          priceDelta: -5,
        },
      ];

      for (const milkMod of milkModifiers) {
        // Buscar o crear el modificador
        let modifier = await prisma.modifier.findFirst({
          where: {
            name: milkMod.name,
            type: 'MILK',
          },
        });

        if (!modifier) {
          modifier = await prisma.modifier.create({
            data: {
              name: milkMod.name,
              type: 'MILK',
              priceDelta: milkMod.priceDelta,
              active: true,
            },
          });
        }

        // Vincular modificador con el producto
        const existingLink = await prisma.productModifier.findFirst({
          where: {
            productId: product.id,
            modifierId: modifier.id,
          },
        });

        if (!existingLink) {
          await prisma.productModifier.create({
            data: {
              productId: product.id,
              modifierId: modifier.id,
            },
          });
          console.log(
            `   ✅ ${modifier.name} (${modifier.priceDelta >= 0 ? '+' : ''}${modifier.priceDelta} MXN)`,
          );
        }
      }
      console.log('');
    }

    // 5. Mostrar resumen
    console.log('📊 RESUMEN DE MODIFICADORES\n');
    console.log('🥛 Tipos de Leche Disponibles:');
    console.log(`   1. Regular (incluida) - $0 MXN`);
    console.log(`   2. Almendra - +$10 MXN (costo: $28/l)`);
    console.log(`   3. Soya - +$8 MXN (costo: $25/l)`);
    console.log(`   4. Coco - +$12 MXN (costo: $32/l)`);
    console.log(`   5. Sin leche - -$5 MXN\n`);

    console.log('✅ Productos configurados:');
    for (const product of products) {
      console.log(`   - ${product.name} (${product.sku})`);
    }

    console.log('\n💡 Casos de uso:');
    console.log(
      '   ✅ Cliente intolerante a lactosa → Elige leche de almendra/soya/coco',
    );
    console.log('   ✅ Cliente vegano → Opciones de leches vegetales');
    console.log(
      '   ✅ Cliente prefiere sin leche → Opción americano (-$5 MXN)',
    );
    console.log('   ✅ Cálculo automático de precio con modificador');
    console.log('   ✅ Deducción correcta del inventario según elección\n');

    console.log('🎉 ¡Sistema de modificadores creado exitosamente!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createMilkModifiers();
