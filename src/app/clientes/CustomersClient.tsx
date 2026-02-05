'use client';

import { useState } from 'react';
import { Mail, FileText, Edit2, Trash2, Plus, Search, Store } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import CustomerFormModal from '@/components/CustomerFormModal';
import { deleteCustomer } from '@/app/actions/customers';
import { promoteToBranch } from '@/app/actions/branch-actions';

interface Customer {
    id: string;
    rfc: string;
    razonSocial: string;
    email: string | null;
    isBranch: boolean;
    createdAt: Date;
    _count: {
        invoices: number;
    };
}

export default function CustomersClient({ customers, searchQuery }: { customers: Customer[], searchQuery: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState(searchQuery);
    const [filters, setFilters] = useState({ name: '', rfc: '' });

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

    const handleEdit = (customer: Customer) => {
        setCustomerToEdit(customer);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setCustomerToEdit(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
        setIsDeleting(id);
        const result = await deleteCustomer(id);
        setIsDeleting(null);
        if (!result.success) {
            alert(result.error);
        }
    };

    const handlePromote = async (id: string, name: string) => {
        if (!confirm(`¿Convertir a "${name}" en Sucursal?\n\nEsto creará un inventario independiente para este cliente.`)) return;
        const result = await promoteToBranch(id);
        if (!result.success) {
            alert(result.error);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar Optimized: Full Width Search + Action Button */}
            {/* Toolbar Optimized: Full Width Search + Button (Right, Icon Only) */}
            {/* Toolbar Optimized: Full Width Search + Button (Right, Icon Only) */}
            <div className="flex flex-row gap-3 mb-4 items-center">
                {/* Search Bar */}
                <div className="relative flex-grow">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Buscar por RFC, Razón Social..."
                        className="input pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </div>

                {/* Actions - Right Aligned */}
                <div className="flex-shrink-0">
                    <button
                        onClick={handleCreate}
                        className="btn btn-primary h-11 w-11 p-0 flex items-center justify-center"
                        title="Nuevo Cliente"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="card flex-1 flex flex-col min-h-0" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container flex-1 overflow-auto">
                    <table className="data-table">
                        <thead className="data-table-thead">
                            <tr>
                                <th className="data-table-th">
                                    <div className="th-filter-container">
                                        <span>Razón Social / RFC</span>
                                        <input
                                            type="text"
                                            placeholder="Filtrar..."
                                            className="input-filter-header"
                                            value={filters.name}
                                            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                                        />
                                    </div>
                                </th>
                                <th className="data-table-th">
                                    <div className="th-filter-container">
                                        <span>Contacto</span>
                                        <input
                                            type="text"
                                            placeholder="Filtrar..."
                                            className="input-filter-header"
                                            disabled
                                        />
                                    </div>
                                </th>
                                <th className="data-table-th" style={{ textAlign: 'center' }}>Facturas</th>
                                <th className="data-table-th" style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers
                                .filter(c =>
                                    c.razonSocial.toLowerCase().includes(filters.name.toLowerCase()) ||
                                    c.rfc.toLowerCase().includes(filters.name.toLowerCase())
                                )
                                .map((cust) => (
                                    <tr key={cust.id} className="data-table-tr hover-row cursor-pointer group">
                                        <td className="data-table-td">
                                            <div style={{ fontWeight: 600 }}>
                                                {cust.razonSocial}
                                                {cust.isBranch && (
                                                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-purple-900 text-purple-200 border border-purple-700">
                                                        Sucursal
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{cust.rfc}</div>
                                        </td>
                                        <td className="data-table-td">
                                            {cust.email ? (
                                                <div className="flex items-center gap-2">
                                                    <Mail size={14} className="text-muted" />
                                                    <span>{cust.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted italic">Sin email</span>
                                            )}
                                        </td>
                                        <td className="data-table-td" style={{ textAlign: 'center' }}>
                                            <div className="flex items-center justify-center gap-1">
                                                <FileText size={14} className="text-muted" />
                                                <span style={{ fontWeight: 600 }}>{cust._count.invoices}</span>
                                            </div>
                                        </td>
                                        <td className="data-table-td" style={{ textAlign: 'right' }}>
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/clientes/${cust.id}`}
                                                    className="action-btn action-btn-view"
                                                    title="Ver Detalle"
                                                >
                                                    <Edit2 size={16} />
                                                </Link>
                                                {!cust.isBranch && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePromote(cust.id, cust.razonSocial);
                                                        }}
                                                        className="action-btn action-btn-view text-purple-400 hover:text-purple-300"
                                                        title="Convertir en Sucursal"
                                                    >
                                                        <Store size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(cust.id)}
                                                    className="action-btn action-btn-delete"
                                                    title="Eliminar"
                                                    disabled={isDeleting === cust.id}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            {customers.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                                        No se encontraron clientes
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CustomerFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                customerToEdit={customerToEdit}
            />
        </div>
    );
}
