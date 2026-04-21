import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSandbox() {
  console.log('🌱 Iniciando seed de sandbox...\n');

  try {
    // Obtener organización y location existentes
    const org = await prisma.organization.findFirst();
    const location = await prisma.location.findFirst();
    const user = await prisma.user.findFirst();

    if (!org || !location || !user) {
      throw new Error(
        'Necesitas tener al menos una organización, location y usuario',
      );
    }

    console.log(`✅ Usando organización: ${org.name}`);
    console.log(`✅ Usando location: ${location.name}`);
    console.log(`✅ Usando usuario: ${user.email}\n`);

    // 1. CREAR CATEGORÍAS
    console.log('📂 Creando categorías...');

    const categoryBebidas = await prisma.category.upsert({
      where: { id: 'cat-bebidas' },
      update: {},
      create: {
        id: 'cat-bebidas',
        organizationId: org.id,
        name: 'Bebidas',
        description: 'Bebidas calientes y frías',
        color: '#FF6B35',
        icon: '☕',
        sortOrder: 1,
        active: true,
      },
    });

    const categoryPasteles = await prisma.category.upsert({
      where: { id: 'cat-pasteles' },
      update: {},
      create: {
        id: 'cat-pasteles',
        organizationId: org.id,
        name: 'Pasteles',
        description: 'Panes y pasteles',
        color: '#F4A261',
        icon: '🥐',
        sortOrder: 2,
        active: true,
      },
    });

    console.log(`   ✅ ${categoryBebidas.name}`);
    console.log(`   ✅ ${categoryPasteles.name}\n`);

    // 2. CREAR MODIFICADORES
    console.log('🔧 Creando modificadores...');

    const modLeche = await prisma.modifier.upsert({
      where: { id: 'mod-leche-almendra' },
      update: {},
      create: {
        id: 'mod-leche-almendra',
        name: 'Leche de Almendra',
        type: 'MILK',
        priceDelta: 10.0,
        active: true,
      },
    });

    const modShot = await prisma.modifier.upsert({
      where: { id: 'mod-shot-extra' },
      update: {},
      create: {
        id: 'mod-shot-extra',
        name: 'Shot Extra',
        type: 'EXTRA',
        priceDelta: 15.0,
        active: true,
      },
    });

    const modSize = await prisma.modifier.upsert({
      where: { id: 'mod-size-grande' },
      update: {},
      create: {
        id: 'mod-size-grande',
        name: 'Grande',
        type: 'SIZE',
        priceDelta: 12.0,
        active: true,
      },
    });

    console.log(`   ✅ ${modLeche.name} (+$${modLeche.priceDelta})`);
    console.log(`   ✅ ${modShot.name} (+$${modShot.priceDelta})`);
    console.log(`   ✅ ${modSize.name} (+$${modSize.priceDelta})\n`);

    // 3. CREAR INGREDIENTES (INVENTORY ITEMS)
    console.log('📦 Creando ingredientes costeados...');

    const ingredientes = [
      {
        id: 'ing-cafe',
        code: 'ING-CAF-001',
        name: 'Café Espresso',
        unit: 'ml',
        cost: 0.85,
        stock: 5000,
      },
      {
        id: 'ing-leche',
        code: 'ING-LCH-001',
        name: 'Leche Entera',
        unit: 'ml',
        cost: 0.15,
        stock: 10000,
      },
      {
        id: 'ing-chocolate',
        code: 'ING-CHO-001',
        name: 'Chocolate',
        unit: 'g',
        cost: 2.5,
        stock: 2000,
      },
      {
        id: 'ing-harina',
        code: 'ING-HAR-001',
        name: 'Harina',
        unit: 'g',
        cost: 0.05,
        stock: 15000,
      },
      {
        id: 'ing-mantequilla',
        code: 'ING-MAN-001',
        name: 'Mantequilla',
        unit: 'g',
        cost: 0.8,
        stock: 3000,
      },
    ];

    for (const ing of ingredientes) {
      await prisma.inventoryItem.upsert({
        where: { id: ing.id },
        update: {},
        create: {
          id: ing.id,
          code: ing.code,
          name: ing.name,
          unitOfMeasure: ing.unit,
          costPerUnit: ing.cost,
          currentStock: ing.stock,
          parLevel: ing.stock * 2,
          reorderPoint: ing.stock * 0.3,
          costingStatus: 'COMPLETE',
          active: true,
        },
      });
      console.log(
        `   ✅ ${ing.name} - $${ing.cost}/${ing.unit} (${ing.stock} en stock)`,
      );
    }
    console.log();

    // 4. CREAR PRODUCTOS
    console.log('🛍️  Creando productos...');

    const productCappuccino = await prisma.product.upsert({
      where: { id: 'prod-cappuccino' },
      update: {},
      create: {
        id: 'prod-cappuccino',
        organizationId: org.id,
        categoryId: categoryBebidas.id,
        sku: 'BEB-CAP-001',
        name: 'Cappuccino',
        description: 'Espresso con leche vaporizada y espuma',
        price: 55.0,
        cost: 15.0,
        type: 'SIMPLE',
        status: 'ACTIVE',
        taxRate: 0.16,
        taxIncluded: false,
        trackInventory: false,
        allowModifiers: true,
        isAvailable: true,
        preparationTimeMinutes: 3,
      },
    });

    const productLatte = await prisma.product.upsert({
      where: { id: 'prod-latte' },
      update: {},
      create: {
        id: 'prod-latte',
        organizationId: org.id,
        categoryId: categoryBebidas.id,
        sku: 'BEB-LAT-001',
        name: 'Latte',
        description: 'Espresso con leche vaporizada',
        price: 58.0,
        cost: 16.0,
        type: 'SIMPLE',
        status: 'ACTIVE',
        taxRate: 0.16,
        taxIncluded: false,
        trackInventory: false,
        allowModifiers: true,
        isAvailable: true,
        preparationTimeMinutes: 3,
      },
    });

    const productMocha = await prisma.product.upsert({
      where: { id: 'prod-mocha' },
      update: {},
      create: {
        id: 'prod-mocha',
        organizationId: org.id,
        categoryId: categoryBebidas.id,
        sku: 'BEB-MOC-001',
        name: 'Mocha',
        description: 'Espresso con chocolate y leche',
        price: 62.0,
        cost: 22.0,
        type: 'SIMPLE',
        status: 'ACTIVE',
        taxRate: 0.16,
        taxIncluded: false,
        trackInventory: false,
        allowModifiers: true,
        isAvailable: true,
        preparationTimeMinutes: 4,
      },
    });

    const productCroissant = await prisma.product.upsert({
      where: { id: 'prod-croissant' },
      update: {},
      create: {
        id: 'prod-croissant',
        organizationId: org.id,
        categoryId: categoryPasteles.id,
        sku: 'PAS-CRO-001',
        name: 'Croissant',
        description: 'Croissant de mantequilla',
        price: 40.0,
        cost: 12.0,
        type: 'SIMPLE',
        status: 'ACTIVE',
        taxRate: 0.16,
        taxIncluded: false,
        trackInventory: false,
        allowModifiers: false,
        isAvailable: true,
        preparationTimeMinutes: 1,
      },
    });

    console.log(
      `   ✅ ${productCappuccino.name} - $${productCappuccino.price}`,
    );
    console.log(`   ✅ ${productLatte.name} - $${productLatte.price}`);
    console.log(`   ✅ ${productMocha.name} - $${productMocha.price}`);
    console.log(
      `   ✅ ${productCroissant.name} - $${productCroissant.price}\n`,
    );

    // 5. CONECTAR MODIFICADORES CON PRODUCTOS
    console.log('🔗 Conectando modificadores con productos...');

    const productosConModificadores = [
      productCappuccino,
      productLatte,
      productMocha,
    ];
    const modificadores = [modLeche, modShot, modSize];

    for (const producto of productosConModificadores) {
      for (const modificador of modificadores) {
        await prisma.productModifier.upsert({
          where: {
            productId_modifierId: {
              productId: producto.id,
              modifierId: modificador.id,
            },
          },
          update: {},
          create: {
            productId: producto.id,
            modifierId: modificador.id,
          },
        });
      }
      console.log(
        `   ✅ ${producto.name} → ${modificadores.length} modificadores`,
      );
    }
    console.log();

    // 6. CREAR RECETAS
    console.log('📝 Creando recetas costeadas...');

    const recipeCappuccino = await prisma.recipe.upsert({
      where: { id: 'recipe-cappuccino' },
      update: {},
      create: {
        id: 'recipe-cappuccino',
        organizationId: org.id,
        productId: productCappuccino.id,
        name: 'Receta Cappuccino',
        description: 'Preparación estándar de cappuccino',
        yield: 1,
        yieldUnit: 'taza',
        prepTime: 3,
        totalCost: 15.0,
        costingStatus: 'COMPLETE',
        readyForPos: true,
        version: 1,
        active: true,
      },
    });

    const recipeLatte = await prisma.recipe.upsert({
      where: { id: 'recipe-latte' },
      update: {},
      create: {
        id: 'recipe-latte',
        organizationId: org.id,
        productId: productLatte.id,
        name: 'Receta Latte',
        description: 'Preparación estándar de latte',
        yield: 1,
        yieldUnit: 'taza',
        prepTime: 3,
        totalCost: 16.0,
        costingStatus: 'COMPLETE',
        readyForPos: true,
        version: 1,
        active: true,
      },
    });

    const recipeMocha = await prisma.recipe.upsert({
      where: { id: 'recipe-mocha' },
      update: {},
      create: {
        id: 'recipe-mocha',
        organizationId: org.id,
        productId: productMocha.id,
        name: 'Receta Mocha',
        description: 'Preparación estándar de mocha',
        yield: 1,
        yieldUnit: 'taza',
        prepTime: 4,
        totalCost: 22.0,
        costingStatus: 'COMPLETE',
        readyForPos: true,
        version: 1,
        active: true,
      },
    });

    console.log(
      `   ✅ ${recipeCappuccino.name} - Costo: $${recipeCappuccino.totalCost}`,
    );
    console.log(`   ✅ ${recipeLatte.name} - Costo: $${recipeLatte.totalCost}`);
    console.log(
      `   ✅ ${recipeMocha.name} - Costo: $${recipeMocha.totalCost}\n`,
    );

    // 7. AGREGAR INGREDIENTES A RECETAS
    console.log('🧪 Agregando ingredientes a recetas...');

    // Cappuccino: 30ml café + 150ml leche
    await prisma.recipeIngredient.upsert({
      where: {
        recipeId_inventoryItemId: {
          recipeId: recipeCappuccino.id,
          inventoryItemId: 'ing-cafe',
        },
      },
      update: {},
      create: {
        recipeId: recipeCappuccino.id,
        inventoryItemId: 'ing-cafe',
        quantity: 30,
        unit: 'ml',
        unitCost: 0.85,
        totalCost: 25.5,
        isCosted: true,
      },
    });

    await prisma.recipeIngredient.upsert({
      where: {
        recipeId_inventoryItemId: {
          recipeId: recipeCappuccino.id,
          inventoryItemId: 'ing-leche',
        },
      },
      update: {},
      create: {
        recipeId: recipeCappuccino.id,
        inventoryItemId: 'ing-leche',
        quantity: 150,
        unit: 'ml',
        unitCost: 0.15,
        totalCost: 22.5,
        isCosted: true,
      },
    });

    // Latte: 30ml café + 200ml leche
    await prisma.recipeIngredient.upsert({
      where: {
        recipeId_inventoryItemId: {
          recipeId: recipeLatte.id,
          inventoryItemId: 'ing-cafe',
        },
      },
      update: {},
      create: {
        recipeId: recipeLatte.id,
        inventoryItemId: 'ing-cafe',
        quantity: 30,
        unit: 'ml',
        unitCost: 0.85,
        totalCost: 25.5,
        isCosted: true,
      },
    });

    await prisma.recipeIngredient.upsert({
      where: {
        recipeId_inventoryItemId: {
          recipeId: recipeLatte.id,
          inventoryItemId: 'ing-leche',
        },
      },
      update: {},
      create: {
        recipeId: recipeLatte.id,
        inventoryItemId: 'ing-leche',
        quantity: 200,
        unit: 'ml',
        unitCost: 0.15,
        totalCost: 30.0,
        isCosted: true,
      },
    });

    // Mocha: 30ml café + 150ml leche + 20g chocolate
    await prisma.recipeIngredient.upsert({
      where: {
        recipeId_inventoryItemId: {
          recipeId: recipeMocha.id,
          inventoryItemId: 'ing-cafe',
        },
      },
      update: {},
      create: {
        recipeId: recipeMocha.id,
        inventoryItemId: 'ing-cafe',
        quantity: 30,
        unit: 'ml',
        unitCost: 0.85,
        totalCost: 25.5,
        isCosted: true,
      },
    });

    await prisma.recipeIngredient.upsert({
      where: {
        recipeId_inventoryItemId: {
          recipeId: recipeMocha.id,
          inventoryItemId: 'ing-leche',
        },
      },
      update: {},
      create: {
        recipeId: recipeMocha.id,
        inventoryItemId: 'ing-leche',
        quantity: 150,
        unit: 'ml',
        unitCost: 0.15,
        totalCost: 22.5,
        isCosted: true,
      },
    });

    await prisma.recipeIngredient.upsert({
      where: {
        recipeId_inventoryItemId: {
          recipeId: recipeMocha.id,
          inventoryItemId: 'ing-chocolate',
        },
      },
      update: {},
      create: {
        recipeId: recipeMocha.id,
        inventoryItemId: 'ing-chocolate',
        quantity: 20,
        unit: 'g',
        unitCost: 2.5,
        totalCost: 50.0,
        isCosted: true,
      },
    });

    console.log(`   ✅ Cappuccino: 2 ingredientes`);
    console.log(`   ✅ Latte: 2 ingredientes`);
    console.log(`   ✅ Mocha: 3 ingredientes\n`);

    console.log('🎉 ¡Seed de sandbox completado!\n');
    console.log('📊 Resumen:');
    console.log(`   - 2 categorías`);
    console.log(`   - 3 modificadores`);
    console.log(`   - 5 ingredientes costeados`);
    console.log(`   - 4 productos`);
    console.log(`   - 3 recetas completas y aprobadas`);
    console.log(`   - 7 ingredientes de recetas\n`);

    console.log('✅ Listo para crear tickets y probar el flujo POS → KDS!\n');
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSandbox().catch((e) => {
  console.error(e);
  process.exit(1);
});
