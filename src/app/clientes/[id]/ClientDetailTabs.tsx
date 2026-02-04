'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Mail, FileText, DollarSign, Calendar, Wallet } from 'lucide-react';
import ClientStatement from '@/components/ClientStatement';

interface ClientDetailTabsProps {
    customerId: string;
    invoices: any[];
    initialStats: any;
    customerInfo: any;
}

export default function ClientDetailTabs({ customerId, invoices, initialStats, customerInfo }: ClientDetailTabsProps) {
    const [activeTab, setActiveTab] = useState<'history' | 'statement'>('statement'); // Default a estado de cuenta por prioridad

    return (
        <>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/clientes" className="btn-icon">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {customerInfo.razonSocial}
                    </h1>
                    <div className="flex items-center gap-4 text-muted text-sm">
                        <span className="flex items-center gap-1"><User size={14} /> {customerInfo.rfc}</span>
                        {customerInfo.email && (
                            <span className="flex items-center gap-1"><Mail size={14} /> {customerInfo.email}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Re-using same style cards but cleaner */}
                <KpiCard icon={FileText} label="Total Facturas" value={initialStats.totalInvoices} color="text-primary" />
                <KpiCard icon={DollarSign} label="Total Comprado" value={`$${initialStats.totalSpent.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} color="text-success" />
                <KpiCard icon={TrendingUp} label="Ticket Promedio" value={`$${initialStats.avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} color="text-warning" />
                <KpiCard icon={Calendar} label="Última Compra" value={initialStats.lastPurchase ? new Date(initialStats.lastPurchase).toLocaleDateString() : 'N/A'} color="text-info" />
            </div>

            {/* Tabs Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <button
                    onClick={() => setActiveTab('statement')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '0.375rem',
                        backgroundColor: activeTab === 'statement' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        color: activeTab === 'statement' ? 'var(--primary)' : 'var(--muted)',
                        fontWeight: activeTab === 'statement' ? 600 : 400,
                        fontSize: '0.875rem',
                        transition: 'all 0.15s',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <Wallet size={16} /> Estado de Cuenta (CxC)
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '0.375rem',
                        backgroundColor: activeTab === 'history' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        color: activeTab === 'history' ? 'var(--primary)' : 'var(--muted)',
                        fontWeight: activeTab === 'history' ? 600 : 400,
                        fontSize: '0.875rem',
                        transition: 'all 0.15s',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <FileText size={16} /> Historial de Facturas
                </button>
            </div>

            {/* Content */}
            {activeTab === 'statement' ? (
                <ClientStatement customerId={customerId} />
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="card p-0 overflow-hidden">
                        <table className="data-table">
                            <thead className="data-table-thead">
                                <tr>
                                    <th className="data-table-th">Fecha</th>
                                    <th className="data-table-th">Folio / UUID</th>
                                    <th className="data-table-th">Tipo</th>
                                    <th className="data-table-th" style={{ textAlign: 'right' }}>Subtotal</th>
                                    <th className="data-table-th" style={{ textAlign: 'right' }}>Total</th>
                                    <th className="data-table-th" style={{ textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.id} className="data-table-tr">
                                        <td className="data-table-td" style={{ color: '#94a3b8' }}>
                                            {new Date(inv.fechaEmision).toLocaleDateString()}
                                        </td>
                                        <td className="data-table-td">
                                            <div className="font-medium text-foreground">{inv.serie}{inv.folio}</div>
                                            <div className="text-xs text-muted font-mono">{inv.uuid.substring(0, 8)}...</div>
                                        </td>
                                        <td className="data-table-td">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${inv.tipoComprobante === 'I' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                }`}>
                                                {inv.tipoComprobante === 'I' ? 'Ingreso' : 'Egreso'}
                                            </span>
                                        </td>
                                        <td className="data-table-td" style={{ textAlign: 'right', color: '#94a3b8' }}>
                                            ${Number(inv.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="data-table-td" style={{ textAlign: 'right' }}>
                                            <span className="font-bold text-success">${Number(inv.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="data-table-td" style={{ textAlign: 'center' }}>
                                            <Link href={`/facturas/${inv.id}`} className="btn btn-secondary btn-sm text-[10px] uppercase tracking-wider">
                                                Ver Detalle
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}

function KpiCard({ icon: Icon, label, value, color }: any) {
    return (
        <div className="card p-4">
            <div className={`text-muted text-xs uppercase font-bold mb-2 flex items-center gap-2`}>
                <Icon size={16} className={color} /> {label}
            </div>
            <div className={`text-2xl font-bold ${color === 'text-success' ? 'text-success' : ''}`}>
                {value}
            </div>
        </div>
    );
}

function TrendingUp({ size, className }: { size?: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 24}
            height={size || 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
    );
}
