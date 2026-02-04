import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import { ArrowLeft, Package, DollarSign, Calendar, TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import ProductImage from '@/components/ProductImage';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export default async function ProductDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    const userId = session?.user?.id;
    const { id } = await params;

    const product = await prisma.product.findFirst({
        where: { id, userId },
    });

    if (!product) {
        notFound();
    }

    // Buscar ventas relacionadas en facturas
    // Nota: Como InvoiceItem no tiene relación directa por ID, buscamos por descripción (matching parcial) o SKU si existiera campo
    // En este caso, buscaremos coincidencias en descripcion o usaremos la relacion si la implementamos.
    // Asumiremos matching por descripción por ahora.

    // Buscar items de factura que contengan el SKU o parte de la descripción
    const relatedItems = await prisma.invoiceItem.findMany({
        where: {
            invoice: { userId },
            OR: [
                { descripcion: { contains: product.sku, mode: 'insensitive' } },
                { descripcion: { contains: product.description, mode: 'insensitive' } }
            ]
        },
        orderBy: { invoice: { fechaEmision: 'desc' } },
        take: 10,
        include: { invoice: { include: { customer: true } } }
    });

    // KPI: Total Vendido (aproximado)
    const totalSold = relatedItems.reduce((acc: number, item: any) => acc + Number(item.cantidad), 0);
    const lastSale = (relatedItems[0] as any)?.invoice.fechaEmision;

    return (
        <div className="container" style={{ maxWidth: '100%' }}>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/inventario" className="btn-icon">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {product.sku}
                    </h1>
                    <p className="text-muted">{product.description}</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <span className="badge" style={{ backgroundColor: 'var(--card)' }}>
                        {product.line || 'Sin Línea'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>

                {/* Columna Izquierda: Imagen y Estado */}
                <div className="flex flex-col gap-4">
                    <div className="card text-center" style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', backgroundColor: '#fff' }}>
                        <ProductImage
                            src={`/api/images/${encodeURIComponent(product.sku)}`}
                            alt={product.description}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="card p-4">
                            <div className="text-muted text-sm flex items-center gap-2">
                                <Package size={16} /> Existencia
                            </div>
                            <div className="text-2xl font-bold mt-1">
                                {Number(product.stock).toLocaleString('es-MX')}
                            </div>
                        </div>
                        <div className="card p-4">
                            <div className="text-muted text-sm flex items-center gap-2">
                                <DollarSign size={16} /> Precio Público
                            </div>
                            <div className="text-2xl font-bold mt-1 text-success">
                                ${Number(product.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Información y Historial */}
                <div className="flex flex-col gap-6">

                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="card p-4 bg-opacity-10">
                            <div className="text-muted text-xs uppercase font-bold text-primary flex items-center gap-1">
                                <TrendingUp size={14} /> Total Ventas (Est.)
                            </div>
                            <div className="text-xl font-bold mt-2">
                                {totalSold} <span className="text-sm font-normal text-muted">unidades</span>
                            </div>
                        </div>
                        <div className="card p-4">
                            <div className="text-muted text-xs uppercase font-bold text-primary flex items-center gap-1">
                                <Calendar size={14} /> Última Venta
                            </div>
                            <div className="text-xl font-bold mt-2">
                                {lastSale ? new Date(lastSale).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Movimientos Recientes */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Kardex al Día (Movimientos)</h3>
                        <div className="card p-0 overflow-hidden">
                            <table className="data-table">
                                <thead className="data-table-thead">
                                    <tr>
                                        <th className="data-table-th">Fecha</th>
                                        <th className="data-table-th">Factura</th>
                                        <th className="data-table-th">Cliente</th>
                                        <th className="data-table-th" style={{ textAlign: 'right' }}>Cantidad</th>
                                        <th className="data-table-th" style={{ textAlign: 'right' }}>Importe</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {relatedItems.map((item: any) => (
                                        <tr key={item.id} className="data-table-tr">
                                            <td className="data-table-td" style={{ color: '#94a3b8' }}>
                                                {new Date(item.invoice.fechaEmision).toLocaleDateString()}
                                            </td>
                                            <td className="data-table-td font-medium">
                                                <Link href={`/facturas/${item.invoiceId}`} className="text-primary hover:text-indigo-300 flex items-center gap-1 group">
                                                    <span>{item.invoice.serie}{item.invoice.folio}</span>
                                                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>
                                            </td>
                                            <td className="data-table-td">
                                                {item.invoice.customer.razonSocial}
                                            </td>
                                            <td className="data-table-td" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                                {Number(item.cantidad)}
                                            </td>
                                            <td className="data-table-td" style={{ textAlign: 'right' }}>
                                                ${Number(item.importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {relatedItems.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-muted">
                                                No se encontraron movimientos recientes relacionados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
