import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning ALL business data...');

    try {
        // Delete in order of dependency (child -> parent)

        console.log('   - Deleting Receivables...');
        await prisma.receivable.deleteMany({});

        console.log('   - Deleting Quote Items...');
        await prisma.quoteItem.deleteMany({});
        console.log('   - Deleting Quotes...');
        await prisma.quote.deleteMany({});

        console.log('   - Deleting Invoice Items...');
        await prisma.invoiceItem.deleteMany({});
        console.log('   - Deleting Invoices...');
        await prisma.invoice.deleteMany({});

        console.log('   - Deleting Products...');
        await prisma.product.deleteMany({});

        console.log('   - Deleting Customers...');
        await prisma.customer.deleteMany({});

        console.log('✅ Database cleaned. Only Users and Stores remain.');
    } catch (error) {
        console.error('❌ Error cleaning database:', error);
        process.exit(1);
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
