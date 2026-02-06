'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { getBranchCustomers, transferStock } from '@/app/actions/inventory-actions';
import { Truck, ArrowRight, AlertTriangle } from 'lucide-react';

interface Product {
    id: string;
    sku: string;
    description: string;
    stock: number | string;
}

interface TransferStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    productToTransfer?: Product | null;
}

interface Branch {
    id: string;
    razonSocial: string;
}

export default function TransferStockModal({ isOpen, onClose, productToTransfer }: TransferStockModalProps) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadBranches();
            setQuantity(1);
            setSelectedBranchId('');
            setError(null);
        }
    }, [isOpen]);

    const loadBranches = async () => {
        setIsLoading(true);
        try {
            const data = await getBranchCustomers();
            setBranches(data);
        } catch (err) {
            console.error(err);
            setError('Error al cargar sucursales');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productToTransfer || !selectedBranchId) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const items = [{
                sku: productToTransfer.sku,
                description: productToTransfer.description,
                quantity: Number(quantity),
                cost: 0 // Backend handles cost
            }];

            const result = await transferStock(selectedBranchId, items);

            if (result.success) {
                onClose();
            } else {
                setError(result.error as string);
            }
        } catch (err) {
            setError('Error al procesar el traspaso');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!productToTransfer) return null;

    const maxStock = Number(productToTransfer.stock);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Traspaso de Inventario"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-semibold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">ORIGEN</span>
                            <h4 className="text-base font-bold mt-1 text-slate-200">Tienda Central</h4>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-400">Stock Actual</div>
                            <div className="text-lg font-mono font-medium text-emerald-400">{maxStock}</div>
                        </div>
                    </div>

                    <div className="my-2 flex justify-center text-slate-500">
                        <ArrowRight size={20} />
                    </div>

                    <div>
                        <span className="text-xs font-semibold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">DESTINO</span>
                        <div className="mt-2">
                            <label className="block text-sm text-slate-400 mb-1">Sucursal Destino (Cliente)</label>
                            {isLoading ? (
                                <div className="text-sm text-muted animate-pulse">Cargando sucursales...</div>
                            ) : branches.length > 0 ? (
                                <select
                                    className="input w-full bg-slate-900 border-slate-600"
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.razonSocial}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-sm text-muted p-2 rounded border border-dashed border-slate-700">
                                    No hay clientes disponibles.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-400">
                        Producto a Transferir
                    </label>
                    <div className="text-sm p-3 bg-slate-800 rounded border border-slate-700 text-slate-300">
                        <span className="font-mono font-bold text-white mr-2">{productToTransfer.sku}</span>
                        {productToTransfer.description}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-400">
                        Cantidad a Enviar
                    </label>
                    <input
                        type="number"
                        className="input text-lg font-mono"
                        min="1"
                        max={maxStock}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        required
                    />
                    <div className="text-xs text-slate-500 text-right">
                        Máximo disponible: {maxStock}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary bg-purple-600 hover:bg-purple-700 border-purple-500"
                        disabled={isSubmitting || !selectedBranchId || quantity <= 0 || quantity > maxStock}
                    >
                        {isSubmitting ? 'Transfiriendo...' : (
                            <span className="flex items-center gap-2">
                                <Truck size={18} /> Confirmar Traspaso
                            </span>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
