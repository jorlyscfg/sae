'use server';

import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

const BITACORA_DIR = '/development/aspel-dany/Bitacora';

export async function getBitacoraFiles() {
    try {
        const files = fs.readdirSync(BITACORA_DIR)
            .filter(f => f.endsWith('.log'))
            .map(f => {
                const stats = fs.statSync(path.join(BITACORA_DIR, f));
                // Extraer fecha del nombre: Aspel-SAE 6.00_1_06-02-2025.log
                const match = f.match(/(\d{2})-(\d{2})-(\d{4})/);
                return {
                    filename: f,
                    size: stats.size,
                    date: match ? `${match[3]}-${match[2]}-${match[1]}` : stats.mtime.toISOString().split('T')[0]
                };
            })
            .sort((a, b) => b.date.localeCompare(a.date));

        return files;
    } catch (error) {
        console.error('Error reading log files:', error);
        return [];
    }
}

export async function readBitacoraContent(filename: string) {
    try {
        const filePath = path.join(BITACORA_DIR, filename);
        if (!fs.existsSync(filePath)) throw new Error('Archivo no encontrado');

        const content = fs.readFileSync(filePath, 'latin1');
        const lines = content.split('\n');

        // Extraer año para reconstruir fecha completa
        const dateMatch = filename.match(/(\d{2})-(\d{2})-(\d{4})/);
        const yearPrefix = dateMatch ? dateMatch[3] : new Date().getFullYear().toString();

        return lines.map((line, idx) => {
            // Regex para el formato Aspel
            // <14>Feb  6 19:45:57 ... msg="Se agreg la compra [0000000871]"
            const msgMatch = line.match(/msg="([^"]+)"/);
            const userMatch = line.match(/usr="([^"]+)"/);
            const timeMatch = line.match(/([A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2})/);

            if (!msgMatch && !line.trim()) return null;

            return {
                id: `${filename}-${idx}`,
                raw: line,
                message: msgMatch ? msgMatch[1] : line.substring(0, 200),
                user: userMatch ? userMatch[1] : 'Sistema',
                timestamp: timeMatch ? `${timeMatch[1]} ${yearPrefix}` : 'N/A'
            };
        }).filter(Boolean);
    } catch (error) {
        console.error('Error reading log content:', error);
        return null;
    }
}
export async function getAuditLogs() {
    try {
        const { auth } = require('@/auth');
        const session = await auth();
        const storeId = (session?.user as any)?.storeId;
        if (!storeId) return [];

        const logs = await prisma.auditLog.findMany({
            where: { storeId },
            orderBy: { timestamp: 'desc' },
            take: 100
        });

        return JSON.parse(JSON.stringify(logs));
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return [];
    }
}
