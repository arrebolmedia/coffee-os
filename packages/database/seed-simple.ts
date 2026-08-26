import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database (Simple - 3 Products)...');

  // La organización se resuelve ANTES de borrar: los deleteMany de abajo van
  // acotados a ella. Sin filtro borraban el catálogo de TODAS las
  // organizaciones de la base, incluidos otros tenants.
  const org = await prisma.organization.findFirst({
    where: { slug: 'coffee-demo' },
  });

  if (!org) {
    throw new Error('Organization not found. Run main seed first.');
  }

  // 1. Limpiar datos existentes de ESTA organización (no toca roles ni usuarios)
  console.log(`🧹 Cleaning existing data for org ${org.slug}...`);
  const orgScope = { organizationId: org.id };
  await prisma.recipeIngredient.deleteMany({ where: { recipe: orgScope } });
  await prisma.recipe.deleteMany({ where: orgScope });
  await prisma.inventory.deleteMany({ where: orgScope });
  await prisma.product.deleteMany({ where: orgScope });
  await prisma.category.deleteMany({ where: orgScope });
  await prisma.inventoryItem.deleteMany({ where: orgScope });
  await prisma.supplier.deleteMany({ where: orgScope });
  console.log('✅ Data cleaned');

  const location = await prisma.location.findFirst({
    where: { organizationId: org.id },
  });

  if (!location) {
    throw new Error('Location not found. Run main seed first.');
  }

  console.log('✅ Using existing org and location');

  // 2. Crear proveedor
  console.log('📦 Creating supplier...');
  await prisma.supplier.create({
    data: {
      name: 'Café Premium México',
      contactName: 'Carlos Rodríguez',
      email: 'ventas@cafepremium.mx',
      phone: '55-1234-5678',
      address: 'Av. Reforma 123, CDMX',
      paymentTerms: '30 días',
      leadTime: 3,
      active: true,
      organizationId: org.id,
    },
  });
  console.log('✅ Supplier created');

  // 3. Crear categoría
  console.log('📦 Creating category...');
  const category = await prisma.category.create({
    data: {
      name: 'Espresso',
      icon: '☕',
      color: '#8B4513',
      sortOrder: 0,
      organizationId: org.id,
    },
  });
  console.log('✅ Category created');

  // 4. Crear items de inventario (ingredientes)
  console.log('📦 Creating inventory items...');
  const cafeGrano = await prisma.inventoryItem.create({
    data: {
      code: 'INV-CAFE-001',
      name: 'Café en Grano Premium',
      description: 'Café arábica 100%, origen Colombia',
      unitOfMeasure: 'kg',
      costPerUnit: 280,
      parLevel: 50,
      reorderPoint: 20,
      category: 'COFFEE_BEANS',
      active: true,
      organizationId: org.id,
    },
  });

  const leche = await prisma.inventoryItem.create({
    data: {
      code: 'INV-LECHE-001',
      name: 'Leche Entera',
      description: 'Leche entera pasteurizada',
      unitOfMeasure: 'l',
      costPerUnit: 18,
      parLevel: 100,
      reorderPoint: 40,
      category: 'DAIRY',
      active: true,
      organizationId: org.id,
    },
  });

  const agua = await prisma.inventoryItem.create({
    data: {
      code: 'INV-AGUA-001',
      name: 'Agua Filtrada',
      description: 'Agua filtrada para café',
      unitOfMeasure: 'l',
      costPerUnit: 2,
      parLevel: 200,
      reorderPoint: 50,
      category: 'WATER',
      active: true,
      organizationId: org.id,
    },
  });

  console.log('✅ Inventory items created');

  // 5. Crear 3 productos
  console.log('🛍️  Creating 3 products...');

  const espresso = await prisma.product.create({
    data: {
      sku: 'PROD-ESP-001',
      name: 'Espresso',
      description: 'Shot doble de espresso intenso',
      price: 35,
      cost: 8.5,
      taxRate: 0.16,
      categoryId: category.id,
      image: '/products/espresso.jpg',
      isFeatured: true,
      organizationId: org.id,
    },
  });

  const americano = await prisma.product.create({
    data: {
      sku: 'PROD-AME-001',
      name: 'Americano',
      description: 'Espresso con agua caliente',
      price: 45,
      cost: 9.5,
      taxRate: 0.16,
      categoryId: category.id,
      image: '/products/americano.jpg',
      isFeatured: true,
      organizationId: org.id,
    },
  });

  const latte = await prisma.product.create({
    data: {
      sku: 'PROD-LAT-001',
      name: 'Latte',
      description: 'Espresso con leche vaporizada',
      price: 55,
      cost: 13.8,
      taxRate: 0.16,
      categoryId: category.id,
      image: '/products/latte.jpg',
      isFeatured: true,
      organizationId: org.id,
    },
  });

  console.log('✅ Products created');

  // 6. Crear recetas
  console.log('📝 Creating recipes...');

  // Receta: Espresso
  const espressoRecipe = await prisma.recipe.create({
    data: {
      organizationId: org.id,
      productId: espresso.id,
      name: 'Espresso Clásico',
      description: 'Shot doble de espresso',
      instructions:
        '1. Moler 18g de café fino\n2. Prensar con 30 lbs de presión\n3. Extraer 36ml en 25-30 segundos a 90-96°C',
      yield: 1,
      yieldUnit: 'serving',
      prepTime: 60,
      allergens: [],
      version: 1,
      active: true,
    },
  });

  await prisma.recipeIngredient.create({
    data: {
      recipeId: espressoRecipe.id,
      inventoryItemId: cafeGrano.id,
      quantity: 0.018, // 18 gramos
      unit: 'kg',
      notes: 'Molienda fina, presión 9 bar',
    },
  });

  // Receta: Americano
  const americanoRecipe = await prisma.recipe.create({
    data: {
      organizationId: org.id,
      productId: americano.id,
      name: 'Americano Tradicional',
      description: 'Espresso doble con agua caliente',
      instructions:
        '1. Preparar shot doble de espresso (18g café)\n2. Agregar 180ml de agua caliente a 85°C\n3. Servir inmediatamente',
      yield: 1,
      yieldUnit: 'serving',
      prepTime: 90,
      allergens: [],
      version: 1,
      active: true,
    },
  });

  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipeId: americanoRecipe.id,
        inventoryItemId: cafeGrano.id,
        quantity: 0.018, // 18 gramos
        unit: 'kg',
        notes: 'Shot doble de espresso',
      },
      {
        recipeId: americanoRecipe.id,
        inventoryItemId: agua.id,
        quantity: 0.18, // 180ml
        unit: 'l',
        notes: 'Agua caliente 85°C',
      },
    ],
  });

  // Receta: Latte
  const latteRecipe = await prisma.recipe.create({
    data: {
      organizationId: org.id,
      productId: latte.id,
      name: 'Latte Cremoso',
      description: 'Espresso con leche vaporizada y espuma',
      instructions:
        '1. Preparar shot doble de espresso (18g café)\n2. Vaporizar 240ml de leche entera a 65°C\n3. Verter leche con técnica para arte latte\n4. Terminar con espuma fina en la superficie',
      yield: 1,
      yieldUnit: 'serving',
      prepTime: 120,
      allergens: ['dairy'],
      version: 1,
      active: true,
    },
  });

  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipeId: latteRecipe.id,
        inventoryItemId: cafeGrano.id,
        quantity: 0.018, // 18 gramos
        unit: 'kg',
        notes: 'Shot doble de espresso',
      },
      {
        recipeId: latteRecipe.id,
        inventoryItemId: leche.id,
        quantity: 0.24, // 240ml
        unit: 'l',
        notes: 'Leche entera vaporizada a 65°C',
      },
    ],
  });

  console.log('✅ Recipes created');

  // 7. Crear inventario inicial para productos
  console.log('📦 Creating initial product inventory...');

  const products = [
    { product: espresso, stock: 50 },
    { product: americano, stock: 50 },
    { product: latte, stock: 50 },
  ];

  for (const { product, stock } of products) {
    await prisma.inventory.create({
      data: {
        productId: product.id,
        organizationId: org.id,
        locationId: location.id,
        currentStock: stock,
        minStock: 10,
        maxStock: 100,
        reorderPoint: 20,
        unitCost: product.cost || 0,
        totalValue: stock * (product.cost || 0),
      },
    });
  }

  console.log('✅ Product inventory created');

  // 8. Calcular y mostrar costos
  console.log('\n📊 Costeo de Productos:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const productsWithRecipes = await prisma.product.findMany({
    where: { organizationId: org.id },
    include: {
      recipes: {
        where: { active: true },
        include: {
          ingredients: {
            include: {
              inventoryItem: true,
            },
          },
        },
      },
    },
  });

  for (const prod of productsWithRecipes) {
    console.log(`\n${prod.name} (${prod.sku})`);
    console.log(`  Precio de Venta: $${prod.price.toFixed(2)}`);

    if (prod.recipes.length > 0) {
      const recipe = prod.recipes[0];
      let totalCost = 0;

      console.log(`  Ingredientes:`);
      for (const ing of recipe.ingredients) {
        const cost = ing.quantity * ing.inventoryItem.costPerUnit;
        totalCost += cost;
        console.log(
          `    - ${ing.inventoryItem.name}: ${ing.quantity}${ing.unit} × $${ing.inventoryItem.costPerUnit.toFixed(2)} = $${cost.toFixed(2)}`,
        );
      }

      const margin = prod.price - totalCost;
      const marginPercent = ((margin / prod.price) * 100).toFixed(1);

      console.log(`  Costo Total: $${totalCost.toFixed(2)}`);
      console.log(`  Margen: $${margin.toFixed(2)} (${marginPercent}%)`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Summary:');
  console.log('   ✅ 1 Supplier');
  console.log('   ✅ 1 Category');
  console.log('   ✅ 3 Inventory Items');
  console.log('   ✅ 3 Products (Espresso, Americano, Latte)');
  console.log('   ✅ 3 Recipes with ingredients');
  console.log('   ✅ Product inventory records');
  console.log('\n📝 Users (unchanged):');
  console.log('   Owner:    owner@coffeedemo.mx / password123');
  console.log('   Manager:  manager@coffeedemo.mx / password123');
  console.log('   Barista:  barista@coffeedemo.mx / password123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
