'use client';

import { useState, useEffect } from 'react';
import { getCustomerReceivables, registerPayment } from '@/app/actions/receivables';
import { CheckCircle, AlertCircle, Clock, DollarSign, Wallet } from 'lucide-react';

export default function ClientStatement({ customerId }: { customerId: string }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [summary, setSummary] = useState({ totalDebt: 0, overdueDebt: 0 });
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Payment Form States
    const [selectedReceivable, setSelectedReceivable] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentConcept, setPaymentConcept] = useState('');

    useEffect(() => {
        loadData();
    }, [customerId]);

    async function loadData() {
        setLoading(true);
        const res = await getCustomerReceivables(customerId);
        if (res.success && res.summary) {
            setData(res.data);
            setSummary(res.summary);
        }
        setLoading(false);
    }

    async function handlePaymentSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedReceivable || !paymentAmount) return;

        const res = await registerPayment(
            selectedReceivable.id,
            parseFloat(paymentAmount),
            paymentConcept || 'Abono a Cuenta',
            '03' // Transferencia por defecto por ahora
        );

        if (res.success) {
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentConcept('');
            setSelectedReceivable(null);
            loadData(); // Reflex data
        } else {
            alert('Error al registrar pago');
        }
    }

    const openPaymentModal = (item: any) => {
        setSelectedReceivable(item);
        setPaymentAmount(item.saldo); // Sugerir saldo total
        setShowPaymentModal(true);
    };

    if (loading) return <div className="p-4 text-center text-muted">Cargando Estado de Cuenta...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-card p-4 flex items-center gap-4 border-l-4 border-l-primary">
                    <div className="p-3 rounded-full bg-primary-soft text-primary">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-muted">Saldo Total</p>
                        <h3 className="text-xl font-bold">${summary.totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="card bg-card p-4 flex items-center gap-4 border-l-4 border-l-[#ef4444]">
                    <div className="p-3 rounded-full bg-red-500/10 text-red-500">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-muted">Vencido</p>
                        <h3 className="text-xl font-bold">${summary.overdueDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="card bg-card p-4 flex items-center gap-4 border-l-4 border-l-success">
                    <div className="p-3 rounded-full bg-success/10 text-success">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-muted">Estatus</p>
                        <h3 className="text-lg font-semibold text-success">Activo</h3>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="card bg-card overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="font-semibold flex items-center gap-2">
                        <DollarSign size={18} className="text-primary" /> Movimientos y Saldos
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead className="data-table-thead">
                            <tr>
                                <th className="data-table-th">Folio</th>
                                <th className="data-table-th">Emisión</th>
                                <th className="data-table-th">Vencimiento</th>
                                <th className="data-table-th" style={{ textAlign: 'right' }}>Importe</th>
                                <th className="data-table-th" style={{ textAlign: 'right' }}>Saldo</th>
                                <th className="data-table-th" style={{ textAlign: 'center' }}>Estatus</th>
                                <th className="data-table-th" style={{ textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item) => (
                                <tr key={item.id} className="data-table-tr">
                                    <td className="data-table-td font-medium">{item.folio}</td>
                                    <td className="data-table-td" style={{ color: '#94a3b8' }}>{new Date(item.fechaEmision).toLocaleDateString()}</td>
                                    <td className="data-table-td" style={{ color: '#94a3b8' }}>{new Date(item.fechaVencimiento).toLocaleDateString()}</td>
                                    <td className="data-table-td" style={{ textAlign: 'right', color: '#94a3b8' }}>${Number(item.importeOriginal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                    <td className="data-table-td" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        ${Number(item.saldo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="data-table-td" style={{ textAlign: 'center' }}>
                                        <span className={`badge ${item.estatus === 'PAGADO' ? 'badge-success' : item.estatus === 'VENCIDO' ? 'badge-danger' : 'badge-warning'}`}>
                                            {item.estatus}
                                        </span>
                                    </td>
                                    <td className="data-table-td" style={{ textAlign: 'center' }}>
                                        {item.saldo > 0 && (
                                            <button
                                                onClick={() => openPaymentModal(item)}
                                                className="btn btn-primary btn-sm text-[10px] uppercase tracking-wider"
                                            >
                                                Abonar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted">
                                        No hay movimientos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedReceivable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="card w-full max-w-md bg-card shadow-xl animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border">
                            <h3 className="text-lg font-bold">Registrar Abono</h3>
                            <p className="text-sm text-muted">Folio: {selectedReceivable.folio}</p>
                        </div>
                        <form onSubmit={handlePaymentSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="text-sm font-medium">Importe a Pagar</label>
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-2.5 text-muted">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        max={selectedReceivable.saldo}
                                        className="input pl-7 w-full"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-muted mt-1">Saldo actual: ${Number(selectedReceivable.saldo).toLocaleString('es-MX')}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Concepto / Referencia</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ej: Transferencia SPEI, Cheque..."
                                    value={paymentConcept}
                                    onChange={(e) => setPaymentConcept(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Registrar Pago
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
