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

export async function getBranchCustomers(excludeStoreId?: string) {
    const session = await auth();
    const sessionStoreId = (session?.user as any)?.storeId;
    if (!sessionStoreId) return [];

    // Use explicit exclude ID or fallback to session
    const finalExcludeId = excludeStoreId || sessionStoreId;

    // ENFORCE CLOSED UNIVERSE: Only Customers that are ALSO Stores.
    // We get all Store IDs first to filter the customer list efficiently.
    const stores = await prisma.store.findMany({ select: { id: true } });
    const storeIds = stores.map(s => s.id);

    return await prisma.customer.findMany({
        where: {
            storeId: sessionStoreId, // Customers of the current store
            id: {
                in: storeIds, // MUST be a Store already
                not: finalExcludeId // Exclude self
            }
        },
        select: {
            id: true,
            razonSocial: true,
        },
        orderBy: { razonSocial: 'asc' }
    });
}

export async function transferStock(targetCustomerId: string, items: TransferItem[], sourceStoreId?: string) {
    const session = await auth();
    const sessionStoreId = (session?.user as any)?.storeId;
    const userId = session?.user?.id;

    // Use passed source (if Admin/Valid) or session default
    // Ideally verify user has access to sourceStoreId here
    const actualSourceId = sourceStoreId || sessionStoreId;

    if (!actualSourceId || !userId) {
        return { success: false, error: 'No autorizado' };
    }

    if (items.length === 0) {
        return { success: false, error: 'No hay items para transferir' };
    }

    try {
        // 1. Validate Target
        const targetCustomer = await prisma.customer.findUnique({
            where: { id: targetCustomerId },
            select: { id: true, razonSocial: true, rfc: true }
        });

        if (!targetCustomer) {
            return { success: false, error: 'Cliente destino no encontrado' };
        }

        // Prevent Loop (Source == Destination)
        if (targetCustomer.id === actualSourceId) {
            return { success: false, error: 'No puedes transferir al mismo almacén.' };
        }

        // ONE LOGIC: The Customer ID IS the Store ID.
        // We ensure the Store entity exists with the SAME ID as the Customer.
        const destinationStoreId = targetCustomer.id;

        const storeExists = await prisma.store.findUnique({
            where: { id: destinationStoreId }
        });

        if (!storeExists) {
            // CLOSED UNIVERSE: No auto-creation.
            return { success: false, error: 'El cliente seleccionado NO es una sucursal válida.' };
        }

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
                        referencia: `Traspaso a ${targetCustomer.razonSocial}`
                    }
                });

                // B. Increment Destination (Upsert)
                // We verify if product exists in destination store
                const destProduct = await tx.product.findUnique({
                    where: { storeId_sku: { storeId: destinationStoreId, sku: item.sku } }
                });

                if (destProduct) {
                    await tx.product.update({
                        where: { id: destProduct.id },
                        data: { stock: { increment: item.quantity } } // We don't overwrite price/cost, just add stock
                    });
                } else {
                    // Create if not exists (Clone basic info)
                    // Note: We use the source product details for creation
                    await tx.product.create({
                        data: {
                            storeId: destinationStoreId,
                            sku: item.sku,
                            description: item.description,
                            stock: item.quantity,
                            price: sourceProduct.price, // Inherit price
                            costoPromedio: sourceProduct.costoPromedio,
                            userId, // Created by the user doing the transfer
                            unidadMedida: sourceProduct.unidadMedida || 'PZA', // Fallback
                            line: sourceProduct.line
                            // Other fields default
                        }
                    });
                }

                // Audit Destination (IN)
                await tx.inventoryMovement.create({
                    data: {
                        storeId: destinationStoreId,
                        userId,
                        sku: item.sku,
                        tipoMovimiento: 'E',
                        concepto: 'TRASPASO_ENTRADA',
                        cantidad: item.quantity,
                        costo: sourceProduct.costoPromedio,
                        referencia: `Recibido de Central`
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
