
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Renaming default store...');

    try {
        await prisma.store.update({
            where: { id: 'default-store' },
            data: { name: 'SIN TIENDA' }
        });
        console.log('✅ Store renamed to "SIN TIENDA"');
    } catch (e) {
        console.error('Error renaming store:', e);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
