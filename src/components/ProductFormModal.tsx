'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { createProduct, updateProduct } from '@/app/actions/products';

interface Product {
    id?: string;
    sku: string;
    description: string;
    line?: string | null;
    stock: number | string; // Permit string for form input
    price: number | string;
}

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    productToEdit?: Product | null;
}

export default function ProductFormModal({ isOpen, onClose, productToEdit }: ProductFormModalProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'fiscal'>('general');
    const [formData, setFormData] = useState({
        sku: '',
        description: '',
        line: '',
        stock: 0,
        price: 0,
        // Fiscales
        claveSat: '',
        unidadSat: '',
        costoPromedio: 0,
        iva: 0.16,
        ieps: 0,
        retencionIva: 0,
        retencionIsr: 0,
    });
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (productToEdit) {
            setFormData({
                sku: productToEdit.sku,
                description: productToEdit.description,
                line: productToEdit.line || '',
                stock: Number(productToEdit.stock),
                price: Number(productToEdit.price),
                claveSat: (productToEdit as any).claveSat || '',
                unidadSat: (productToEdit as any).unidadSat || '',
                costoPromedio: Number((productToEdit as any).costoPromedio || 0),
                iva: Number((productToEdit as any).iva ?? 0.16),
                ieps: Number((productToEdit as any).ieps || 0),
                retencionIva: Number((productToEdit as any).retencionIva || 0),
                retencionIsr: Number((productToEdit as any).retencionIsr || 0),
            });
        } else {
            setFormData({
                sku: '', description: '', line: '', stock: 0, price: 0,
                claveSat: '', unidadSat: '', costoPromedio: 0,
                iva: 0.16, ieps: 0, retencionIva: 0, retencionIsr: 0
            });
        }
        setErrors({});
        setActiveTab('general');
    }, [productToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const payload = {
            ...formData,
            line: formData.line || undefined,
            stock: Number(formData.stock),
            price: Number(formData.price),
            costoPromedio: Number(formData.costoPromedio),
            iva: Number(formData.iva),
            ieps: Number(formData.ieps),
            retencionIva: Number(formData.retencionIva),
            retencionIsr: Number(formData.retencionIsr),
        };

        let result: { success: boolean; error?: Record<string, string[]> | string };
        if (productToEdit?.id) {
            result = await updateProduct(productToEdit.id, payload);
        } else {
            result = await createProduct(payload);
        }

        setIsSubmitting(false);

        if (result.success) {
            onClose();
        } else {
            if (result.error && typeof result.error === 'object') {
                setErrors(result.error as Record<string, string[]>);
            } else if (typeof result.error === 'string') {
                setErrors({ server: [result.error] });
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
        >
            {/* Tabs (Global Styles) */}
            <div className="tab-group mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`tab-item ${activeTab === 'general' ? 'tab-active' : ''}`}
                >
                    General
                </button>
                <div className="tab-separator" />
                <button
                    type="button"
                    onClick={() => setActiveTab('fiscal')}
                    className={`tab-item ${activeTab === 'fiscal' ? 'tab-active' : ''}`}
                >
                    Fiscales e Impuestos
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {errors.server && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {errors.server[0]}
                    </div>
                )}

                <div className={activeTab === 'general' ? 'block space-y-6' : 'hidden'}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">
                                SKU / Clave
                            </label>
                            <input
                                type="text"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                className="input font-mono tracking-wide"
                                placeholder="PRODUCTO-001"
                            />
                            {errors.sku && <p className="text-red-400 text-xs mt-1.5">{errors.sku[0]}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">
                                Línea <span className="text-slate-500 text-xs font-normal">(Opcional)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.line || ''}
                                onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                                className="input"
                                placeholder="Ej. HERRAMIENTAS"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-400">
                            Descripción del Producto
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input resize-none"
                            rows={3}
                            placeholder="Escribe una descripción detallada..."
                        />
                        {errors.description && <p className="text-red-400 text-xs mt-1.5">{errors.description[0]}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">
                                Existencia (Stock)
                            </label>
                            <input
                                type="number"
                                step="0.0001"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                                className="input"
                            />
                            {errors.stock && <p className="text-red-400 text-xs mt-1.5">{errors.stock[0]}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">
                                Precio Unitario
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                    className="input pl-9"
                                />
                            </div>
                            {errors.price && <p className="text-red-400 text-xs mt-1.5">{errors.price[0]}</p>}
                        </div>
                    </div>
                </div>

                <div className={activeTab === 'fiscal' ? 'block space-y-6' : 'hidden'}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">
                                Clave Producto/Servicio (SAT)
                            </label>
                            <input
                                type="text"
                                value={formData.claveSat || ''}
                                onChange={(e) => setFormData({ ...formData, claveSat: e.target.value })}
                                className="input"
                                placeholder="Ej. 43211503"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">
                                Clave Unidad (SAT)
                            </label>
                            <input
                                type="text"
                                value={formData.unidadSat || ''}
                                onChange={(e) => setFormData({ ...formData, unidadSat: e.target.value })}
                                className="input"
                                placeholder="Ej. H87"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">IVA</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.iva}
                                onChange={(e) => setFormData({ ...formData, iva: Number(e.target.value) })}
                                className="input text-center"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">IEPS</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.ieps}
                                onChange={(e) => setFormData({ ...formData, ieps: Number(e.target.value) })}
                                className="input text-center"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Ret. IVA</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.retencionIva}
                                onChange={(e) => setFormData({ ...formData, retencionIva: Number(e.target.value) })}
                                className="input text-center"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Ret. ISR</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.retencionIsr}
                                onChange={(e) => setFormData({ ...formData, retencionIsr: Number(e.target.value) })}
                                className="input text-center"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-400">
                            Costo Promedio (Informativo)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.costoPromedio}
                                onChange={(e) => setFormData({ ...formData, costoPromedio: Number(e.target.value) })}
                                className="input pl-9"
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            Usado para cálculo de utilidad. Se actualiza con entradas de inventario.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-slate-700">
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
                        className={`btn btn-primary min-w-[120px] transition-opacity ${(isSubmitting || !formData.sku.trim() || !formData.description.trim() || Number(formData.price) <= 0)
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                            }`}
                        disabled={isSubmitting || !formData.sku.trim() || !formData.description.trim() || Number(formData.price) <= 0}
                    >
                        {isSubmitting ? 'Guardando...' : (productToEdit ? 'Actualizar' : 'Crear Producto')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
