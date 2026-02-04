'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { createLog } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

const ProductSchema = z.object({
    sku: z.string().min(1, "El SKU es requerido"),
    description: z.string().min(3, "La descripción es requerida"),
    line: z.string().optional(),
    stock: z.coerce.number().min(0, "El stock no puede ser negativo"),
    price: z.coerce.number().min(0, "El precio no puede ser negativo"),
    // Nuevos campos fiscales y comerciales
    claveSat: z.string().optional(),
    unidadSat: z.string().optional(),
    costoPromedio: z.coerce.number().min(0).default(0),
    iva: z.coerce.number().min(0).default(0.16),
    ieps: z.coerce.number().min(0).default(0),
    retencionIva: z.coerce.number().min(0).default(0),
    retencionIsr: z.coerce.number().min(0).default(0),
});

export async function createProduct(data: z.infer<typeof ProductSchema>) {
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    const userId = session?.user?.id;
    if (!storeId || !userId) return { success: false, error: { server: ['No autorizado'] } };

    const result = ProductSchema.safeParse(data);

    if (!result.success) {
        return { success: false, error: result.error.flatten().fieldErrors };
    }

    try {
        const product = await prisma.product.create({
            data: {
                sku: result.data.sku,
                description: result.data.description,
                line: result.data.line || null,
                stock: result.data.stock,
                price: result.data.price,
                // Mapeo nuevos campos
                claveSat: result.data.claveSat || null,
                unidadSat: result.data.unidadSat || null,
                costoPromedio: result.data.costoPromedio,
                iva: result.data.iva,
                ieps: result.data.ieps,
                retencionIva: result.data.retencionIva,
                retencionIsr: result.data.retencionIsr,
                storeId,
                userId,
            }
        });

        await createLog(
            'products',
            'CREATE',
            `Se dio de alta el producto ${product.sku} - ${product.description}`,
            product.id,
            { sku: product.sku, stock: product.stock, price: product.price }
        );

        revalidatePath('/inventario');
        return { success: true };
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (e.code === 'P2002') {
            return { success: false, error: { sku: ['Este SKU ya existe en tu tienda'] } };
        }
        return { success: false, error: { server: ['Error al crear producto'] } };
    }
}

export async function updateProduct(id: string, data: z.infer<typeof ProductSchema>) {
    const result = ProductSchema.safeParse(data);

    if (!result.success) {
        return { success: false, error: result.error.flatten().fieldErrors };
    }

    try {
        const session = await auth();
        const storeId = (session?.user as any)?.storeId;
        if (!storeId) return { success: false, error: { server: ['No autorizado'] } };

        await prisma.product.update({
            where: { id, storeId },
            data: {
                sku: result.data.sku,
                description: result.data.description,
                line: result.data.line || null,
                stock: result.data.stock,
                price: result.data.price,
                // Mapeo nuevos campos
                claveSat: result.data.claveSat || null,
                unidadSat: result.data.unidadSat || null,
                costoPromedio: result.data.costoPromedio,
                iva: result.data.iva,
                ieps: result.data.ieps,
                retencionIva: result.data.retencionIva,
                retencionIsr: result.data.retencionIsr,
            }
        });

        await createLog(
            'products',
            'UPDATE',
            `Se actualizó el producto SKU: ${result.data.sku}`,
            id,
            result.data
        );

        revalidatePath('/inventario');
        revalidatePath(`/inventario/${id}`);
        return { success: true };
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (e.code === 'P2002') {
            return { success: false, error: { sku: ['Este SKU ya existe en tu tienda'] } };
        }
        return { success: false, error: { server: ['Error al actualizar producto'] } };
    }
}

export async function deleteProduct(id: string) {
    try {
        const session = await auth();
        const storeId = (session?.user as any)?.storeId;
        if (!storeId) return { success: false, error: 'No autorizado' };

        const product = await prisma.product.findUnique({
            where: { id, storeId }
        });

        if (!product) return { success: false, error: 'Producto no encontrado' };

        await prisma.product.delete({
            where: { id, storeId }
        });

        await createLog(
            'products',
            'DELETE',
            `Se eliminó el producto SKU: ${product?.sku || id}`,
            id
        );

        revalidatePath('/inventario');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'No se pudo eliminar el producto' };
    }
}

export async function searchProducts(query: string) {
    if (!query || query.length < 2) return [];

    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    if (!storeId) return [];

    const products = await prisma.product.findMany({
        where: {
            storeId,
            OR: [
                { sku: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ]
        },
        take: 20
    });

    // Serialize Decimals
    return products.map(p => ({
        ...p,
        stock: Number(p.stock),
        price: Number(p.price)
    }));
}
