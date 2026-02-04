import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Prisma Client fields...');

    // Attempt to access a type property (runtime check of keys if possible, or just a dummy query)
    // We'll try to create a dummy product (and rollback) to see if it accepts the fields

    try {
        // Just checking if properties exist in the model definition dmmf would be better, but let's try a safe "count" with a where clause using a new field?
        // No, create is the best test.

        await prisma.product.count({
            where: {
                claveSat: 'TEST', // If this compiles and runs, the field exists
            }
        });

        console.log('✅ Field claveSat exists on Product model.');
    } catch (e) {
        console.error('❌ Field claveSat check failed:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
