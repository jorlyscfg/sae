'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getAssociatedDocuments() {
    try {
        const session = await auth();
        const storeId = (session?.user as any)?.storeId;
        if (!storeId) return [];

        const docs = await prisma.associatedDocument.findMany({
            where: { storeId },
            orderBy: { fecha: 'desc' }
        });
        return JSON.parse(JSON.stringify(docs)); // Avoid serialization issues with Decimal
    } catch (error) {
        console.error('Error fetching associated docs:', error);
        return [];
    }
}
