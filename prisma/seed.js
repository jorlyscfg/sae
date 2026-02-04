const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('12345678', 10);

    const users = [
        { email: 'user1@gmail.com', name: 'Usuario 1' },
        { email: 'user2@gmail.com', name: 'Usuario 2' },
        { email: 'user3@gmail.com', name: 'Usuario 3' },
    ];

    for (const user of users) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: { password },
            create: {
                email: user.email,
                name: user.name,
                password: password,
            },
        });
        console.log(`User ${user.email} created/updated`);
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
