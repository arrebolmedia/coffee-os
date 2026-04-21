import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding recipes...');

  // Obtener productos existentes
  const products = await prisma.product.findMany({
    where: {
      sku: {
        in: ['ESP-001', 'ESP-002', 'ESP-003', 'ESP-004', 'FIL-001', 'COL-001'],
      },
    },
  });

  if (products.length === 0) {
    console.log('❌ No se encontraron productos. Ejecuta seed.ts primero.');
    return;
  }

  // Crear items de inventario básicos
  console.log('📦 Creating inventory items...');

  const coffeeItem = await prisma.inventoryItem.upsert({
    where: { code: 'INV-COFFEE-001' },
    update: {},
    create: {
      code: 'INV-COFFEE-001',
      name: 'Café Molido Premium',
      description: 'Café arabica 100%',
      unitOfMeasure: 'g',
      costPerUnit: 0.15, // $0.15 por gramo
      category: 'Café',
      parLevel: 10000,
      reorderPoint: 2000,
      active: true,
    },
  });

  const milkItem = await prisma.inventoryItem.upsert({
    where: { code: 'INV-MILK-001' },
    update: {},
    create: {
      code: 'INV-MILK-001',
      name: 'Leche Entera',
      description: 'Leche pasteurizada',
      unitOfMeasure: 'ml',
      costPerUnit: 0.02, // $0.02 por ml
      category: 'Lácteos',
      parLevel: 50000,
      reorderPoint: 10000,
      active: true,
    },
  });

  const waterItem = await prisma.inventoryItem.upsert({
    where: { code: 'INV-WATER-001' },
    update: {},
    create: {
      code: 'INV-WATER-001',
      name: 'Agua Filtrada',
      description: 'Agua purificada',
      unitOfMeasure: 'ml',
      costPerUnit: 0.001, // $0.001 por ml
      category: 'Agua',
      parLevel: 100000,
      reorderPoint: 20000,
      active: true,
    },
  });

  console.log('✅ Inventory items created');

  // Crear recetas para cada producto
  console.log('📖 Creating recipes...');

  for (const product of products) {
    let recipeData: any = null;

    switch (product.sku) {
      case 'ESP-001': // Espresso
        recipeData = {
          productId: product.id,
          name: 'Espresso Doble',
          description: 'Extracción perfecta de espresso',
          instructions:
            '1. Moler 18g de café\n2. Extraer por 25-30 segundos\n3. Servir inmediatamente',
          yield: 1,
          yieldUnit: 'shot',
          prepTime: 180, // 3 minutos
          allergens: [],
          active: true,
        };
        break;

      case 'ESP-002': // Americano
        recipeData = {
          productId: product.id,
          name: 'Americano',
          description: 'Espresso con agua caliente',
          instructions:
            '1. Preparar espresso doble\n2. Agregar 180ml de agua caliente\n3. Servir',
          yield: 1,
          yieldUnit: 'cup',
          prepTime: 240,
          allergens: [],
          active: true,
        };
        break;

      case 'ESP-003': // Cappuccino
        recipeData = {
          productId: product.id,
          name: 'Cappuccino',
          description: 'Espresso con leche vaporizada y espuma',
          instructions:
            '1. Preparar espresso doble\n2. Vaporizar 150ml de leche\n3. Verter creando arte latte',
          yield: 1,
          yieldUnit: 'cup',
          prepTime: 300,
          allergens: ['MILK'],
          active: true,
        };
        break;

      case 'ESP-004': // Latte
        recipeData = {
          productId: product.id,
          name: 'Latte',
          description: 'Espresso con leche vaporizada',
          instructions:
            '1. Preparar espresso doble\n2. Vaporizar 240ml de leche\n3. Verter suavemente',
          yield: 1,
          yieldUnit: 'cup',
          prepTime: 300,
          allergens: ['MILK'],
          active: true,
        };
        break;

      case 'FIL-001': // Chemex
        recipeData = {
          productId: product.id,
          name: 'Chemex',
          description: 'Café filtrado método Chemex',
          instructions:
            '1. Calentar agua a 93°C\n2. Moler 30g de café (medio)\n3. Verter 500ml agua en círculos\n4. Tiempo total 4 minutos',
          yield: 2,
          yieldUnit: 'cup',
          prepTime: 420,
          allergens: [],
          active: true,
        };
        break;

      case 'COL-001': // Cold Brew
        recipeData = {
          productId: product.id,
          name: 'Cold Brew',
          description: 'Café de extracción en frío',
          instructions:
            '1. Moler 200g café grueso\n2. Agregar 1.5L agua fría\n3. Reposar 12-16 horas\n4. Filtrar y servir con hielo',
          yield: 10,
          yieldUnit: 'cup',
          prepTime: 300, // Tiempo de preparación activo
          allergens: [],
          active: true,
        };
        break;
    }

    if (recipeData) {
      // Buscar receta existente por productId
      let recipe = await prisma.recipe.findFirst({
        where: {
          productId: product.id,
        },
      });

      if (recipe) {
        // Actualizar receta existente
        recipe = await prisma.recipe.update({
          where: { id: recipe.id },
          data: recipeData,
        });
      } else {
        // Crear nueva receta
        recipe = await prisma.recipe.create({
          data: recipeData,
        });
      }

      // Crear ingredientes de la receta
      if (recipe) {
        // Limpiar ingredientes existentes
        await prisma.recipeIngredient.deleteMany({
          where: { recipeId: recipe.id },
        });

        // Agregar nuevos ingredientes según el producto
        const ingredients: any[] = [];

        switch (product.sku) {
          case 'ESP-001': // Espresso
            ingredients.push({
              recipeId: recipe.id,
              inventoryItemId: coffeeItem.id,
              quantity: 18,
              unit: 'g',
              notes: 'Molienda fina',
            });
            break;

          case 'ESP-002': // Americano
            ingredients.push(
              {
                recipeId: recipe.id,
                inventoryItemId: coffeeItem.id,
                quantity: 18,
                unit: 'g',
                notes: 'Para el espresso',
              },
              {
                recipeId: recipe.id,
                inventoryItemId: waterItem.id,
                quantity: 180,
                unit: 'ml',
                notes: 'Agua caliente',
              },
            );
            break;

          case 'ESP-003': // Cappuccino
            ingredients.push(
              {
                recipeId: recipe.id,
                inventoryItemId: coffeeItem.id,
                quantity: 18,
                unit: 'g',
              },
              {
                recipeId: recipe.id,
                inventoryItemId: milkItem.id,
                quantity: 150,
                unit: 'ml',
                notes: 'Vaporizada con espuma',
              },
            );
            break;

          case 'ESP-004': // Latte
            ingredients.push(
              {
                recipeId: recipe.id,
                inventoryItemId: coffeeItem.id,
                quantity: 18,
                unit: 'g',
              },
              {
                recipeId: recipe.id,
                inventoryItemId: milkItem.id,
                quantity: 240,
                unit: 'ml',
                notes: 'Vaporizada',
              },
            );
            break;

          case 'FIL-001': // Chemex
            ingredients.push(
              {
                recipeId: recipe.id,
                inventoryItemId: coffeeItem.id,
                quantity: 30,
                unit: 'g',
                notes: 'Molienda media',
              },
              {
                recipeId: recipe.id,
                inventoryItemId: waterItem.id,
                quantity: 500,
                unit: 'ml',
                notes: '93°C',
              },
            );
            break;

          case 'COL-001': // Cold Brew
            ingredients.push(
              {
                recipeId: recipe.id,
                inventoryItemId: coffeeItem.id,
                quantity: 200,
                unit: 'g',
                notes: 'Molienda gruesa',
              },
              {
                recipeId: recipe.id,
                inventoryItemId: waterItem.id,
                quantity: 1500,
                unit: 'ml',
                notes: 'Agua fría filtrada',
              },
            );
            break;
        }

        if (ingredients.length > 0) {
          await prisma.recipeIngredient.createMany({
            data: ingredients,
            skipDuplicates: true,
          });
        }

        console.log(`✅ Receta creada: ${recipe.name} para ${product.name}`);
      }
    }
  }

  console.log('');
  console.log('🎉 Recipes seeded successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(
    `   • ${products.length} recetas creadas para productos existentes`,
  );
  console.log('   • 3 items de inventario creados (café, leche, agua)');
  console.log('   • Ingredientes asignados a cada receta');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding recipes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
