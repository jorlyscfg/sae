'use client';

import { useState } from 'react';
import { Package, AlertTriangle, Edit2, Trash2, Plus, ArrowUp, ArrowDown, Search, ExternalLink, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import ProductFormModal from '@/components/ProductFormModal';
import TransferStockModal from '@/components/TransferStockModal';
import ClientDate from '@/components/ClientDate';
import { deleteProduct } from '@/app/actions/products';

interface Product {
    id: string;
    sku: string;
    description: string;
    line: string | null;
    stock: number | string;
    price: number | string;
    lastSale: string | null;
    lastPurchase: string | null;
    storeName?: string;
    storeId?: string;
}

interface InventoryClientProps {
    products: Product[];
    currentSort: string;
    currentOrder: 'asc' | 'desc';
    filters: {
        sku?: string;
        desc?: string;
        line?: string;
        store?: string;
    };
    searchQuery: string;
    storeName?: string;
    filteredStores?: { id: string; name: string }[];
}

export default function InventoryClient({ products, currentSort, currentOrder, filters, searchQuery, storeName, filteredStores = [] }: InventoryClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [productToTransfer, setProductToTransfer] = useState<Product | null>(null);
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

    const renderSortIcon = (field: string) => {
        if (currentSort !== field) return null;
        return currentOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    const handleEdit = (product: Product) => {
        setProductToEdit(product);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setProductToEdit(null);
        setIsModalOpen(true);
    };

    const handleTransfer = (product: Product) => {
        setProductToTransfer(product);
        setIsTransferModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        setIsDeleting(id);
        const result = await deleteProduct(id);
        setIsDeleting(null);
        if (!result.success) {
            alert(result.error);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar Optimized: Full Width Search + Action Button */}
            {/* Toolbar Optimized: Button (Left, Icon Only) + Full Width Search */}
            {/* Toolbar Optimized: Button (Left, Icon Only) + Full Width Search */}
            <div className="flex flex-row gap-3 mb-4 items-center">
                {/* Search Bar */}
                <div className="relative flex-grow">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Buscar por Clave, Descripción o Línea..."
                        className="input pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                    <button
                        onClick={handleCreate}
                        className="btn btn-primary h-11 w-11 p-0 flex items-center justify-center"
                        title="Nuevo Producto"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="card flex-1 flex flex-col min-h-0" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container flex-1 overflow-auto">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: '800px', fontFamily: 'var(--font-sans)' }}>
                        <thead className="sticky top-0 z-10" style={{ backgroundColor: '#1e293b', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, borderRight: '1px solid var(--border)' }}>
                                    <div onClick={() => handleSort('sku')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.25rem' }}>
                                        CLAVE {renderSortIcon('sku')}
                                    </div>
                                    <input
                                        type="text"
                                        defaultValue={filters.sku || ''}
                                        onChange={(e) => handleFilter('sku', e.target.value)}
                                        className="input-filter-header mt-1"
                                        placeholder="Filtro..."
                                    />
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, borderRight: '1px solid var(--border)' }}>
                                    TIENDA
                                    <select
                                        value={filters.store || ''}
                                        onChange={(e) => handleFilter('store', e.target.value)}
                                        className="input-filter-header mt-1 w-full"
                                    >
                                        <option value="">Todas</option>
                                        {filteredStores.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500, borderRight: '1px solid var(--border)', width: '40%' }}>
                                    <div onClick={() => handleSort('description')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.25rem' }}>
                                        DESCRIPCIÓN {renderSortIcon('description')}
                                    </div>
                                    <input
                                        type="text"
                                        defaultValue={filters.desc || ''}
                                        onChange={(e) => handleFilter('desc', e.target.value)}
                                        className="input-filter-header mt-1"
                                        placeholder="Buscar descripción..."
                                    />
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 500, borderRight: '1px solid var(--border)' }}>
                                    <div onClick={() => handleSort('line')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        LÍNEA {renderSortIcon('line')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('stock')} style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 500, borderRight: '1px solid var(--border)', cursor: 'pointer' }}>
                                    EXIST. {renderSortIcon('stock')}
                                </th>
                                <th onClick={() => handleSort('price')} style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 500, borderRight: '1px solid var(--border)', cursor: 'pointer' }}>
                                    PRECIO {renderSortIcon('price')}
                                </th>
                                <th onClick={() => handleSort('lastSale')} style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 500, borderRight: '1px solid var(--border)', cursor: 'pointer' }}>
                                    ULT. VENTA {renderSortIcon('lastSale')}
                                </th>
                                <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 500 }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((prod) => (
                                <tr key={prod.id} className="data-table-tr hover-row cursor-pointer group">
                                    <td className="data-table-td">
                                        <Link href={`/inventario/${prod.id}`} className="font-mono text-blue-400 hover:text-blue-300 font-semibold text-xs">
                                            {prod.sku}
                                        </Link>
                                    </td>
                                    <td className="data-table-td" style={{ color: '#94a3b8' }}>
                                        {prod.storeName || '-'}
                                    </td>
                                    <td className="data-table-td" style={{ color: '#e2e8f0' }}>
                                        {prod.description}
                                    </td>
                                    <td className="data-table-td" style={{ textAlign: 'center' }}>
                                        {prod.line && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 border border-slate-600">
                                                {prod.line}
                                            </span>
                                        )}
                                    </td>
                                    <td className="data-table-td" style={{ textAlign: 'right' }}>
                                        <span className={`font-mono font-medium ${Number(prod.stock) <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {Number(prod.stock).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                                        </span>
                                    </td>
                                    <td className="data-table-td" style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        ${Number(prod.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="data-table-td" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                                        {prod.lastSale ? new Date(prod.lastSale).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="data-table-td">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(prod)}
                                                className="action-btn action-btn-edit"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleTransfer(prod)}
                                                className="action-btn action-btn-view text-purple-400 hover:text-purple-300"
                                                title="Transferir a Sucursal"
                                            >
                                                <Truck size={16} />
                                            </button>
                                            <Link
                                                href={`/inventario/${prod.id}`}
                                                className="action-btn action-btn-view"
                                                title="Ver Detalle"
                                            >
                                                <ExternalLink size={16} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ProductFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                productToEdit={productToEdit}
            />

            <TransferStockModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                productToTransfer={productToTransfer}
                originName={productToTransfer?.storeName || storeName}
            />
        </div >
    );
}
