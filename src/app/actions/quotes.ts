'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createLog } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// Reuse Invoice Item Logic for consistency
const QuoteItemSchema = z.object({
    id: z.string().optional(),
    descripcion: z.string(),
    cantidad: z.coerce.number().min(0.0001),
    valorUnitario: z.coerce.number().min(0),
    importe: z.coerce.number(),
    unidad: z.string().optional(),
    sku: z.string().optional(),
});

const QuoteSchema = z.object({
    customerId: z.string().min(1, "El Cliente es requerido"),
    vigencia: z.date().optional(),
    items: z.array(QuoteItemSchema).min(1, "Debe agregar al menos una partida"),
    total: z.coerce.number(),
    subtotal: z.coerce.number(),
});

export async function createQuote(data: z.infer<typeof QuoteSchema>) {
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    const userId = session?.user?.id;

    if (!storeId || !userId) return { success: false, error: { server: ['No autorizado'] } };

    const result = QuoteSchema.safeParse(data);

    if (!result.success) {
        return { success: false, error: result.error.flatten().fieldErrors };
    }

    try {
        const quote = await prisma.quote.create({
            data: {
                folio: `COT-${uuidv4().split('-')[0].toUpperCase()}`,
                customerId: result.data.customerId,
                storeId,
                userId,
                vigencia: result.data.vigencia,
                subtotal: result.data.subtotal,
                total: result.data.total,
                status: 'BORRADOR',
                items: {
                    create: result.data.items.map(item => ({
                        descripcion: item.descripcion,
                        cantidad: item.cantidad,
                        valorUnitario: item.valorUnitario,
                        importe: item.importe,
                        unidad: item.unidad || 'PZA',
                        sku: item.sku,
                    }))
                }
            },
            include: { customer: true }
        });

        await createLog(
            'quotes',
            'CREATE',
            `Cotización creada para: ${quote.customer.razonSocial}`,
            quote.id,
            { total: quote.total }
        );

        revalidatePath('/cotizaciones');
        return { success: true, quoteId: quote.id };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: { server: ['Error al crear la cotización'] } };
    }
}

export async function getQuotes(params: { search?: string; status?: string } = {}) {
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    if (!storeId) return { success: false, error: 'No autorizado' };

    const where: any = { storeId };
    if (params.search) {
        where.customer = { razonSocial: { contains: params.search, mode: 'insensitive' } };
    }
    if (params.status) {
        where.status = params.status;
    }

    const quotes = await prisma.quote.findMany({
        where,
        orderBy: { fechaEmision: 'desc' },
        include: { customer: true },
        take: 50
    });

    return {
        success: true,
        data: quotes.map(q => ({
            ...q,
            subtotal: Number(q.subtotal),
            total: Number(q.total)
        }))
    };
}

export async function convertQuoteToInvoice(quoteId: string) {
    // Phase 1 Goal: Basic conversion
    // This will create an Invoice from the Quote and mark Quote as FACTURADA
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    const userId = session?.user?.id;
    if (!storeId || !userId) return { success: false, error: 'No autorizado' };

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Get Quote
            const quote = await tx.quote.findUnique({
                where: { id: quoteId, storeId },
                include: { items: true }
            });

            if (!quote) throw new Error('Cotización no encontrada');
            if (quote.status === 'FACTURADA') throw new Error('Ya fue facturada');

            // 2. Create Invoice
            const invoice = await tx.invoice.create({
                data: {
                    uuid: uuidv4(),
                    customerId: quote.customerId,
                    storeId,
                    userId,
                    fechaEmision: new Date(),
                    subtotal: quote.subtotal,
                    total: quote.total,
                    serie: 'F',
                    folio: 'AUTO',
                    tipoComprobante: 'I',
                    status: 'EMITIDA'
                }
            });

            // 3. Create items and deduct stock
            for (const item of quote.items) {
                await tx.invoiceItem.create({
                    data: {
                        invoiceId: invoice.id,
                        descripcion: item.descripcion,
                        cantidad: item.cantidad,
                        valorUnitario: item.valorUnitario,
                        importe: item.importe,
                        unidad: item.unidad,
                    }
                });

                if (item.sku) {
                    const product = await tx.product.findUnique({
                        where: { storeId_sku: { storeId, sku: item.sku } }
                    });
                    if (product) {
                        await tx.product.update({
                            where: { id: product.id },
                            data: { stock: { decrement: item.cantidad } }
                        });
                    }
                }
            }

            // 4. Create Receivable
            const fechaVencimiento = new Date();
            fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
            await tx.receivable.create({
                data: {
                    customerId: invoice.customerId,
                    storeId,
                    userId,
                    folio: `${invoice.serie}-${invoice.folio}`,
                    fechaEmision: invoice.fechaEmision,
                    fechaVencimiento,
                    importeOriginal: invoice.total,
                    saldo: invoice.total,
                    estatus: 'PENDIENTE'
                }
            });

            // 5. Update Quote
            await tx.quote.update({
                where: { id: quote.id },
                data: { status: 'FACTURADA', invoiceId: invoice.id }
            });

            await tx.auditLog.create({
                data: {
                    module: 'quotes',
                    action: 'CONVERT',
                    description: `Cotización ${quote.folio} convertida a Factura`,
                    entityId: quote.id,
                    storeId,
                    userId
                }
            });
        });

        revalidatePath('/cotizaciones');
        revalidatePath('/facturas');
        return { success: true };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message || 'Error al convertir' };
    }
}
