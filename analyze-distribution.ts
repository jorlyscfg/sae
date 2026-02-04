import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Agrupar facturas por cliente
        const distribution = await prisma.invoice.groupBy({
            by: ['customerId'],
            _count: {
                id: true,
            },
            _sum: {
                total: true
            }
        });

        // Obtener nombres de clientes
        const customers = await prisma.customer.findMany();
        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.razonSocial]));

        console.log('--- Distribución de Facturas por Cliente ---');
        for (const item of distribution) {
            const name = customerMap[item.customerId] || 'Desconocido';
            const count = item._count.id;
            const total = item._sum.total;
            console.log(`Cliente: ${name}`);
            console.log(`  - Facturas: ${count}`);
            console.log(`  - Total Comprado: $${Number(total).toLocaleString()}`);
        }

        // Verificar si hay items de factura vinculados
        const itemsCount = await prisma.invoiceItem.count();
        console.log(`\nTotal Partidas (Productos vendidos): ${itemsCount}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
