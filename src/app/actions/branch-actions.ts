'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function promoteToBranch(customerId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'No autorizado' };

    try {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });

        if (!customer) {
            return { success: false, error: 'Cliente no encontrado' };
        }

        if (customer.isBranch && customer.linkedStoreId) {
            return { success: false, error: 'Este cliente ya es una sucursal' };
        }

        // Create new Store for this branch
        const newStore = await prisma.store.create({
            data: {
                name: `Sucursal: ${customer.razonSocial}`,
                rfc: customer.rfc,
                address: `${customer.calle || ''} ${customer.colonia || ''}`.trim(),
            }
        });

        // Link Customer to new Store
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                isBranch: true,
                linkedStoreId: newStore.id
            }
        });

        revalidatePath('/clientes');
        return { success: true };
    } catch (error) {
        console.error('Error promoting customer:', error);
        return { success: false, error: 'Error al convertir en sucursal' };
    }
}

export async function demoteBranch(customerId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'No autorizado' };

    try {
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                isBranch: false,
                // We keep linkedStoreId for history or future re-activation, 
                // or we could set it to null if we want to detach completely.
                // For now, let's keep it but just disable the flag.
            }
        });

        revalidatePath('/clientes');
        return { success: true };
    } catch (error) {
        console.error('Error demoting customer:', error);
        return { success: false, error: 'Error al quitar sucursal' };
    }
}
