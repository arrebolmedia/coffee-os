/**
 * Fix User Organization ID
 * Ensures the test user has a valid organizationId
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando usuario...');

  // Find the user
  const user = await prisma.user.findFirst({
    where: {
      email: {
        contains: '@',
      },
    },
    include: {
      organization: true,
    },
  });

  if (!user) {
    console.error('❌ No se encontró ningún usuario');
    return;
  }

  console.log('👤 Usuario encontrado:', {
    id: user.id,
    email: user.email,
    organizationId: user.organizationId,
  });

  // Check if user has organizationId
  if (!user.organizationId) {
    console.log('⚠️  Usuario sin organizationId, creando organización...');

    // Create organization
    const org = await prisma.organization.create({
      data: {
        name: 'CoffeeOS Demo',
        slug: 'coffeeos-demo',
        type: 'single_location',
        settings: {},
      },
    });

    console.log('✅ Organización creada:', {
      id: org.id,
      name: org.name,
    });

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        organizationId: org.id,
      },
    });

    console.log('✅ Usuario actualizado con organizationId:', org.id);
  } else {
    console.log('✅ Usuario ya tiene organizationId:', user.organizationId);

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    if (!org) {
      console.log('⚠️  Organización no existe, creando...');

      const newOrg = await prisma.organization.create({
        data: {
          id: user.organizationId,
          name: 'CoffeeOS Demo',
          slug: 'coffeeos-demo',
          type: 'single_location',
          settings: {},
        },
      });

      console.log('✅ Organización creada:', newOrg.id);
    } else {
      console.log('✅ Organización existe:', org.name);
    }
  }

  // Show final state
  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      organization: true,
    },
  });

  console.log('\n📊 Estado final:');
  console.log('Usuario:', {
    id: updatedUser?.id,
    email: updatedUser?.email,
    organizationId: updatedUser?.organizationId,
  });
  console.log('Organización:', {
    id: updatedUser?.organization?.id,
    name: updatedUser?.organization?.name,
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
