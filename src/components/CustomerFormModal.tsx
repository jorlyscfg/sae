'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { createCustomer, updateCustomer } from '@/app/actions/customers';

interface Customer {
    id?: string;
    rfc: string;
    razonSocial: string;
    email?: string | null;
}

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerToEdit?: Customer | null;
}

export default function CustomerFormModal({ isOpen, onClose, customerToEdit }: CustomerFormModalProps) {
    const [formData, setFormData] = useState<Customer>({
        rfc: '',
        razonSocial: '',
        email: '',
    });
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (customerToEdit) {
            setFormData({
                rfc: customerToEdit.rfc,
                razonSocial: customerToEdit.razonSocial,
                email: customerToEdit.email || '',
            });
        } else {
            setFormData({ rfc: '', razonSocial: '', email: '' });
        }
        setErrors({});
    }, [customerToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const payload = {
            rfc: formData.rfc,
            razonSocial: formData.razonSocial,
            email: formData.email || undefined,
        };

        let result: { success: boolean; error?: Record<string, string[]> | string };
        if (customerToEdit?.id) {
            result = await updateCustomer(customerToEdit.id, payload);
        } else {
            result = await createCustomer(payload);
        }

        setIsSubmitting(false);

        if (result.success) {
            onClose();
        } else {
            // Fix: Ensure errors are treated as Record<string, string[]>
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
            title={customerToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {errors.server && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '0.5rem',
                        color: '#f87171',
                        fontSize: '0.875rem'
                    }}>
                        {errors.server[0]}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.5rem' }}>
                            RFC
                        </label>
                        <input
                            type="text"
                            value={formData.rfc}
                            onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                            className="input"
                            placeholder="XAXX010101000"
                            maxLength={13}
                            style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                        />
                        {errors.rfc && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.375rem' }}>{errors.rfc[0]}</p>}
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.5rem' }}>
                            Razón Social
                        </label>
                        <input
                            type="text"
                            value={formData.razonSocial}
                            onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                            className="input"
                            placeholder="Nombre oficial de la empresa o persona"
                        />
                        {errors.razonSocial && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.375rem' }}>{errors.razonSocial[0]}</p>}
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.5rem' }}>
                            Correo Electrónico <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 400 }}>(Opcional)</span>
                        </label>
                        <input
                            type="email"
                            value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="input"
                            placeholder="ejemplo@correo.com"
                        />
                        {errors.email && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.375rem' }}>{errors.email[0]}</p>}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #334155' }}>
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
                        className="btn btn-primary"
                        disabled={isSubmitting || !formData.rfc.trim() || !formData.razonSocial.trim()}
                        style={{
                            minWidth: '120px',
                            opacity: (isSubmitting || !formData.rfc.trim() || !formData.razonSocial.trim()) ? 0.5 : 1,
                            cursor: (isSubmitting || !formData.rfc.trim() || !formData.razonSocial.trim()) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isSubmitting ? 'Guardando...' : (customerToEdit ? 'Actualizar' : 'Crear Cliente')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
