import { PrismaClient } from '@prisma/client';
import { Search, Package, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import InventoryClient from './InventoryClient';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; sort?: string; order?: string; sku?: string; desc?: string; line?: string; view?: string; store?: string; }>;
}) {
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    const userRole = (session?.user as any)?.role;
    const allStores = await prisma.store.findMany({ select: { id: true, name: true } });
    const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { name: true }
    });
    const storeName = store?.name || 'Tienda';

    if (!storeId) {
        return (
            <div className="container">
                <p>No tienes una tienda asignada. Contacta al administrador.</p>
            </div>
        );
    }

    const params = await searchParams;
    const view = params.view || 'list';
    const query = params.q || "";
    const page = Number(params.page) || 1;
    const pageSize = 20;

    // Sorting
    const sortField = params.sort || 'sku';
    const sortOrder = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

    let orderBy: any = { [sortField]: sortOrder };

    // Fix: Ensure Nulls are always last for Date fields to show relevant data first
    if (['lastSale', 'lastPurchase'].includes(sortField)) {
        orderBy = { [sortField]: { sort: sortOrder, nulls: 'last' } };
    }

    // Base Filter (Global Search)
    const baseWhere = {
        ...(userRole === 'ADMIN' ? {} : { storeId }),
        ...(query ? {
            OR: [
                { sku: { contains: query, mode: 'insensitive' as const } },
                { description: { contains: query, mode: 'insensitive' as const } }
            ]
        } : {})
    };

    // Column Filters
    const columnWhere = {
        AND: [
            params.sku ? { sku: { contains: params.sku, mode: 'insensitive' as const } } : {},
            params.desc ? { description: { contains: params.desc, mode: 'insensitive' as const } } : {},
            params.line ? { line: { contains: params.line, mode: 'insensitive' as const } } : {},
            params.store ? { storeId: params.store } : {},
        ]
    };

    const where = {
        AND: [baseWhere, columnWhere]
    };

    const products = await prisma.product.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy,
        include: { store: { select: { name: true } } }
    });

    const totalCount = await prisma.product.count({ where });
    const totalPages = Math.ceil(totalCount / pageSize);

    // KARDEX VIEW LOGIC
    let recentMovements: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (view === 'kardex') {
        recentMovements = await prisma.invoiceItem.findMany({
            where: {
                invoice: {
                    storeId,
                    fechaEmision: {
                        gte: today
                    }
                }
            },
            take: 500, // Aumentamos límite para cubrir todo el día
            orderBy: { invoice: { fechaEmision: 'desc' } },
            include: {
                invoice: {
                    select: {
                        fechaEmision: true,
                        serie: true,
                        folio: true,
                        uuid: true,
                        customer: { select: { razonSocial: true } }
                    }
                }
            }
        });
    }

    return (
        <div className="container" style={{ maxWidth: '100%' }}>
            <InventoryClient
                storeName={storeName}
                products={JSON.parse(JSON.stringify(products.map(p => ({
                    ...p,
                    stock: Number(p.stock),
                    price: Number(p.price),
                    costoPromedio: Number(p.costoPromedio),
                    iva: Number(p.iva),
                    ieps: Number(p.ieps),
                    retencionIva: Number(p.retencionIva),
                    retencionIsr: Number(p.retencionIsr),
                    lastSale: p.lastSale ? p.lastSale.toISOString() : null,
                    lastPurchase: p.lastPurchase ? p.lastPurchase.toISOString() : null,
                    storeName: p.store?.name // Pass per-row store name
                    // Ensure other decimal fields are also handled if specific number type is required,
                    // otherwise JSON.stringify handles them as strings which is widely compatible
                }))))}
                filteredStores={allStores}
                currentSort={sortField}
                currentOrder={sortOrder}
                filters={{
                    sku: params.sku,
                    desc: params.desc,
                    line: params.line,
                    store: params.store
                }}
                searchQuery={query}
            />

            {/* Paginación Simple */}
            <div className="flex justify-between items-center" style={{ marginTop: '1.5rem' }}>
                <div className="text-muted text-sm">
                    Mostrando {products.length} de {totalCount} resultados
                </div>
                <div className="flex gap-2">
                    {page > 1 && (
                        <Link href={`/inventario?q=${query}&page=${page - 1}&sort=${sortField}&order=${sortOrder}&sku=${params.sku || ''}&desc=${params.desc || ''}&line=${params.line || ''}`} className="btn" style={{ backgroundColor: 'var(--card)' }}>
                            Anterior
                        </Link>
                    )}
                    {page < totalPages && (
                        <Link href={`/inventario?q=${query}&page=${page + 1}&sort=${sortField}&order=${sortOrder}&sku=${params.sku || ''}&desc=${params.desc || ''}&line=${params.line || ''}`} className="btn" style={{ backgroundColor: 'var(--card)' }}>
                            Siguiente
                        </Link>
                    )}
                </div>
            </div>

            {/* VISTA KARDEX (Overlay o Reemplazo) */}
            {view === 'kardex' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="card shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col p-0" style={{ backgroundColor: '#1e293b', border: '1px solid var(--border)' }}>
                        <div className="p-4 border-b border-border flex justify-between items-center bg-card">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Package className="text-primary" /> Kardex al Día
                            </h3>
                            <Link href="/inventario" className="btn btn-sm btn-secondary">
                                Cerrar
                            </Link>
                        </div>
                        <div className="overflow-y-auto p-0 flex-1 custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="bg-card sticky top-0 z-10">
                                    <tr className="border-b border-border">
                                        <th className="p-3 text-left font-semibold" style={{ width: '120px' }}>Fecha</th>
                                        <th className="p-3 text-left font-semibold">Producto / Concepto</th>
                                        <th className="p-3 text-left font-semibold" style={{ width: '180px' }}>Documento Origen</th>
                                        <th className="p-3 text-right font-semibold" style={{ width: '100px' }}>Cant.</th>
                                        <th className="p-3 text-right font-semibold" style={{ width: '120px' }}>P. Unitario</th>
                                        <th className="p-3 text-right font-semibold" style={{ width: '120px' }}>Importe</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentMovements.map((move) => (
                                        <tr key={move.id} className="border-b border-border hover:bg-white/5 transition-colors">
                                            <td className="p-3 text-muted">
                                                {new Date(move.invoice.fechaEmision).toLocaleDateString()}
                                                <div className="text-xs opacity-50">{new Date(move.invoice.fechaEmision).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-base text-foreground">{move.descripcion.split(' ')[0]}</div>
                                                <div className="text-sm text-muted" title={move.descripcion}>
                                                    {move.descripcion.substring(move.descripcion.indexOf(' ') + 1) || move.descripcion}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <Link href={`/facturas/${move.invoiceId}`} className="text-primary hover:underline font-medium text-xs flex items-center gap-1">
                                                    {move.invoice.serie ? `${move.invoice.serie}-${move.invoice.folio}` : move.invoice.folio || 'S/N'}
                                                    <ExternalLink size={10} />
                                                </Link>
                                                <div className="text-xs text-muted truncate max-w-[150px]">{move.invoice.customer.razonSocial}</div>
                                            </td>
                                            <td className="p-3 text-right font-bold">
                                                {Number(move.cantidad).toLocaleString('es-MX')}
                                            </td>
                                            <td className="p-3 text-right text-muted text-xs">
                                                ${Number(move.valorUnitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-3 text-right font-semibold text-success">
                                                ${Number(move.importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 border-t border-border bg-card text-xs text-muted text-center">
                            Mostrando movimientos del día: <strong>{today.toLocaleDateString()}</strong>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
