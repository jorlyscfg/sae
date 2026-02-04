'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Plus, ArrowRight, RotateCw, CheckCircle, Search, ArrowUp, ArrowDown } from 'lucide-react';
import ClientDate from '@/components/ClientDate';
import QuoteFormModal from '@/components/QuoteFormModal';
import { convertQuoteToInvoice } from '@/app/actions/quotes';

interface QuotesClientProps {
    initialData: any[];
    customers: any[];
}

export default function QuotesClient({ initialData, customers }: QuotesClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isconvertingId, setIsConvertingId] = useState<string | null>(null);

    // Filter/Sort States from URL
    const currentSort = searchParams.get('sort') || 'fechaEmision';
    const currentOrder = searchParams.get('order') || 'desc';

    // Global filter state (if using toolbar search)
    const [searchTerm, setSearchTerm] = useState('');

    const handleFilter = (field: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(field, value);
        } else {
            params.delete(field);
        }
        params.set('page', '1');
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleSort = (field: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (currentSort === field) {
            params.set('order', currentOrder === 'asc' ? 'desc' : 'asc');
        } else {
            params.set('sort', field);
            params.set('order', 'asc');
        }
        router.replace(`${pathname}?${params.toString()}`);
    };

    const renderSortIcon = (field: string) => {
        if (currentSort !== field) return null;
        return currentOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    const handleConvert = async (id: string, folio: string) => {
        if (!confirm(`¿Convertir cotización ${folio} a FACTURA?\nSe generará la factura y se descontará inventario.`)) return;

        setIsConvertingId(id);
        const res = await convertQuoteToInvoice(id);
        setIsConvertingId(null);

        if (res.success) {
            router.refresh();
        } else {
            alert('Error: ' + res.error);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar Optimized: Full Width Search + Button (Right, Icon Only) */}
            <div className="flex flex-row gap-3 mb-4 items-center">
                {/* Search Bar */}
                <div className="relative flex-grow">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por Folio, Cliente..."
                        className="input pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </div>

                {/* Actions - Right Aligned */}
                <div className="flex-shrink-0">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn btn-primary h-11 w-11 p-0 flex items-center justify-center"
                        title="Nueva Cotización"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content - Table */}
            <div className="card flex-1 flex flex-col min-h-0" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container flex-1 overflow-auto">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: '800px' }}>
                        <thead className="sticky top-0 z-10" style={{ backgroundColor: '#1e293b', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, verticalAlign: 'top', width: '20%' }}>
                                    <div style={{ marginBottom: '0.25rem' }}>Folio</div>
                                    <input
                                        type="text"
                                        defaultValue={searchParams.get('folio') || ''}
                                        onChange={(e) => handleFilter('folio', e.target.value)}
                                        placeholder="Filtrar..."
                                        className="input-filter-header mt-1"
                                    />
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, verticalAlign: 'top', width: '30%' }}>
                                    <div style={{ marginBottom: '0.25rem' }}>Cliente</div>
                                    <input
                                        type="text"
                                        defaultValue={searchParams.get('customer') || ''}
                                        onChange={(e) => handleFilter('customer', e.target.value)}
                                        placeholder="Filtrar..."
                                        className="input-filter-header mt-1"
                                    />
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, verticalAlign: 'top' }}>
                                    <div onClick={() => handleSort('fechaEmision')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.25rem' }}>
                                        Fecha {renderSortIcon('fechaEmision')}
                                    </div>
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, verticalAlign: 'top' }}>
                                    <div className="mb-1">Vigencia</div>
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 500, verticalAlign: 'top' }}>
                                    <div onClick={() => handleSort('total')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'end', gap: '4px', marginBottom: '0.25rem' }}>
                                        Total {renderSortIcon('total')}
                                    </div>
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, verticalAlign: 'top' }}>
                                    <div className="mb-1">Estatus</div>
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 500 }}>
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {initialData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-500">
                                        No hay cotizaciones registradas
                                    </td>
                                </tr>
                            ) : (
                                initialData.map((quote) => (
                                    <tr
                                        key={quote.id}
                                        className="hover-row group"
                                        style={{ borderBottom: '1px solid var(--card-border)' }}
                                    >
                                        <td style={{ padding: '0.5rem' }}>
                                            <span className="font-mono text-primary font-medium">
                                                {quote.folio || 'S/F'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div className="flex items-center gap-2">
                                                {/* In Invoices there's an Icon here, adding it for spacing consistency if wanted, but text is fine */}
                                                <span className="font-medium text-xs md:text-sm text-slate-200">
                                                    {quote.customer.razonSocial}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div className="text-xs text-muted">
                                                <ClientDate date={quote.fechaEmision} />
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div className="text-xs text-muted">
                                                {quote.vigencia ? <ClientDate date={quote.vigencia} /> : '-'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }} className="text-emerald-400">
                                            ${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <span className={`badge ${quote.status === 'FACTURADA' ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800' :
                                                    quote.status === 'BORRADOR' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                                                        'bg-blue-900/30 text-blue-300 border-blue-800'
                                                }`} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid' }}>
                                                {quote.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                            <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity">
                                                {quote.status !== 'FACTURADA' && (
                                                    <button
                                                        onClick={() => handleConvert(quote.id, quote.folio)}
                                                        className="action-btn action-btn-view"
                                                        title="Convertir a Factura"
                                                        disabled={isconvertingId === quote.id}
                                                    >
                                                        {isconvertingId === quote.id ? (
                                                            <RotateCw className="animate-spin" size={16} />
                                                        ) : (
                                                            <ArrowRight size={16} />
                                                        )}
                                                    </button>
                                                )}
                                                {quote.status === 'FACTURADA' && (
                                                    <div title="Ya facturada" className="p-1">
                                                        <CheckCircle size={16} className="text-indigo-500" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <QuoteFormModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); router.refresh(); }}
                customers={customers}
            />
        </div>
    );
}
