import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const count = await prisma.product.count();
    console.log(`\n📦 Productos en DB: ${count}\n`);

    if (count > 0) {
      const products = await prisma.product.findMany({
        take: 10,
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          isActive: true,
        },
      });
      console.table(products);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
