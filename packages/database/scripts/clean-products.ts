import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanProductsData() {
  console.log(
    '🧹 Limpiando datos de productos, inventario, costeo y ventas...\n',
  );

  try {
    // 1. Eliminar modificadores de líneas de tickets
    console.log('🔧 Eliminando modificadores de líneas de tickets...');
    const ticketLineModifiersCount = await prisma.ticketLineModifier.deleteMany(
      {},
    );
    console.log(
      `   ✅ ${ticketLineModifiersCount.count} modificadores de líneas eliminados`,
    );

    // 2. Eliminar items de órdenes de cocina
    console.log('� Eliminando items de órdenes de cocina...');
    const orderItemsCount = await prisma.orderItem.deleteMany({});
    console.log(`   ✅ ${orderItemsCount.count} items de órdenes eliminados`);

    // 3. Eliminar órdenes de cocina
    console.log('� Eliminando órdenes de cocina...');
    const ordersCount = await prisma.order.deleteMany({});
    console.log(`   ✅ ${ordersCount.count} órdenes eliminadas`);

    // 4. Eliminar líneas de tickets
    console.log('🧾 Eliminando líneas de tickets...');
    const ticketLinesCount = await prisma.ticketLine.deleteMany({});
    console.log(`   ✅ ${ticketLinesCount.count} líneas de tickets eliminadas`);

    // 5. Eliminar pagos
    console.log('� Eliminando pagos...');
    const paymentsCount = await prisma.payment.deleteMany({});
    console.log(`   ✅ ${paymentsCount.count} pagos eliminados`);

    // 6. Eliminar facturas CFDI
    console.log('🧾 Eliminando facturas CFDI...');
    const invoicesCount = await prisma.invoiceCfdi.deleteMany({});
    console.log(`   ✅ ${invoicesCount.count} facturas eliminadas`);

    // 7. Eliminar tickets
    console.log('🎫 Eliminando tickets...');
    const ticketsCount = await prisma.ticket.deleteMany({});
    console.log(`   ✅ ${ticketsCount.count} tickets eliminados`);

    // 8. Eliminar registros de inventario de productos
    console.log('📦 Eliminando registros de inventario...');
    const inventoryCount = await prisma.inventory.deleteMany({});
    console.log(
      `   ✅ ${inventoryCount.count} registros de inventario eliminados`,
    );

    // 9. Eliminar ingredientes de recetas
    console.log('🧪 Eliminando ingredientes de recetas...');
    const ingredientsCount = await prisma.recipeIngredient.deleteMany({});
    console.log(`   ✅ ${ingredientsCount.count} ingredientes eliminados`);

    // 10. Eliminar recetas
    console.log('📝 Eliminando recetas...');
    const recipesCount = await prisma.recipe.deleteMany({});
    console.log(`   ✅ ${recipesCount.count} recetas eliminadas`);

    // 11. Eliminar relaciones producto-modificador
    console.log('🔧 Eliminando relaciones producto-modificador...');
    const productModifiersCount = await prisma.productModifier.deleteMany({});
    console.log(`   ✅ ${productModifiersCount.count} relaciones eliminadas`);

    // 12. Eliminar productos
    console.log('🛍️  Eliminando productos...');
    const productsCount = await prisma.product.deleteMany({});
    console.log(`   ✅ ${productsCount.count} productos eliminados`);

    // 13. Eliminar categorías
    console.log('📂 Eliminando categorías...');
    const categoriesCount = await prisma.category.deleteMany({});
    console.log(`   ✅ ${categoriesCount.count} categorías eliminadas`);

    // 14. Eliminar modificadores
    console.log('⚙️  Eliminando modificadores...');
    const modifiersCount = await prisma.modifier.deleteMany({});
    console.log(`   ✅ ${modifiersCount.count} modificadores eliminados`);

    // 15. Eliminar items de inventario (ingredientes/materia prima)
    console.log('📦 Eliminando items de inventario (materia prima)...');
    const inventoryItemsCount = await prisma.inventoryItem.deleteMany({});
    console.log(
      `   ✅ ${inventoryItemsCount.count} items de inventario eliminados`,
    );

    // 16. Eliminar movimientos de inventario
    console.log('📊 Eliminando movimientos de inventario...');
    const movementsCount = await prisma.inventoryMovement.deleteMany({});
    console.log(`   ✅ ${movementsCount.count} movimientos eliminados`);

    // 17. Eliminar proveedores
    console.log('🏭 Eliminando proveedores...');
    const suppliersCount = await prisma.supplier.deleteMany({});
    console.log(`   ✅ ${suppliersCount.count} proveedores eliminados`);

    console.log('\n🎉 ¡Limpieza completada exitosamente!');
    console.log('\n📝 Resumen:');
    console.log(
      `   - ${ticketLineModifiersCount.count} modificadores de líneas`,
    );
    console.log(`   - ${orderItemsCount.count} items de órdenes de cocina`);
    console.log(`   - ${ordersCount.count} órdenes de cocina`);
    console.log(`   - ${ticketLinesCount.count} líneas de tickets`);
    console.log(`   - ${paymentsCount.count} pagos`);
    console.log(`   - ${invoicesCount.count} facturas CFDI`);
    console.log(`   - ${ticketsCount.count} tickets`);
    console.log(`   - ${inventoryCount.count} registros de inventario`);
    console.log(`   - ${ingredientsCount.count} ingredientes de recetas`);
    console.log(`   - ${recipesCount.count} recetas`);
    console.log(
      `   - ${productModifiersCount.count} relaciones producto-modificador`,
    );
    console.log(`   - ${productsCount.count} productos`);
    console.log(`   - ${categoriesCount.count} categorías`);
    console.log(`   - ${modifiersCount.count} modificadores`);
    console.log(`   - ${inventoryItemsCount.count} items de inventario`);
    console.log(`   - ${movementsCount.count} movimientos de inventario`);
    console.log(`   - ${suppliersCount.count} proveedores`);
    console.log('\n✨ Base de datos lista para empezar desde cero.\n');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanProductsData().catch((e) => {
  console.error(e);
  process.exit(1);
});
