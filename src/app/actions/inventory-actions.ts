'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createLog } from '@/lib/logger';

interface TransferItem {
    sku: string;
    description: string;
    quantity: number;
    cost: number;
}

export async function getTransferTargets(excludeStoreId?: string) {
    const session = await auth();
    const sessionStoreId = (session?.user as any)?.storeId;
    if (!sessionStoreId) return [];

    // Use explicit exclude ID or fallback to session
    const finalExcludeId = excludeStoreId || sessionStoreId;

    // UNIVERSAL: Get all stores except the current one
    return await prisma.store.findMany({
        where: {
            id: { not: finalExcludeId }
        },
        select: {
            id: true,
            name: true,
        },
        orderBy: { name: 'asc' }
    });
}

export async function transferStock(targetStoreId: string, items: TransferItem[], sourceStoreId?: string) {
    const session = await auth();
    const sessionStoreId = (session?.user as any)?.storeId;
    const userId = session?.user?.id;

    // Use passed source (if Admin/Valid) or session default
    const actualSourceId = sourceStoreId || sessionStoreId;

    if (!actualSourceId || !userId) {
        return { success: false, error: 'No autorizado' };
    }

    if (items.length === 0) {
        return { success: false, error: 'No hay items para transferir' };
    }

    try {
        // 1. Validate Target
        // Verify target store exists
        const destinationStore = await prisma.store.findUnique({
            where: { id: targetStoreId },
            select: { id: true, name: true }
        });

        if (!destinationStore) {
            return { success: false, error: 'Almacén destino no encontrado' };
        }

        // Prevent Loop (Source == Destination)
        if (targetStoreId === actualSourceId) {
            return { success: false, error: 'No puedes transferir al mismo almacén.' };
        }

        const destinationId = destinationStore.id;

        // 2. Transaction
        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                // A. Decrement Source
                const sourceProduct = await tx.product.findUnique({
                    where: { storeId_sku: { storeId: actualSourceId, sku: item.sku } }
                });

                if (!sourceProduct || Number(sourceProduct.stock) < item.quantity) {
                    throw new Error(`Stock insuficiente para SKU: ${item.sku}`);
                }

                await tx.product.update({
                    where: { id: sourceProduct.id },
                    data: { stock: { decrement: item.quantity } }
                });

                // Audit Source (OUT)
                await tx.inventoryMovement.create({
                    data: {
                        storeId: actualSourceId,
                        userId,
                        sku: item.sku,
                        tipoMovimiento: 'S',
                        concepto: 'TRASPASO_SALIDA',
                        cantidad: item.quantity,
                        costo: sourceProduct.costoPromedio,
                        referencia: `Traspaso a ${destinationStore.name}`
                    }
                });

                // B. Increment Destination (Upsert)
                const destProduct = await tx.product.findUnique({
                    where: { storeId_sku: { storeId: destinationId, sku: item.sku } }
                });

                if (destProduct) {
                    await tx.product.update({
                        where: { id: destProduct.id },
                        data: { stock: { increment: item.quantity } }
                    });
                } else {
                    // Create if not exists (Clone basic info)
                    await tx.product.create({
                        data: {
                            storeId: destinationId,
                            sku: item.sku,
                            description: item.description,
                            stock: item.quantity,
                            price: sourceProduct.price,
                            costoPromedio: sourceProduct.costoPromedio,
                            userId,
                            unidadMedida: sourceProduct.unidadMedida || 'PZA',
                            line: sourceProduct.line
                        }
                    });
                }

                // Audit Destination (IN)
                await tx.inventoryMovement.create({
                    data: {
                        storeId: destinationId,
                        userId,
                        sku: item.sku,
                        tipoMovimiento: 'E',
                        concepto: 'TRASPASO_ENTRADA',
                        cantidad: item.quantity,
                        costo: sourceProduct.costoPromedio,
                        referencia: `Recibido de Origen`
                    }
                });
            }
        });

        revalidatePath('/inventario');
        return { success: true };

    } catch (error: any) {
        console.error('Transfer Error:', error);
        return { success: false, error: error.message || 'Error al procesar el traspaso' };
    }
}
