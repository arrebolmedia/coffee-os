import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrders() {
  console.log('🔍 Verificando órdenes en la base de datos...\n');

  try {
    // Verificar tickets
    const ticketsCount = await prisma.ticket.count();
    console.log(`📋 Tickets: ${ticketsCount}`);

    if (ticketsCount > 0) {
      const tickets = await prisma.ticket.findMany({
        take: 5,
        include: {
          lines: true,
          order: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      tickets.forEach((ticket, i) => {
        console.log(
          `   ${i + 1}. #${ticket.ticketNumber} - ${ticket.status} - Total: $${ticket.total} - Líneas: ${ticket.lines.length}`,
        );
      });
    }

    // Verificar órdenes (KDS)
    const ordersCount = await prisma.order.count();
    console.log(`\n🍳 Orders (KDS): ${ordersCount}`);

    if (ordersCount > 0) {
      const orders = await prisma.order.findMany({
        take: 5,
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      orders.forEach((order, i) => {
        console.log(
          `   ${i + 1}. #${order.orderNumber} - ${order.status} - Items: ${order.items.length}`,
        );
      });
    }

    // Verificar pagos
    const paymentsCount = await prisma.payment.count();
    console.log(`\n💰 Pagos: ${paymentsCount}`);

    console.log('\n✅ Verificación completada');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrders();
