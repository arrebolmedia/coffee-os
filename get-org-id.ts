import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  console.log('Organization ID:', org?.id);

  await prisma.$disconnect();
}

main();
