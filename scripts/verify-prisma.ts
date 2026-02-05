
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying Prisma Client props...');

    // Check InventoryMovement model
    if (!prisma.inventoryMovement) {
        console.error('❌ prisma.inventoryMovement is undefined!');
        process.exit(1);
    } else {
        console.log('✅ prisma.inventoryMovement exists.');
    }

    // Check Customer fields (via typing simulation or just query)
    try {
        // We just check if the query throws "Unknown field"
        // We use findFirst which is cheap.
        await prisma.customer.findFirst({
            select: {
                id: true,
                isBranch: true,
                linkedStoreId: true
            }
        });
        console.log('✅ Customer.isBranch and linkedStoreId are queryable.');
    } catch (e) {
        console.error('❌ Failed to query new Customer fields:', e);
        process.exit(1);
    }

    // Check Product fields
    try {
        await prisma.product.findFirst({
            select: {
                id: true,
                unidadMedida: true
            }
        });
        console.log('✅ Product.unidadMedida is queryable.');
    } catch (e) {
        console.error('❌ Failed to query Product.unidadMedida:', e);
        process.exit(1);
    }

    console.log('All checks passed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
