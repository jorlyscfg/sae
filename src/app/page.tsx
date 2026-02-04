import { PrismaClient } from '@prisma/client';
import { DollarSign, FileText, TrendingUp, Users } from 'lucide-react';

const prisma = new PrismaClient();

import { redirect } from 'next/navigation';
import { auth } from '@/auth';

async function getDashboardData() {
    const session = await auth();
    if (!session?.user) return null;

    const storeId = (session.user as any).storeId;

    const invoiceCount = await prisma.invoice.count({
        where: { storeId }
    });

    const salesAggregate = await prisma.invoice.aggregate({
        where: { storeId },
        _sum: {
            total: true,
        },
    });

    const totalSales = salesAggregate._sum.total ? Number(salesAggregate._sum.total) : 0;

    const recentInvoices = await prisma.invoice.findMany({
        where: { storeId },
        take: 5,
        orderBy: { fechaEmision: 'desc' },
        include: { customer: true },
    });

    const topCustomersGrouping = await prisma.invoice.groupBy({
        by: ['customerId'],
        where: { storeId },
        _sum: {
            total: true,
        },
        orderBy: {
            _sum: {
                total: 'desc',
            },
        },
        take: 5,
    });

    const topCustomers = await Promise.all(topCustomersGrouping.map(async (item) => {
        const customer = await prisma.customer.findUnique({
            where: { id: item.customerId }
        });
        // Filter out if customer was deleted or not found (safety)
        if (!customer) return null;

        return {
            ...customer,
            totalSpent: Number(item._sum.total || 0),
        };
    }));

    return {
        invoiceCount,
        totalSales,
        recentInvoices,
        topCustomers: topCustomers.filter(c => c !== null) as any[],
    };
}

export default async function Home() {
    const data = await getDashboardData();

    if (!data) {
        redirect('/login');
    }

    const averageTicket = data.invoiceCount > 0 ? data.totalSales / data.invoiceCount : 0;

    return (
        <div className="container" style={{ maxWidth: '100%' }}>


            {/* KPI Cards */}
            <div className="grid grid-cols-3" style={{ marginBottom: '2rem' }}>
                <div className="card">
                    <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                        <span className="text-muted text-sm">Ventas Totales</span>
                        <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="text-2xl">${data.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                    <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>
                        <span style={{ color: 'var(--success)' }}>+100%</span> vs periodo anterior
                    </p>
                </div>

                <div className="card">
                    <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                        <span className="text-muted text-sm">Facturas Emitidas</span>
                        <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
                            <FileText size={20} />
                        </div>
                    </div>
                    <div className="text-2xl">{data.invoiceCount}</div>
                    <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>
                        Documentos procesados
                    </p>
                </div>

                <div className="card">
                    <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                        <span className="text-muted text-sm">Ticket Promedio</span>
                        <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="text-2xl">${averageTicket.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                    <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>
                        Por factura
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
                {/* Ultimas Facturas */}
                <div className="card">
                    <h3 className="text-xl" style={{ marginBottom: '1.5rem' }}>Últimas Facturas</h3>
                    <div className="flex flex-col gap-4">
                        {data.recentInvoices.map((inv) => (
                            <div key={inv.id} className="flex justify-between items-center" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                <div className="flex items-center gap-4">
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 500 }}>{inv.customer.razonSocial.substring(0, 30)}...</p>
                                        <p className="text-muted text-sm">{inv.uuid.substring(0, 8)}... • {new Date(inv.fechaEmision).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 600 }}>
                                    ${Number(inv.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Clientes */}
                <div className="card">
                    <h3 className="text-xl" style={{ marginBottom: '1.5rem' }}>Top Clientes</h3>
                    <div className="flex flex-col gap-4">
                        {data.topCustomers.map((cust, idx) => (
                            <div key={cust.id} className="flex items-center gap-4">
                                <div style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '50%',
                                    backgroundColor: idx === 0 ? 'var(--warning)' : 'var(--card-border)',
                                    color: idx === 0 ? 'black' : 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.875rem',
                                    fontWeight: 'bold'
                                }}>
                                    {idx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '0.9rem' }}>{cust.razonSocial?.substring(0, 20)}...</p>
                                    <div style={{
                                        width: '100%',
                                        height: '4px',
                                        backgroundColor: 'var(--card-border)',
                                        borderRadius: '2px',
                                        marginTop: '0.25rem',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${(cust.totalSpent / (data.topCustomers[0].totalSpent || 1)) * 100}%`,
                                            height: '100%',
                                            backgroundColor: 'var(--primary)'
                                        }}></div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                    ${(cust.totalSpent / 1000).toFixed(1)}k
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
