import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const productsCount = await prisma.product.count();
        const customersCount = await prisma.customer.count();
        const invoicesCount = await prisma.invoice.count();
        const itemsCount = await prisma.invoiceItem.count();

        console.log('--- Resumen de Datos Recuperados ---');
        console.log(`Productos: ${productsCount}`);
        console.log(`Clientes: ${customersCount}`);
        console.log(`Facturas: ${invoicesCount}`);
        console.log(`Partidas de Factura: ${itemsCount}`);
        console.log('------------------------------------');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
