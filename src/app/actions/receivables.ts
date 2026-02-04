'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getReceivables(params: { customer?: string; status?: string } = {}) {
    try {
        const session = await auth();
        const storeId = (session?.user as any)?.storeId;
        if (!storeId) return { success: false, error: 'No autorizado' };

        const where: any = { storeId };
        if (params.customer) {
            where.customer = { razonSocial: { contains: params.customer, mode: 'insensitive' } };
        }
        if (params.status && params.status !== 'TODOS') {
            where.estatus = params.status;
        } else if (!params.status) {
            where.estatus = { in: ['PENDIENTE', 'VENCIDO'] }; // Default to active debts
        }

        const receivables = await prisma.receivable.findMany({
            where,
            orderBy: { fechaEmision: 'desc' },
            include: {
                customer: { select: { razonSocial: true, rfc: true } },
                payments: true
            },
            take: 100 // Limit for now
        });

        const serializedData = receivables.map((r: any) => ({
            ...r,
            importeOriginal: Number(r.importeOriginal),
            saldo: Number(r.saldo),
            customerName: r.customer.razonSocial,
            customerRfc: r.customer.rfc,
            payments: r.payments.map((p: any) => ({
                ...p,
                importe: Number(p.importe)
            }))
        }));

        const totalPortfolio = receivables.reduce((sum: number, r: any) => sum + Number(r.saldo), 0);

        return {
            success: true,
            data: serializedData,
            summary: {
                totalPortfolio
            }
        };
    } catch (error) {
        console.error('Error fetching general receivables:', error);
        return { success: false, error: 'Failed to fetch receivables' };
    }
}

export async function getCustomerReceivables(customerId: string) {
    try {
        const session = await auth();
        const storeId = (session?.user as any)?.storeId;
        if (!storeId) return { success: false, error: 'No autorizado' };

        const receivables = await prisma.receivable.findMany({
            where: { customerId, storeId },
            orderBy: { fechaEmision: 'desc' },
            include: {
                payments: true
            }
        });

        const serializedData = receivables.map((r: any) => ({
            ...r,
            importeOriginal: Number(r.importeOriginal),
            saldo: Number(r.saldo),
            payments: r.payments.map((p: any) => ({
                ...p,
                importe: Number(p.importe)
            }))
        }));

        const totalDebt = receivables.reduce((sum: number, r: any) => sum + Number(r.saldo), 0);
        const overdueDebt = receivables
            .filter((r: any) => r.estatus === 'VENCIDO' || (r.estatus === 'PENDIENTE' && new Date(r.fechaVencimiento) < new Date()))
            .reduce((sum: number, r: any) => sum + Number(r.saldo), 0);

        return {
            success: true,
            data: serializedData,
            summary: {
                totalDebt,
                overdueDebt
            }
        };
    } catch (error) {
        console.error('Error fetching receivables:', error);
        return { success: false, error: 'Failed to fetch receivables' };
    }
}

export async function registerPayment(receivableId: string, amount: number, concept: string, method: string) {
    try {
        const session = await auth();
        const storeId = (session?.user as any)?.storeId;
        if (!storeId) throw new Error('No autorizado');

        const receivable = await prisma.receivable.findUnique({
            where: { id: receivableId, storeId }
        });

        if (!receivable) {
            throw new Error('Cuenta no encontrada');
        }

        const newBalance = Number(receivable.saldo) - amount;

        // Actualizar Cuenta
        await prisma.receivable.update({
            where: { id: receivableId, storeId },
            data: {
                saldo: newBalance,
                estatus: newBalance <= 0.1 ? 'PAGADO' : receivable.estatus
            }
        });

        // Registrar Pago
        await prisma.payment.create({
            data: {
                receivableId,
                importe: amount,
                concepto: concept,
                metodoPago: method,
                fecha: new Date()
            }
        });

        return { success: true };
    } catch (error) {
        console.error('Error registering payment:', error);
        return { success: false, error: 'Failed to register payment' };
    }
}
