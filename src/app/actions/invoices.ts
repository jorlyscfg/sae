'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createLog } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

const InvoiceItemSchema = z.object({
    id: z.string().optional(), // For updates if needed, logic mainly creates new
    descripcion: z.string(),
    cantidad: z.coerce.number().min(0.0001),
    valorUnitario: z.coerce.number().min(0),
    importe: z.coerce.number(),
    unidad: z.string().optional(),
    // Para relacionar con producto y descontar stock:
    sku: z.string().optional(),
});

const InvoiceSchema = z.object({
    customerId: z.string().min(1, "El Cliente es requerido"),
    serie: z.string().optional(),
    folio: z.string().optional(),
    items: z.array(InvoiceItemSchema).min(1, "Debe agregar al menos una partida"),
    total: z.coerce.number(),
    subtotal: z.coerce.number(),
});

export async function createInvoice(data: z.infer<typeof InvoiceSchema>) {
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    const userId = session?.user?.id;

    if (!storeId || !userId) return { success: false, error: { server: ['No autorizado'] } };

    const result = InvoiceSchema.safeParse(data);

    if (!result.success) {
        return { success: false, error: result.error.flatten().fieldErrors };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Crear Factura
            const invoice = await tx.invoice.create({
                data: {
                    uuid: uuidv4(), // Fake UUID for SAT
                    customerId: result.data.customerId,
                    storeId,
                    userId,
                    fechaEmision: new Date(),
                    subtotal: result.data.subtotal,
                    total: result.data.total,
                    serie: result.data.serie || 'F',
                    folio: result.data.folio || 'AUTO',
                    tipoComprobante: 'I',
                }
            });

            // 2. Crear Partidas y Descontar Stock
            for (const item of result.data.items) {
                await tx.invoiceItem.create({
                    data: {
                        invoiceId: invoice.id,
                        descripcion: item.descripcion,
                        cantidad: item.cantidad,
                        valorUnitario: item.valorUnitario,
                        importe: item.importe,
                        unidad: item.unidad || 'PZA',
                    }
                });

                // Si tiene SKU, intentar descontar inventario
                if (item.sku) {
                    // Buscar producto (por storeId + sku)
                    const product = await tx.product.findUnique({
                        where: {
                            storeId_sku: {
                                storeId,
                                sku: item.sku
                            }
                        }
                    });

                    if (product) {
                        await tx.product.update({
                            where: { id: product.id },
                            data: {
                                stock: { decrement: item.cantidad }
                            }
                        });
                    }
                }
            }

            // 3. Crear Cuenta por Cobrar (CxC)
            const fechaVencimiento = new Date();
            fechaVencimiento.setDate(fechaVencimiento.getDate() + 30); // Default 30 days credit

            await tx.receivable.create({
                data: {
                    customerId: invoice.customerId,
                    folio: `${invoice.serie || ''}-${invoice.folio || ''}`,
                    fechaEmision: invoice.fechaEmision,
                    fechaVencimiento,
                    importeOriginal: invoice.total,
                    saldo: invoice.total,
                    estatus: 'PENDIENTE',
                    storeId,
                    userId
                }
            });

            // 4. Log de la Factura
            await tx.auditLog.create({
                data: {
                    module: 'invoices',
                    action: 'CREATE',
                    description: `Generación de Factura ${invoice.serie}-${invoice.folio} para Cliente ID: ${invoice.customerId}`,
                    entityId: invoice.id,
                    storeId,
                    userId,
                    metadata: { uuid: invoice.uuid, total: invoice.total, itemsCount: result.data.items.length }
                }
            });
        });

        revalidatePath('/facturas');
        revalidatePath('/inventario');
        return { success: true };
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error(e);
        return { success: false, error: { server: ['Error al crear la factura y descontar inventario'] } };
    }
}

export async function deleteInvoice(id: string) {
    try {
        const session = await auth();
        const storeId = (session?.user as any)?.storeId;
        if (!storeId) return { success: false, error: 'No autorizado' };

        const invoice = await prisma.invoice.findUnique({
            where: { id, storeId }
        });

        if (!invoice) return { success: false, error: 'Factura no encontrada o no autorizada' };

        await prisma.invoice.delete({
            where: { id, storeId }
        });

        await createLog(
            'invoices',
            'DELETE',
            `Se eliminó la factura ${invoice?.serie || ''}-${invoice?.folio || id}`,
            id
        );

        revalidatePath('/facturas');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'No se pudo eliminar la factura' };
    }
}
