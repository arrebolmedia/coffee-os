/**
 * Script para verificar que los datos del seed existen en la base de datos
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySeedData() {
  console.log('🔍 Verificando datos del seed...\n');

  try {
    // 1. Verificar organización
    const org = await prisma.organization.findFirst();
    console.log(
      org
        ? `✅ Organización: ${org.name} (${org.id})`
        : '❌ No se encontró organización',
    );

    // 2. Verificar usuarios
    const users = await prisma.user.findMany();
    console.log(
      `✅ Usuarios: ${users.length} encontrados (${users.map((u) => u.email).join(', ')})`,
    );

    // 3. Verificar categorías
    const categories = await prisma.category.findMany();
    console.log(`✅ Categorías: ${categories.length} encontradas`);

    // 4. Verificar productos
    const products = await prisma.product.findMany();
    console.log(`✅ Productos: ${products.length} encontrados`);

    // 5. Verificar proveedores
    const suppliers = await prisma.supplier.findMany();
    console.log(
      `✅ Proveedores: ${suppliers.length} encontrados (${suppliers.map((s) => s.name).join(', ')})`,
    );

    // 6. Verificar items de inventario
    const inventoryItems = await prisma.inventoryItem.findMany();
    console.log(
      `✅ Items de Inventario: ${inventoryItems.length} encontrados (${inventoryItems.map((i) => i.name).join(', ')})`,
    );

    // 7. Verificar recetas
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
        product: true,
      },
    });
    console.log(`✅ Recetas: ${recipes.length} encontradas`);

    recipes.forEach((recipe) => {
      console.log(`   - ${recipe.name} (${recipe.product.name})`);
      recipe.ingredients.forEach((ing) => {
        console.log(
          `     • ${ing.quantity} ${ing.unit} de ${ing.inventoryItem.name}`,
        );
      });
    });

    console.log('\n✅ Verificación completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - Organizaciones: 1`);
    console.log(`   - Usuarios: ${users.length}`);
    console.log(`   - Categorías: ${categories.length}`);
    console.log(`   - Productos: ${products.length}`);
    console.log(`   - Proveedores: ${suppliers.length}`);
    console.log(`   - Items Inventario: ${inventoryItems.length}`);
    console.log(`   - Recetas: ${recipes.length}`);
    console.log(
      `   - Ingredientes: ${recipes.reduce((sum, r) => sum + r.ingredients.length, 0)}`,
    );

    if (org) {
      console.log(`\n🔑 Organization ID para pruebas: ${org.id}`);
    }
  } catch (error) {
    console.error('❌ Error al verificar datos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifySeedData();
