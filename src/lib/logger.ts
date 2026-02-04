import prisma from './prisma';
import { auth } from '@/auth';

export type LogModule = 'customers' | 'products' | 'invoices' | 'quotes' | 'system';
export type LogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC' | 'ERROR';

/**
 * Crea una entrada en la bitácora del sistema (Audit Log).
 * @param module Módulo afectado
 * @param action Acción realizada
 * @param description Descripción legible para el usuario
 * @param entityId ID del registro afectado (opcional)
 * @param metadata Datos adicionales del cambio (opcional)
 */
export async function createLog(
    module: LogModule,
    action: LogAction,
    description: string,
    entityId?: string,
    metadata?: any
) {
    try {
        const session = await auth();
        const storeId = (session?.user as any)?.storeId;
        const userId = session?.user?.id;

        if (!storeId) {
            console.warn('⚠️ No storeId found in session for log entry');
            return;
        }

        await prisma.auditLog.create({
            data: {
                module,
                action,
                description,
                entityId,
                storeId,
                userId,
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
            }
        });
    } catch (error) {
        console.error('❌ Error writing to audit log:', error);
    }
}
