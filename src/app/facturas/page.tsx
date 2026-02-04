import { PrismaClient } from '@prisma/client';
import { Search, FileText } from 'lucide-react';
import Link from 'next/link';
import InvoicesClient from './InvoicesClient';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export default async function FacturasPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; folio?: string; customer?: string; type?: string; sort?: string; order?: string }>;
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

    // Sorting
    const sortField = params.sort || 'fechaEmision';
    const sortOrder = (params.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
    const orderBy = { [sortField]: sortOrder };

    // Base Global Search
    const baseWhere = {
        storeId,
        ...(query ? {
            OR: [
                { uuid: { contains: query, mode: 'insensitive' as const } },
                { customer: { razonSocial: { contains: query, mode: 'insensitive' as const } } }
            ]
        } : {})
    };

    // Column Filters
    const columnWhere = {
        AND: [
            params.folio ? {
                OR: [
                    { folio: { contains: params.folio, mode: 'insensitive' as const } },
                    { serie: { contains: params.folio, mode: 'insensitive' as const } },
                    { uuid: { contains: params.folio, mode: 'insensitive' as const } }
                ]
            } : {},
            params.customer ? {
                customer: {
                    razonSocial: { contains: params.customer, mode: 'insensitive' as const }
                }
            } : {},
            params.type === 'fiscal' ? { isFiscal: true } :
                params.type === 'remision' ? { isFiscal: false } : {},
            { storeId }
        ]
    };

    const where = {
        AND: [baseWhere, columnWhere]
    };

    const invoices = await prisma.invoice.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy,
        include: {
            customer: true,
            _count: { select: { items: true } }
        },
    });

    // Fetch customers for the create form
    const customers = await prisma.customer.findMany({
        where: { storeId },
        select: { id: true, razonSocial: true, rfc: true },
        orderBy: { razonSocial: 'asc' }
    });

    const totalCount = await prisma.invoice.count({ where });
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="container" style={{ maxWidth: '100%' }}>
            <InvoicesClient
                invoices={invoices.map(inv => ({
                    ...inv,
                    total: inv.total.toString(),
                    subtotal: inv.subtotal.toString(),
                    itemsCount: inv._count.items,
                    isFiscal: inv.isFiscal,
                    status: inv.status,
                    // Format date on server to avoid hydration mismatch
                    fechaEmisionFormatted: new Date(inv.fechaEmision).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric'
                    })
                }))}
                customers={customers}
                filters={{
                    folio: params.folio,
                    customer: params.customer,
                    type: params.type
                }}
                searchQuery={query}
                currentSort={sortField}
                currentOrder={sortOrder}
            />

            {/* Paginación Simple */}
            <div className="flex justify-between items-center" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                <div className="text-muted">
                    {invoices.length} de {totalCount}
                </div>
                <div className="flex gap-2">
                    {page > 1 && (
                        <Link href={`/facturas?q=${query}&page=${page - 1}&folio=${params.folio || ''}&customer=${params.customer || ''}&type=${params.type || ''}&sort=${sortField}&order=${sortOrder}`} className="btn btn-sm" style={{ backgroundColor: 'var(--card)' }}>
                            Anterior
                        </Link>
                    )}
                    {page < totalPages && (
                        <Link href={`/facturas?q=${query}&page=${page + 1}&folio=${params.folio || ''}&customer=${params.customer || ''}&type=${params.type || ''}&sort=${sortField}&order=${sortOrder}`} className="btn btn-sm" style={{ backgroundColor: 'var(--card)' }}>
                            Siguiente
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
