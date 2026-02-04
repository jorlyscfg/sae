import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Create Default Store
    const store = await prisma.store.upsert({
        where: { id: 'default-store' },
        update: {},
        create: {
            id: 'default-store',
            name: 'Tienda Principal',
            rfc: 'XAXX010101000'
        }
    });
    console.log('✅ Store created');

    // 2. Create Default User
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'user1@gmail.com' },
        update: {
            password: hashedPassword,
            storeId: store.id
        },
        create: {
            email: 'user1@gmail.com',
            name: 'Usuario Demo',
            password: hashedPassword,
            role: 'ADMIN',
            storeId: store.id
        }
    });
    console.log('✅ User created');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
