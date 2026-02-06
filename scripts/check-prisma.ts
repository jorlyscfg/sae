
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        if (prisma.inventoryMovement) {
            console.log("✅ prisma.inventoryMovement exists");
        } else {
            console.error("❌ prisma.inventoryMovement is MISSING");
            console.log("Keys:", Object.keys(prisma));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
