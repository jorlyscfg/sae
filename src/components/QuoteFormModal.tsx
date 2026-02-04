'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash, Search, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { createQuote } from '@/app/actions/quotes';
import { searchProducts } from '@/app/actions/products';

interface Customer {
    id: string;
    razonSocial: string;
    rfc: string;
}

interface QuoteItem {
    sku: string;
    descripcion: string;
    cantidad: number;
    valorUnitario: number;
    importe: number;
    unidad: string;
}

interface QuoteFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
}

export default function QuoteFormModal({ isOpen, onClose, customers }: QuoteFormModalProps) {
    const [customerId, setCustomerId] = useState('');
    const [vigencia, setVigencia] = useState('');
    const [items, setItems] = useState<QuoteItem[]>([]);

    // Product Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setCustomerId('');
            setItems([]);
            setSearchQuery('');
            setSearchResults([]);
            setError(null);
            // Default vigencia 15 days
            const d = new Date();
            d.setDate(d.getDate() + 15);
            setVigencia(d.toISOString().split('T')[0]);
        }
    }, [isOpen]);

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                const results = await searchProducts(searchQuery);
                setSearchResults(results);
                setIsSearching(false);
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAddItem = (product: any) => {
        const newItem: QuoteItem = {
            sku: product.sku,
            descripcion: product.description,
            cantidad: 1,
            valorUnitario: product.price,
            importe: product.price,
            unidad: 'PZA'
        };
        setItems([...items, newItem]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleUpdateItem = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'cantidad' || field === 'valorUnitario') {
            newItems[index].importe = newItems[index].cantidad * newItems[index].valorUnitario;
        }

        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const subtotal = items.reduce((sum, item) => sum + item.importe, 0);
    const total = subtotal * 1.16; // Assuming 16% VAT default for basic quote

    const handleSubmit = async () => {
        if (!customerId) {
            setError('Seleccione un cliente');
            return;
        }
        if (items.length === 0) {
            setError('Agregue al menos un producto');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const result = await createQuote({
            customerId,
            items: items,
            subtotal,
            total,
            vigencia: vigencia ? new Date(vigencia) : undefined
        });

        setIsSubmitting(false);

        if (result.success) {
            onClose();
        } else {
            setError('Error al crear la cotización. ' + JSON.stringify(result.error));
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nueva Cotización"
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cliente */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-400">
                            Cliente
                        </label>
                        <select
                            className="input"
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                        >
                            <option value="">Selecciona un cliente...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.razonSocial}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Vigencia */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-400">
                            Vigencia
                        </label>
                        <input
                            type="date"
                            className="input"
                            value={vigencia}
                            onChange={(e) => setVigencia(e.target.value)}
                        />
                    </div>
                </div>

                {/* Buscador */}
                <div className="relative space-y-2">
                    <label className="block text-sm font-medium text-slate-400">
                        Agregar Artículos
                    </label>
                    <div className="relative">
                        <input
                            className="input pr-10"
                            placeholder="Buscar producto por SKU o Nombre..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        {isSearching && (
                            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={18} />
                        )}
                    </div>
                    {searchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto p-1">
                            {searchResults.map(prod => (
                                <button
                                    key={prod.id}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-800 rounded-md transition-colors flex justify-between items-center group"
                                    onClick={() => handleAddItem(prod)}
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-200">{prod.description}</span>
                                        <span className="text-xs text-slate-500 font-mono group-hover:text-slate-400">{prod.sku}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold text-blue-400">${Number(prod.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lista (Data Table Standard) */}
                <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900/40">
                    <div className="overflow-auto max-h-[300px] custom-scrollbar">
                        <table className="data-table">
                            <thead className="data-table-thead sticky top-0 bg-slate-800 z-10">
                                <tr>
                                    <th className="data-table-th pl-4">Concepto</th>
                                    <th className="data-table-th w-24 text-center">Cant.</th>
                                    <th className="data-table-th w-32 text-right">Unitario</th>
                                    <th className="data-table-th w-32 text-right">Total</th>
                                    <th className="data-table-th w-12 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {items.map((item, idx) => (
                                    <tr key={idx} className="data-table-tr hover:bg-slate-800/30 transition-colors">
                                        <td className="data-table-td pl-4">
                                            <div className="font-medium text-slate-200">{item.descripcion}</div>
                                            <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                                        </td>
                                        <td className="data-table-td text-center">
                                            <input
                                                type="number"
                                                className="input h-8 px-1 text-center text-sm w-full bg-slate-900 border-slate-700"
                                                value={item.cantidad}
                                                onChange={(e) => handleUpdateItem(idx, 'cantidad', Number(e.target.value))}
                                                min="1"
                                            />
                                        </td>
                                        <td className="data-table-td text-right font-medium text-slate-300">
                                            ${item.valorUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="data-table-td text-right font-semibold text-slate-200">
                                            ${item.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="data-table-td text-center">
                                            <button
                                                onClick={() => handleRemoveItem(idx)}
                                                className="action-btn action-btn-delete h-8 w-8"
                                                title="Eliminar"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-500 italic">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-2">
                                                    <Search size={20} className="opacity-30" />
                                                </div>
                                                <p>Agrega productos usando el buscador superior</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Totales */}
                <div className="flex flex-col items-end gap-2 p-4 bg-slate-800/20 rounded-lg border border-slate-800/50">
                    <div className="flex justify-between w-full max-w-[240px] text-sm">
                        <span className="text-slate-400">Subtotal:</span>
                        <span className="font-medium text-slate-200">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-[240px] text-lg font-bold pt-2 mt-1 border-t border-slate-700">
                        <span className="text-slate-100">Total Est.:</span>
                        <span className="text-blue-400">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={`btn btn-primary min-w-[180px] gap-2 ${(isSubmitting || !customerId || items.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        disabled={isSubmitting || !customerId || items.length === 0}
                    >
                        {isSubmitting ? 'Guardando...' : (
                            <><Plus size={18} /> Crear Cotización</>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
