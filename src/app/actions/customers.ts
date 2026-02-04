'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createLog } from '@/lib/logger';
import prisma from '@/lib/prisma';

import { auth } from '@/auth';

const CustomerSchema = z.object({
    rfc: z.string().min(12, "El RFC debe tener al menos 12 caracteres").max(13, "El RFC no puede exceder 13 caracteres"),
    razonSocial: z.string().min(3, "La Razón Social es requerida"),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
});

export async function getCustomers(query: string = '') {
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    if (!storeId) return { success: false, error: 'No autorizado' };

    const customers = await prisma.customer.findMany({
        where: {
            storeId,
            OR: [
                { razonSocial: { contains: query, mode: 'insensitive' } },
                { rfc: { contains: query, mode: 'insensitive' } }
            ]
        },
        orderBy: { razonSocial: 'asc' },
        take: 50
    });

    return { success: true, data: customers };
}

export async function createCustomer(data: z.infer<typeof CustomerSchema>) {
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    const userId = session?.user?.id;

    if (!storeId || !userId) return { success: false, error: { server: ['No autorizado'] } };

    const result = CustomerSchema.safeParse(data);

    if (!result.success) {
        return { success: false, error: result.error.flatten().fieldErrors };
    }

    try {
        const customer = await prisma.customer.create({
            data: {
                rfc: result.data.rfc,
                razonSocial: result.data.razonSocial,
                email: result.data.email || null,
                storeId,
                userId,
            }
        });

        await createLog(
            'customers',
            'CREATE',
            `Se creó el cliente ${customer.razonSocial} (${customer.rfc})`,
            customer.id,
            result.data
        );

        revalidatePath('/clientes');
        return { success: true };
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (e.code === 'P2002') {
            return { success: false, error: { rfc: ['Este RFC ya está registrado en tu tienda'] } };
        }
        return { success: false, error: { server: ['Error al crear cliente'] } };
    }
}

export async function updateCustomer(id: string, data: z.infer<typeof CustomerSchema>) {
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    if (!storeId) return { success: false, error: { server: ['No autorizado'] } };

    const result = CustomerSchema.safeParse(data);

    if (!result.success) {
        return { success: false, error: result.error.flatten().fieldErrors };
    }

    try {
        const customer = await prisma.customer.update({
            where: { id, storeId },
            data: {
                rfc: result.data.rfc,
                razonSocial: result.data.razonSocial,
                email: result.data.email || null,
            }
        });

        await createLog(
            'customers',
            'UPDATE',
            `Se actualizó el cliente ${customer.razonSocial}`,
            id,
            result.data
        );

        revalidatePath('/clientes');
        revalidatePath(`/clientes/${id}`);
        return { success: true };
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (e.code === 'P2002') {
            return { success: false, error: { rfc: ['Este RFC ya está registrado en tu tienda'] } };
        }
        return { success: false, error: { server: ['Error al actualizar cliente'] } };
    }
}

export async function deleteCustomer(id: string) {
    try {
        const session = await auth();
        const storeId = (session?.user as any)?.storeId;
        if (!storeId) return { success: false, error: 'No autorizado' };

        const customer = await prisma.customer.findUnique({
            where: { id, storeId }
        });

        if (!customer) return { success: false, error: 'Cliente no encontrado' };

        await prisma.customer.delete({
            where: { id, storeId }
        });

        await createLog(
            'customers',
            'DELETE',
            `Se eliminó el cliente ${customer?.razonSocial || id}`,
            id
        );

        revalidatePath('/clientes');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'No se pudo eliminar el cliente (posiblemente tenga facturas asociadas)' };
    }
}
