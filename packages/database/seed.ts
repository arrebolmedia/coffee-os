import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Crear roles predefinidos
  console.log('👥 Creating roles...');
  const roles = [
    {
      name: 'OWNER',
      description: 'Propietario con acceso total',
      scopes: ['*:*'],
    },
    {
      name: 'MANAGER',
      description: 'Gerente con acceso operativo',
      scopes: [
        'products:*',
        'inventory:*',
        'pos:*',
        'reports:read',
        'users:read',
        'users:update',
      ],
    },
    {
      name: 'BARISTA_LEAD',
      description: 'Líder de barra',
      scopes: [
        'products:read',
        'recipes:*',
        'quality:*',
        'pos:read',
        'pos:create',
        'training:read',
      ],
    },
    {
      name: 'BARISTA',
      description: 'Barista',
      scopes: [
        'pos:read',
        'pos:create',
        'recipes:read',
        'quality:read',
        'training:read',
      ],
    },
    {
      name: 'CASHIER',
      description: 'Cajero',
      scopes: [
        'pos:read',
        'pos:create',
        'pos:payment',
        'invoices:create',
        'cash:*',
      ],
    },
    {
      name: 'AUDITOR',
      description: 'Auditor (solo lectura + firmas)',
      scopes: [
        'quality:read',
        'quality:sign',
        'reports:read',
        'inventory:read',
        'pos:read',
      ],
    },
    {
      name: 'ACCOUNTANT',
      description: 'Contador',
      scopes: [
        'reports:read',
        'reports:export',
        'invoices:read',
        'financial:read',
      ],
    },
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData,
    });
  }

  console.log('✅ Roles created');

  // 2. Crear organización demo
  console.log('🏢 Creating demo organization...');
  const org = await prisma.organization.upsert({
    where: { slug: 'coffee-demo' },
    update: {},
    create: {
      name: 'Coffee Demo',
      slug: 'coffee-demo',
      description: 'Organización de demostración',
      timezone: 'America/Mexico_City',
    },
  });

  console.log('✅ Organization created');

  // 3. Crear ubicación demo
  console.log('📍 Creating demo location...');
  const location = await prisma.location.upsert({
    where: { id: 'demo-location-1' },
    update: {},
    create: {
      id: 'demo-location-1',
      organizationId: org.id,
      name: 'Sucursal Centro',
      address: 'Calle Principal 123',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06000',
      phone: '55-1234-5678',
      email: 'centro@coffeedemo.mx',
      timezone: 'America/Mexico_City',
    },
  });

  console.log('✅ Location created');

  // 4. Crear usuario owner demo
  console.log('👤 Creating demo users...');
  const ownerRole = await prisma.role.findUnique({ where: { name: 'OWNER' } });
  const managerRole = await prisma.role.findUnique({
    where: { name: 'MANAGER' },
  });
  const baristaRole = await prisma.role.findUnique({
    where: { name: 'BARISTA' },
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@coffeedemo.mx' },
    update: {},
    create: {
      email: 'owner@coffeedemo.mx',
      password: passwordHash,
      firstName: 'Roberto',
      lastName: 'Dueño',
      organizationId: org.id,
      roleId: ownerRole!.id,
      emailVerified: new Date(),
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@coffeedemo.mx' },
    update: {},
    create: {
      email: 'manager@coffeedemo.mx',
      password: passwordHash,
      firstName: 'Ana',
      lastName: 'Gerente',
      organizationId: org.id,
      roleId: managerRole!.id,
      emailVerified: new Date(),
    },
  });

  const barista = await prisma.user.upsert({
    where: { email: 'barista@coffeedemo.mx' },
    update: {},
    create: {
      email: 'barista@coffeedemo.mx',
      password: passwordHash,
      firstName: 'Juan',
      lastName: 'Barista',
      organizationId: org.id,
      roleId: baristaRole!.id,
      emailVerified: new Date(),
    },
  });

  // Asignar ubicaciones a usuarios
  await prisma.userLocation.createMany({
    data: [
      { userId: owner.id, locationId: location.id },
      { userId: manager.id, locationId: location.id },
      { userId: barista.id, locationId: location.id },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Users created');

  // 5. Crear categorías de productos
  console.log('📦 Creating product categories...');
  const categories = [
    { name: 'Espresso', slug: 'espresso', icon: '☕', color: '#8B4513' },
    { name: 'Filter Coffee', slug: 'filter', icon: '☕', color: '#D2691E' },
    { name: 'Cold Brew', slug: 'cold-brew', icon: '🧊', color: '#4682B4' },
    { name: 'Pastries', slug: 'pastries', icon: '🥐', color: '#DEB887' },
    { name: 'Sandwiches', slug: 'sandwiches', icon: '🥪', color: '#F4A460' },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: {
        organizationId_slug: {
          organizationId: org.id,
          slug: cat.slug,
        },
      },
      update: {},
      create: {
        ...cat,
        organizationId: org.id,
        sortOrder: categories.indexOf(cat),
      },
    });
    createdCategories.push(category);
  }

  console.log('✅ Categories created');

  // 6. Crear productos demo
  console.log('🛍️  Creating demo products...');
  const products = [
    {
      sku: 'ESP-001',
      name: 'Espresso',
      price: 35,
      categoryId: createdCategories[0].id,
      image: '/products/espresso.jpg',
      featured: true,
    },
    {
      sku: 'ESP-002',
      name: 'Americano',
      price: 45,
      categoryId: createdCategories[0].id,
      image: '/products/americano.jpg',
      featured: true,
    },
    {
      sku: 'ESP-003',
      name: 'Capuccino',
      price: 55,
      categoryId: createdCategories[0].id,
      image: '/products/capuccino.jpg',
      featured: true,
    },
    {
      sku: 'ESP-004',
      name: 'Latte',
      price: 55,
      categoryId: createdCategories[0].id,
      image: '/products/latte.jpg',
    },
    {
      sku: 'FIL-001',
      name: 'Chemex',
      price: 65,
      categoryId: createdCategories[1].id,
      image: '/products/chemex.jpg',
      featured: true,
    },
    {
      sku: 'FIL-002',
      name: 'V60',
      price: 65,
      categoryId: createdCategories[1].id,
      image: '/products/v60.jpg',
    },
    {
      sku: 'COL-001',
      name: 'Cold Brew',
      price: 55,
      categoryId: createdCategories[2].id,
      image: '/products/cold-brew.jpg',
      featured: true,
    },
    {
      sku: 'COL-002',
      name: 'Iced Latte',
      price: 60,
      categoryId: createdCategories[2].id,
      image: '/products/iced-latte.jpg',
    },
    {
      sku: 'PAS-001',
      name: 'Croissant',
      price: 35,
      categoryId: createdCategories[3].id,
      image: '/products/croissant.jpg',
    },
    {
      sku: 'PAS-002',
      name: 'Pan de Chocolate',
      price: 40,
      categoryId: createdCategories[3].id,
      image: '/products/pain-chocolat.jpg',
    },
    {
      sku: 'SAN-001',
      name: 'Sandwich de Jamón',
      price: 65,
      categoryId: createdCategories[4].id,
      image: '/products/sandwich-jamon.jpg',
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: {
        organizationId_sku: {
          organizationId: org.id,
          sku: prod.sku,
        },
      },
      update: {},
      create: {
        ...prod,
        organizationId: org.id,
        locationId: location.id,
        taxRate: 0.16,
        sortOrder: products.indexOf(prod),
      },
    });
  }

  console.log('✅ Products created');

  // 7. Crear modificadores
  console.log('🔧 Creating modifiers...');

  // Grupo de leches
  const milkGroup = await prisma.modifierGroup.create({
    data: {
      name: 'milk',
      displayName: 'Tipo de Leche',
      required: false,
      multiSelect: false,
      organizationId: org.id,
    },
  });

  const milks = [
    { name: 'Leche Regular', priceDelta: 0, type: 'MILK' },
    { name: 'Leche Deslactosada', priceDelta: 5, type: 'MILK' },
    { name: 'Leche de Almendra', priceDelta: 10, type: 'MILK' },
    { name: 'Leche de Avena', priceDelta: 10, type: 'MILK' },
    { name: 'Leche de Soya', priceDelta: 8, type: 'MILK' },
  ];

  for (const milk of milks) {
    await prisma.modifier.create({
      data: {
        ...milk,
        groupId: milkGroup.id,
        organizationId: org.id,
        sortOrder: milks.indexOf(milk),
      },
    });
  }

  // Grupo de tamaños
  const sizeGroup = await prisma.modifierGroup.create({
    data: {
      name: 'size',
      displayName: 'Tamaño',
      required: false,
      multiSelect: false,
      organizationId: org.id,
    },
  });

  const sizes = [
    { name: '8 oz', priceDelta: 0, type: 'SIZE' },
    { name: '12 oz', priceDelta: 10, type: 'SIZE' },
    { name: '16 oz', priceDelta: 15, type: 'SIZE' },
  ];

  for (const size of sizes) {
    await prisma.modifier.create({
      data: {
        ...size,
        groupId: sizeGroup.id,
        organizationId: org.id,
        sortOrder: sizes.indexOf(size),
      },
    });
  }

  // Grupo de extras
  const extrasGroup = await prisma.modifierGroup.create({
    data: {
      name: 'extras',
      displayName: 'Extras',
      required: false,
      multiSelect: true,
      maxSelections: 3,
      organizationId: org.id,
    },
  });

  const extras = [
    { name: 'Shot Extra', priceDelta: 15, type: 'EXTRA' },
    { name: 'Sirope Vainilla', priceDelta: 10, type: 'EXTRA' },
    { name: 'Sirope Caramelo', priceDelta: 10, type: 'EXTRA' },
    { name: 'Crema Batida', priceDelta: 8, type: 'EXTRA' },
  ];

  for (const extra of extras) {
    await prisma.modifier.create({
      data: {
        ...extra,
        groupId: extrasGroup.id,
        organizationId: org.id,
        sortOrder: extras.indexOf(extra),
      },
    });
  }

  console.log('✅ Modifiers created');

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('📝 Demo credentials:');
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
