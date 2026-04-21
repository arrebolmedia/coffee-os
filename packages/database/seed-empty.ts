import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database (Empty System)...');

  // 1. Limpiar TODOS los datos
  console.log('🧹 Cleaning all data...');
  await prisma.recipeIngredient.deleteMany({});
  await prisma.recipe.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.role.deleteMany({});
  console.log('✅ All data cleaned');

  // 2. Crear roles básicos
  console.log('👥 Creating roles...');
  const roles = await Promise.all([
    prisma.role.create({
      data: {
        name: 'owner',
        description: 'Dueño - Acceso total al sistema',
        scopes: ['all'],
        active: true,
      },
    }),
    prisma.role.create({
      data: {
        name: 'manager',
        description: 'Gerente - Gestión operativa completa',
        scopes: ['pos', 'inventory', 'reports', 'customers', 'employees'],
        active: true,
      },
    }),
    prisma.role.create({
      data: {
        name: 'barista',
        description: 'Barista - Operación del POS',
        scopes: ['pos'],
        active: true,
      },
    }),
  ]);
  console.log('✅ Roles created');

  // 3. Crear organización demo
  console.log('🏢 Creating demo organization...');
  const org = await prisma.organization.create({
    data: {
      name: 'Coffee Demo',
      slug: 'coffee-demo',
      description: 'Organización de demostración',
      timezone: 'America/Mexico_City',
      active: true,
    },
  });
  console.log('✅ Organization created');

  // 4. Crear ubicación demo
  console.log('📍 Creating demo location...');
  const location = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: 'Sucursal Centro',
      address: 'Av. Juárez 123, Centro, CDMX',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06000',
      country: 'MX',
      phone: '55-1234-5678',
      email: 'centro@coffeedemo.mx',
      timezone: 'America/Mexico_City',
      taxRate: 0.16,
      currency: 'MXN',
      active: true,
    },
  });
  console.log('✅ Location created');

  // 5. Crear usuarios demo
  console.log('👤 Creating demo users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'owner@coffeedemo.mx',
        firstName: 'Roberto',
        lastName: 'Dueño',
        password: hashedPassword,
        organizationId: org.id,
        roleId: roles[0].id,
        active: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'manager@coffeedemo.mx',
        firstName: 'María',
        lastName: 'Gerente',
        password: hashedPassword,
        organizationId: org.id,
        roleId: roles[1].id,
        active: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'barista@coffeedemo.mx',
        firstName: 'Carlos',
        lastName: 'Barista',
        password: hashedPassword,
        organizationId: org.id,
        roleId: roles[2].id,
        active: true,
      },
    }),
  ]);
  console.log('✅ Users created');

  console.log('\n🎉 Empty system seeded successfully!');
  console.log('\n📝 Summary:');
  console.log('   ✅ Organization: Coffee Demo');
  console.log('   ✅ Location: Sucursal Centro');
  console.log('   ✅ 3 Users (owner, manager, barista)');
  console.log('   ✅ 3 Roles');
  console.log('   ❌ 0 Products');
  console.log('   ❌ 0 Recipes');
  console.log('   ❌ 0 Inventory Items');
  console.log('   ❌ 0 Categories');
  console.log('   ❌ 0 Suppliers');
  
  console.log('\n📝 Demo credentials:');
  console.log('   Owner:    owner@coffeedemo.mx / password123');
  console.log('   Manager:  manager@coffeedemo.mx / password123');
  console.log('   Barista:  barista@coffeedemo.mx / password123');
  
  console.log('\n🚀 Sistema listo para empezar desde cero!');
  console.log('   1. Crear categorías');
  console.log('   2. Crear proveedores');
  console.log('   3. Crear items de inventario');
  console.log('   4. Crear productos');
  console.log('   5. Crear recetas');
  console.log('   6. Costear productos');
  console.log('   7. Agregar al POS');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
