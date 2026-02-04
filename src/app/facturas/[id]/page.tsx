import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, Download, Calendar, User, DollarSign, Package, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';

const prisma = new PrismaClient();

// Función auxiliar para verificar existencia de archivos físicos
function checkInvoiceFiles(uuid: string, fecha: Date) {
    const year = fecha.getFullYear().toString();
    const cfdDir = path.join(process.cwd(), '../CFDs', year);

    // Buscar versiones del archivo con distintos nombres posibles (UUID, Folio, etc)
    // Por simplicidad buscaremos por UUID que es lo más seguro si el sistema los guardó así.
    // OJO: El sistema legacy puede tenerlos por SerieFolio.
    // Intentaremos búsqueda flexible en la API de descarga, aquí solo mostraremos si es PROBABLE que exista.

    return {
        hasXml: true, // Asumimos true y la API manejará el 404
        hasPdf: true
    };
}

export default async function InvoiceDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    const storeId = (session?.user as any)?.storeId;
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
        where: { id, storeId },
        include: {
            customer: true,
            items: true
        }
    });

    if (!invoice) {
        notFound();
    }

    // Intentar vincular items con productos del inventario
    const itemsWithProduct = await Promise.all((invoice as any).items.map(async (item: any) => {
        const product = await prisma.product.findFirst({
            where: {
                storeId,
                description: { contains: item.descripcion.substring(0, 20), mode: 'insensitive' }
            }
        });
        return { ...item, product };
    }));

    return (
        <div className="container" style={{ maxWidth: '100%' }}>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/facturas" className="btn-icon">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Factura {invoice.serie || ''}{invoice.folio || ''}
                    </h1>
                    <div className="flex items-center gap-2 text-muted text-sm font-mono">
                        {invoice.uuid}
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <a href={`/api/invoices/${invoice.uuid}/download?type=xml`} target="_blank" className="btn bg-white/5 hover:bg-white/10 flex items-center gap-2">
                        <FileText size={16} /> XML
                    </a>
                    <a href={`/api/invoices/${invoice.uuid}/download?type=pdf`} target="_blank" className="btn bg-white/5 hover:bg-white/10 flex items-center gap-2">
                        <Download size={16} /> PDF
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
                {/* Cliente */}
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-muted uppercase mb-4 flex items-center gap-2">
                        <User size={16} /> Cliente
                    </h3>
                    <div className="text-lg font-bold mb-1">
                        <Link href={`/clientes/${(invoice as any).customer.id}`} className="hover:underline text-primary">
                            {(invoice as any).customer.razonSocial}
                        </Link>
                    </div>
                    <div className="text-muted text-sm">{(invoice as any).customer.rfc}</div>
                    <div className="text-muted text-sm">{(invoice as any).customer.email}</div>
                </div>

                {/* Detalles */}
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-muted uppercase mb-4 flex items-center gap-2">
                        <Calendar size={16} /> Detalles
                    </h3>
                    <div className="flex justify-between mb-2">
                        <span className="text-muted">Fecha Emisión</span>
                        <span className="font-medium">{new Date(invoice.fechaEmision).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-muted">Tipo</span>
                        <span className={`font-bold ${invoice.tipoComprobante === 'I' ? 'text-green-400' : 'text-red-400'}`}>
                            {invoice.tipoComprobante === 'I' ? 'Ingreso' : 'Egreso'}
                        </span>
                    </div>
                </div>

                {/* Totales */}
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-muted uppercase mb-4 flex items-center gap-2">
                        <DollarSign size={16} /> Totales
                    </h3>
                    <div className="flex justify-between mb-2 text-sm">
                        <span className="text-muted">Subtotal</span>
                        <span>${Number(invoice.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between mb-2 text-sm">
                        <span className="text-muted">Impuestos</span>
                        <span>${(Number(invoice.total) - Number(invoice.subtotal)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between mt-4 border-t border-white/10 pt-2 text-xl font-bold text-success">
                        <span>Total</span>
                        <span>${Number(invoice.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            <h2 className="text-lg font-semibold mb-4">Conceptos</h2>

            <div className="card p-0 overflow-hidden">
                <table className="data-table">
                    <thead className="data-table-thead">
                        <tr>
                            <th className="data-table-th">Descripción</th>
                            <th className="data-table-th" style={{ textAlign: 'right' }}>Cantidad</th>
                            <th className="data-table-th" style={{ textAlign: 'right' }}>Precio Unitario</th>
                            <th className="data-table-th" style={{ textAlign: 'right' }}>Importe</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsWithProduct.map((item) => (
                            <tr key={item.id} className="data-table-tr">
                                <td className="data-table-td">
                                    <div className="font-medium">{item.descripcion}</div>
                                    {item.product ? (
                                        <Link href={`/inventario/${item.product.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-1 hover:bg-indigo-500/20 transition-colors">
                                            <Package size={12} /> Ver Producto ({item.product.sku})
                                        </Link>
                                    ) : (
                                        <span className="text-xs text-muted italic flex items-center gap-1 mt-1">
                                            <AlertCircle size={12} /> No vinculado a inventario
                                        </span>
                                    )}
                                </td>
                                <td className="data-table-td" style={{ textAlign: 'right' }}>
                                    <span className="font-medium">{Number(item.cantidad)} {item.unidad}</span>
                                </td>
                                <td className="data-table-td" style={{ textAlign: 'right' }}>
                                    <span className="text-muted">${Number(item.valorUnitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                </td>
                                <td className="data-table-td" style={{ textAlign: 'right' }}>
                                    <span className="font-bold">${Number(item.importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
