'use client';

import { useState } from 'react';
import { Plus, Trash2, Calendar, User, ArrowUp, ArrowDown, ExternalLink, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import InvoiceFormModal from '@/components/InvoiceFormModal';
import ClientDate from '@/components/ClientDate';
import { deleteInvoice } from '@/app/actions/invoices';

interface Invoice {
    id: string;
    uuid: string;
    serie: string | null;
    folio: string | null;
    fechaEmision: Date;
    fechaEmisionFormatted: string;
    total: number | string; // Decimal
    isFiscal: boolean;
    status: string | null;
    customer: {
        razonSocial: string;
    };
    itemsCount: number;
}

interface InvoicesClientProps {
    invoices: Invoice[];
    customers: { id: string; razonSocial: string; rfc: string }[];
    filters: {
        folio?: string;
        customer?: string;
        type?: string;
    };
    searchQuery: string;
    currentSort: string;
    currentOrder: 'asc' | 'desc';
}

export default function InvoicesClient({ invoices, customers, filters, searchQuery, currentSort, currentOrder }: InvoicesClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState(searchQuery);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Debounced search handler (basic implementation)
    const handleSearch = (term: string) => {
        setSearchTerm(term);
        const params = new URLSearchParams(searchParams.toString());
        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }
        params.set('page', '1');
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleFilter = (field: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(field, value);
        } else {
            params.delete(field);
        }
        // Reset page to 1 when filtering
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
        router.push(`${pathname}?${params.toString()}`);
    };

    const renderSortIcon = (field: string) => {
        if (currentSort !== field) return null;
        return currentOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta factura?')) return;
        setIsDeleting(id);
        const result = await deleteInvoice(id);
        setIsDeleting(null);
        if (!result.success) {
            alert(result.error);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar Optimized: Full Width Search (Original Styles) + Action Button */}
            {/* Toolbar Optimized: Full Width Search + Button (Right, Icon Only) */}
            {/* Toolbar Optimized: Full Width Search + Button (Right, Icon Only) */}
            <div className="flex flex-row gap-3 mb-4 items-center">
                {/* Search Bar */}
                <div className="relative flex-grow">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Buscar por UUID, Serie, Folio o Cliente..."
                        className="input pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </div>

                {/* Actions - Right Aligned */}
                <div className="flex-shrink-0">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn btn-primary h-11 w-11 p-0 flex items-center justify-center"
                        title="Nueva Factura"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="card flex-1 flex flex-col min-h-0" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container flex-1 overflow-auto">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: '800px' }}>
                        <thead className="sticky top-0 z-10" style={{ backgroundColor: '#1e293b', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, verticalAlign: 'top', width: '20%' }}>
                                    <div style={{ marginBottom: '0.25rem' }}>Folio / UUID</div>
                                    <input
                                        type="text"
                                        defaultValue={filters.folio || ''}
                                        onChange={(e) => handleFilter('folio', e.target.value)}
                                        placeholder="Filtrar..."
                                        suppressHydrationWarning
                                        className="input-filter-header mt-1"
                                    />
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, verticalAlign: 'top', width: '30%' }}>
                                    <div style={{ marginBottom: '0.25rem' }}>Cliente</div>
                                    <input
                                        type="text"
                                        defaultValue={filters.customer || ''}
                                        onChange={(e) => handleFilter('customer', e.target.value)}
                                        placeholder="Filtrar..."
                                        suppressHydrationWarning
                                        className="input-filter-header mt-1"
                                    />
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, verticalAlign: 'top' }}>
                                    <div onClick={() => handleSort('fechaEmision')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.25rem' }}>
                                        Fecha {renderSortIcon('fechaEmision')}
                                    </div>
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 500, verticalAlign: 'top' }}>
                                    <div onClick={() => handleSort('total')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'end', gap: '4px', marginBottom: '0.25rem' }}>
                                        Total {renderSortIcon('total')}
                                    </div>
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, verticalAlign: 'top' }}>
                                    <div style={{ marginBottom: '0.25rem' }}>Tipo</div>
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 500 }}>Items</th>
                                <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 500 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr
                                    key={inv.id}
                                    className="hover-row cursor-pointer group"
                                    style={{ borderBottom: '1px solid var(--card-border)' }}
                                    onClick={(e) => {
                                        if ((e.target as HTMLElement).closest('button, a')) return;
                                        router.push(`/facturas/${inv.id}`);
                                    }}
                                >
                                    <td style={{ padding: '0.5rem' }}>
                                        <div className="flex items-center gap-2">
                                            <Link href={`/facturas/${inv.id}`} className="font-mono text-primary no-underline hover:underline flex items-center gap-1">
                                                {inv.serie ? `${inv.serie}-${inv.folio}` : inv.folio || 'S/N'}
                                            </Link>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[120px]" title={inv.uuid}>
                                            {inv.uuid}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.5rem' }}>
                                        <div className="flex items-center gap-2">
                                            <User size={12} className="text-muted" />
                                            <span className="font-medium text-xs md:text-sm">{inv.customer.razonSocial}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.5rem' }}>
                                        <div className="flex items-center gap-2 text-muted text-xs">
                                            <ClientDate
                                                date={inv.fechaEmision}
                                                options={{ day: '2-digit', month: 'short', year: 'numeric' }}
                                            />
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }} className="text-emerald-400">
                                        ${Number(inv.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: '0.5rem' }}>
                                        <span className={`badge ${inv.isFiscal ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid' }}>
                                            {inv.status || (inv.isFiscal ? 'CFDI' : 'Nota')}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                        <span className="text-xs text-slate-500">{inv.itemsCount}</span>
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link
                                                href={`/facturas/${inv.id}`}
                                                className="action-btn action-btn-view"
                                                title="Ver Detalle"
                                            >
                                                <ExternalLink size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(inv.id)}
                                                className="action-btn action-btn-delete"
                                                disabled={isDeleting === inv.id}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <InvoiceFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                customers={customers}
            />
        </div>
    );
}
