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

export async function getBranchCustomers() {
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    if (!storeId) return [];

    return await prisma.customer.findMany({
        where: {
            storeId,
            // Allow selecting ANY customer, not just existing branches
            // isBranch: true, 
        },
        select: {
            id: true,
            razonSocial: true,
            linkedStoreId: true,
            isBranch: true // Select to show badge in UI if needed
        },
        orderBy: { razonSocial: 'asc' }
    });
}

export async function transferStock(targetCustomerId: string, items: TransferItem[]) {
    const session = await auth();
    const sourceStoreId = (session?.user as any)?.storeId;
    const userId = session?.user?.id;

    if (!sourceStoreId || !userId) {
        return { success: false, error: 'No autorizado' };
    }

    if (items.length === 0) {
        return { success: false, error: 'No hay items para transferir' };
    }

    try {
        // 1. Validate Target
        const targetCustomer = await prisma.customer.findUnique({
            where: { id: targetCustomerId },
            select: { isBranch: true, linkedStoreId: true, razonSocial: true }
        });

        if (!targetCustomer) {
            return { success: false, error: 'Cliente destino no encontrado' };
        }

        let destinationStoreId = targetCustomer.linkedStoreId;

        // Auto-Promote Logic: If customer is not a branch yet, make it one!
        if (!destinationStoreId) {
            console.log(`[Transfer] Auto-promoting customer ${targetCustomer.razonSocial} to Branch...`);

            // 1. Create new Store
            const newStore = await prisma.store.create({
                data: {
                    name: `Sucursal - ${targetCustomer.razonSocial}`,
                    // Inherit address if available, or empty
                }
            });

            // 2. Link Customer to Store
            await prisma.customer.update({
                where: { id: targetCustomerId },
                data: {
                    isBranch: true,
                    linkedStoreId: newStore.id
                }
            });

            destinationStoreId = newStore.id;
        }

        // 2. Transaction
        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                // A. Decrement Source
                const sourceProduct = await tx.product.findUnique({
                    where: { storeId_sku: { storeId: sourceStoreId, sku: item.sku } }
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
                        storeId: sourceStoreId,
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
                            unidadMedida: sourceProduct.unidadMedida,
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
