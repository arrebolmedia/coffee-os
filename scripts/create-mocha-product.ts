import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createMochaProduct() {
  console.log('🍫 Creando producto Mocha completo...\n');

  // 1. Obtener organización y categoría
  const organization = await prisma.organization.findFirst({
    where: { slug: 'coffee-demo' },
  });

  if (!organization) {
    throw new Error('Organización no encontrada');
  }

  const espressoCategory = await prisma.category.findFirst({
    where: { name: 'Espresso' },
  });

  if (!espressoCategory) {
    throw new Error('Categoría Espresso no encontrada');
  }

  console.log(`✅ Organización: ${organization.name}`);
  console.log(`✅ Categoría: ${espressoCategory.name}\n`);

  // 2. Crear o buscar item de inventario para chocolate
  console.log('📦 Buscando o creando item de inventario para chocolate...');
  let chocolateItem = await prisma.inventoryItem.findUnique({
    where: { code: 'INV-007' },
  });

  if (!chocolateItem) {
    chocolateItem = await prisma.inventoryItem.create({
      data: {
        code: 'INV-007',
        name: 'Chocolate en Polvo',
        description: 'Chocolate premium para bebidas',
        unitOfMeasure: 'g',
        costPerUnit: 0.5, // 0.50 MXN por gramo
        parLevel: 5000, // 5kg
        reorderPoint: 2000, // 2kg
        category: 'CHOCOLATE',
        active: true,
      },
    });
  }
  console.log(`✅ Item: ${chocolateItem.name} (${chocolateItem.code})\n`);

  // 3. Crear o buscar el producto Mocha
  console.log('☕ Buscando o creando producto Mocha...');
  let mochaProduct = await prisma.product.findUnique({
    where: { sku: 'ESP-006' },
  });

  if (!mochaProduct) {
    mochaProduct = await prisma.product.create({
      data: {
        sku: 'ESP-006',
        name: 'Mocha',
        description: 'Espresso con chocolate y leche vaporizada',
        categoryId: espressoCategory.id,
        price: 65,
        cost: 0, // Se calculará desde la receta
        active: true,
        trackInventory: true,
      },
    });
  }
  console.log(`✅ Producto: ${mochaProduct.name} (${mochaProduct.sku})\n`);

  // 4. Obtener items de inventario necesarios
  const cafeItem = await prisma.inventoryItem.findFirst({
    where: { code: 'INV-001' },
  });
  const lecheItem = await prisma.inventoryItem.findFirst({
    where: { code: 'INV-002' },
  });

  if (!cafeItem || !lecheItem) {
    throw new Error('Items de inventario base no encontrados');
  }

  // 5. Crear o actualizar la receta
  console.log('📝 Buscando o creando receta para Mocha...');
  let mochaRecipe = await prisma.recipe.findFirst({
    where: { productId: mochaProduct.id },
  });

  if (!mochaRecipe) {
    mochaRecipe = await prisma.recipe.create({
      data: {
        productId: mochaProduct.id,
        name: 'Mocha Premium',
        description: 'Espresso con chocolate belga y leche vaporizada',
        instructions: `1. Preparar espresso doble (18g café)
2. Agregar 20g de chocolate en polvo al vaso
3. Vaporizar 200ml de leche a 65°C
4. Mezclar chocolate con un poco de espresso para crear jarabe
5. Agregar el resto del espresso
6. Verter leche vaporizada creando arte latte
7. Opcional: decorar con chocolate rallado`,
        yield: 1,
        yieldUnit: 'serving',
        prepTime: 150, // 2.5 minutos en segundos
        allergens: ['dairy'],
        version: 1,
        active: true,
      },
    });
  }
  console.log(`✅ Receta: ${mochaRecipe.name}\n`);

  // 6. Limpiar ingredientes existentes y crear nuevos
  console.log('🔗 Vinculando ingredientes al inventario...');

  // Eliminar ingredientes existentes de la receta
  await prisma.recipeIngredient.deleteMany({
    where: { recipeId: mochaRecipe.id },
  });

  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipeId: mochaRecipe.id,
        inventoryItemId: cafeItem.id,
        quantity: 0.018, // 18g de café
        unit: 'kg',
        notes: 'Shot doble de espresso',
      },
      {
        recipeId: mochaRecipe.id,
        inventoryItemId: lecheItem.id,
        quantity: 0.2, // 200ml de leche
        unit: 'l',
        notes: 'Leche vaporizada',
      },
      {
        recipeId: mochaRecipe.id,
        inventoryItemId: chocolateItem.id,
        quantity: 0.02, // 20g de chocolate
        unit: 'kg',
        notes: 'Chocolate premium',
      },
    ],
  });
  console.log(`✅ 3 ingredientes vinculados\n`);

  // 7. Calcular costo del producto basado en la receta
  console.log('💰 Calculando costos...');
  const costoCafe = 0.018 * cafeItem.costPerUnit; // 18g * 280 MXN/kg
  const costoLeche = 0.2 * lecheItem.costPerUnit; // 200ml * 18 MXN/l
  const costoChocolate = 20 * chocolateItem.costPerUnit; // 20g * 0.5 MXN/g
  const costoTotal = costoCafe + costoLeche + costoChocolate;

  // Labor (20%) y overhead (10%)
  const costoConGastos = costoTotal * 1.3;

  console.log(`  Café: ${costoCafe.toFixed(2)} MXN`);
  console.log(`  Leche: ${costoLeche.toFixed(2)} MXN`);
  console.log(`  Chocolate: ${costoChocolate.toFixed(2)} MXN`);
  console.log(`  Subtotal: ${costoTotal.toFixed(2)} MXN`);
  console.log(`  Con labor y overhead: ${costoConGastos.toFixed(2)} MXN`);

  // Actualizar costo en el producto
  await prisma.product.update({
    where: { id: mochaProduct.id },
    data: { cost: costoConGastos },
  });
  console.log(`✅ Costo actualizado en el producto\n`);

  // 8. Calcular margen
  const margen =
    ((mochaProduct.price - costoConGastos) / mochaProduct.price) * 100;
  console.log(`📊 Análisis de rentabilidad:`);
  console.log(`  Precio de venta: ${mochaProduct.price} MXN`);
  console.log(`  Costo: ${costoConGastos.toFixed(2)} MXN`);
  console.log(`  Margen: ${margen.toFixed(2)}%`);
  console.log(
    `  Ganancia: ${(mochaProduct.price - costoConGastos).toFixed(2)} MXN\n`,
  );

  // 9. Verificar que todo esté vinculado correctamente
  console.log('🔍 Verificando vinculaciones...');
  const verification = await prisma.recipe.findUnique({
    where: { id: mochaRecipe.id },
    include: {
      product: true,
      ingredients: {
        include: {
          inventoryItem: true,
        },
      },
    },
  });

  console.log(`✅ Producto: ${verification?.product.name}`);
  console.log(`✅ Receta: ${verification?.name}`);
  console.log(
    `✅ Ingredientes vinculados: ${verification?.ingredients.length}`,
  );
  verification?.ingredients.forEach((ing, index) => {
    console.log(
      `   ${index + 1}. ${ing.inventoryItem.name} (${ing.quantity} ${ing.unit})`,
    );
  });

  console.log('\n🎉 ¡Producto Mocha creado exitosamente!');
  console.log('\n📋 Resumen:');
  console.log(`   - Producto: ${mochaProduct.sku} - ${mochaProduct.name}`);
  console.log(`   - Precio: $${mochaProduct.price} MXN`);
  console.log(`   - Costo: $${costoConGastos.toFixed(2)} MXN`);
  console.log(`   - Margen: ${margen.toFixed(2)}%`);
  console.log(
    `   - Receta: ${mochaRecipe.name} con ${verification?.ingredients.length} ingredientes`,
  );
  console.log(`   - Tiempo de preparación: ${mochaRecipe.prepTime} segundos`);
  console.log(
    `   - Inventario: ${verification?.ingredients.length} items vinculados`,
  );
}

createMochaProduct()
  .catch((e) => {
    console.error('❌ Error creando producto Mocha:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
