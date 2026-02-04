import { PrismaClient } from '@prisma/client';
import { Search, Users } from 'lucide-react';
import Link from 'next/link';
import CustomersClient from './CustomersClient';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export default async function ClientesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;

    if (!storeId) {
        return (
            <div className="container">
                <p>No tienes una tienda asignada. Contacta al administrador.</p>
            </div>
        );
    }

    const params = await searchParams;
    const query = params.q || "";
    const page = Number(params.page) || 1;
    const pageSize = 20;

    const where = {
        storeId,
        ...(query ? {
            OR: [
                { rfc: { contains: query, mode: 'insensitive' as const } },
                { razonSocial: { contains: query, mode: 'insensitive' as const } },
                { email: { contains: query, mode: 'insensitive' as const } }
            ]
        } : {})
    };

    const customers = await prisma.customer.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { razonSocial: 'asc' },
        include: {
            _count: {
                select: { invoices: true }
            }
        }
    });

    const totalCount = await prisma.customer.count({ where });
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="container" style={{ maxWidth: '100%' }}>
            <CustomersClient customers={customers} searchQuery={query} />

            {/* Paginación */}
            <div className="flex justify-between items-center" style={{ marginTop: '1.5rem' }}>
                <div className="text-muted text-sm">
                    Mostrando {customers.length} de {totalCount} resultados
                </div>
                <div className="flex gap-2">
                    {page > 1 && (
                        <Link href={`/clientes?q=${query}&page=${page - 1}`} className="btn" style={{ backgroundColor: 'var(--card)' }}>
                            Anterior
                        </Link>
                    )}
                    {page < totalPages && (
                        <Link href={`/clientes?q=${query}&page=${page + 1}`} className="btn" style={{ backgroundColor: 'var(--card)' }}>
                            Siguiente
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
