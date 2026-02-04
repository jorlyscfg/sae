import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: { store: true }
    });

    console.log('--- Usuarios en DB ---');
    for (const user of users) {
        console.log(`Email: ${user.email}`);
        console.log(`Nombre: ${user.name}`);
        console.log(`Store ID: ${user.storeId} (${user.store?.name || 'N/A'})`);
        console.log(`Tiene Password: ${!!user.password}`);
        if (user.password) {
            console.log(`Hash Password: ${user.password.substring(0, 10)}...`);
        }
        console.log('---------------------');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
