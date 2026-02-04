'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash, Search, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { createInvoice } from '@/app/actions/invoices';
import { searchProducts } from '@/app/actions/products';

interface Customer {
    id: string;
    razonSocial: string;
    rfc: string;
}

interface InvoiceItem {
    sku: string;
    descripcion: string;
    cantidad: number;
    valorUnitario: number;
    importe: number;
    unidad: string;
}

interface InvoiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
}

export default function InvoiceFormModal({ isOpen, onClose, customers }: InvoiceFormModalProps) {
    const [customerId, setCustomerId] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([]);

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
        const newItem: InvoiceItem = {
            sku: product.sku,
            descripcion: product.description,
            cantidad: 1,
            valorUnitario: product.price,
            importe: product.price, // 1 * price
            unidad: 'PZA'
        };
        setItems([...items, newItem]);
        setSearchQuery(''); // Clear search
        setSearchResults([]);
    };

    const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Recalculate Importe if qty or price changes
        if (field === 'cantidad' || field === 'valorUnitario') {
            newItems[index].importe = newItems[index].cantidad * newItems[index].valorUnitario;
        }

        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const subtotal = items.reduce((sum, item) => sum + item.importe, 0);
    const total = subtotal * 1.16; // Assuming 16% VAT hardcoded for now or simple sum

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

        const result = await createInvoice({
            customerId,
            items: items,
            subtotal,
            total
        });

        setIsSubmitting(false);

        if (result.success) {
            onClose();
        } else {
            setError('Error al crear la factura. ' + JSON.stringify(result.error));
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nueva Factura"
        >
            <div className="space-y-6">
                {/* 1. Cliente */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-400">
                        Cliente
                    </label>
                    <select
                        className="input"
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                    >
                        <option value="">Selecciona un cliente de la lista...</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.razonSocial} ({c.rfc})
                            </option>
                        ))}
                    </select>
                </div>

                {/* 2. Buscador de Productos */}
                <div className="relative space-y-2">
                    <label className="block text-sm font-medium text-slate-400">
                        Buscador de Artículos
                    </label>
                    <div className="relative">
                        <input
                            className="input pr-10"
                            placeholder="Ingresa SKU o Nombre para buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        {isSearching && (
                            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={18} />
                        )}
                    </div>

                    {/* Resultados Search */}
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
                                        <div className="text-[10px] text-slate-600">Stock: {Number(prod.stock).toFixed(0)}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Lista de Partidas */}
                <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900/40">
                    <div className="overflow-auto max-h-[300px]">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-slate-800/50 text-left sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="p-3 font-medium text-slate-400">Concepto</th>
                                    <th className="p-3 font-medium text-slate-400 w-20 text-center">Cant.</th>
                                    <th className="p-3 font-medium text-slate-400 w-24 text-right">Unitario</th>
                                    <th className="p-3 font-medium text-slate-400 w-24 text-right">Total</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {items.map((item, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-800/30 transition-colors">
                                        <td className="p-3">
                                            <div className="font-medium text-slate-200">{item.descripcion}</div>
                                            <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                className="input h-7 px-1 text-center text-sm"
                                                value={item.cantidad}
                                                onChange={(e) => handleUpdateItem(idx, 'cantidad', Number(e.target.value))}
                                                min="1"
                                            />
                                        </td>
                                        <td className="p-3 text-right font-medium text-slate-300">
                                            ${item.valorUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 text-right font-semibold text-slate-200">
                                            ${item.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => handleRemoveItem(idx)}
                                                className="text-red-400/70 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded transition-colors"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                            No hay productos agregados. Usa el buscador superior.
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
                        <span className="text-slate-100">Total:</span>
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
                        {isSubmitting ? 'Procesando...' : (
                            <><Plus size={18} /> Generar Factura</>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
