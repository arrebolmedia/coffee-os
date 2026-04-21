/**
 * Script para crear usuarios de prueba en CoffeeOS
 * Ejecutar con: npx tsx scripts/create-test-users.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Creando usuarios de prueba...\n');

  // Hash password
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Buscar organización de prueba
  let organization = await prisma.organization.findFirst();

  if (!organization) {
    console.log('📋 Creando organización de prueba...');
    organization = await prisma.organization.create({
      data: {
        name: 'Coffee Demo',
        slug: 'coffee-demo',
        active: true,
      },
    });
    console.log(
      `✅ Organización creada: ${organization.name} (${organization.id})\n`,
    );
  }

  // Buscar o crear roles
  const roles = {
    owner: await findOrCreateRole('OWNER', 'Dueño', organization.id),
    manager: await findOrCreateRole('MANAGER', 'Gerente', organization.id),
    cashier: await findOrCreateRole('CASHIER', 'Cajero', organization.id),
    barista: await findOrCreateRole('BARISTA', 'Barista', organization.id),
  };

  // Crear usuarios de prueba
  const users = [
    {
      email: 'owner@coffeedemo.mx',
      firstName: 'Juan',
      lastName: 'Pérez',
      roleId: roles.owner.id,
      roleName: 'Dueño',
    },
    {
      email: 'manager@coffeedemo.mx',
      firstName: 'María',
      lastName: 'González',
      roleId: roles.manager.id,
      roleName: 'Gerente',
    },
    {
      email: 'barista@coffeedemo.mx',
      firstName: 'Carlos',
      lastName: 'Ramírez',
      roleId: roles.barista.id,
      roleName: 'Barista',
    },
    {
      email: 'demo@coffeeos.com',
      firstName: 'Demo',
      lastName: 'User',
      roleId: roles.cashier.id,
      roleName: 'Cajero',
    },
  ];

  console.log('👥 Creando usuarios...\n');

  for (const userData of users) {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`⚠️  Usuario ya existe: ${userData.email}`);
      // Actualizar contraseña
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword },
      });
      console.log(`   ✅ Contraseña actualizada\n`);
      continue;
    }

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        organizationId: organization.id,
        roleId: userData.roleId,
        active: true,
      },
    });

    console.log(`✅ Usuario creado: ${user.email}`);
    console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
    console.log(`   Rol: ${userData.roleName}\n`);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Usuarios de prueba creados exitosamente');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('📧 Credenciales:');
  console.log('   Email: owner@coffeedemo.mx, manager@coffeedemo.mx,');
  console.log('          barista@coffeedemo.mx, demo@coffeeos.com');
  console.log(`   Contraseña: ${password}`);
  console.log(
    '\n🚀 Ahora puedes iniciar sesión en http://localhost:3001/login\n',
  );
}

async function findOrCreateRole(
  code: string,
  name: string,
  organizationId: string,
) {
  let role = await prisma.role.findFirst({
    where: {
      code,
      organizationId,
    },
  });

  if (!role) {
    console.log(`📋 Creando rol: ${name} (${code})`);
    role = await prisma.role.create({
      data: {
        code,
        name,
        description: `Rol de ${name}`,
        organizationId,
        active: true,
      },
    });
  }

  return role;
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
