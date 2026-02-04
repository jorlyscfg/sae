'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Wallet, AlertCircle, CheckCircle, RotateCcw, Filter } from 'lucide-react';
import ClientDate from '@/components/ClientDate';

interface ReceivablesClientProps {
    initialData: any[];
    summary: { totalPortfolio: number };
}

export default function ReceivablesClient({ initialData, summary }: ReceivablesClientProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('PENDIENTE');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.push(`/cobranza?customer=${searchTerm}&status=${statusFilter}`);
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        router.push(`/cobranza?customer=${searchTerm}&status=${status}`);
    };

    return (
        <div className="container">
            {/* Header & Stats */}
            <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card p-4 flex items-center gap-4 bg-slate-800 border-none justify-between">
                        <div>
                            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Cartera Total</p>
                            <h2 className="text-2xl font-bold text-white mt-1">
                                ${summary.totalPortfolio?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </h2>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Wallet size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 mb-4 items-stretch md:items-center justify-between">
                <form onSubmit={handleSearch} className="relative flex-grow max-w-lg">
                    <input
                        type="text"
                        placeholder="Buscar por Cliente..."
                        className="input pr-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </form>

                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <button
                        onClick={() => handleFilterChange('PENDIENTE')}
                        className={`btn btn-sm ${statusFilter === 'PENDIENTE' ? 'btn-primary' : 'btn-secondary text-slate-400'}`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => handleFilterChange('VENCIDO')}
                        className={`btn btn-sm ${statusFilter === 'VENCIDO' ? 'btn-primary bg-red-500/20 text-red-400 border-red-500/30' : 'btn-secondary text-slate-400'}`}
                    >
                        Vencidos
                    </button>
                    <button
                        onClick={() => handleFilterChange('PAGADO')}
                        className={`btn btn-sm ${statusFilter === 'PAGADO' ? 'btn-primary bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'btn-secondary text-slate-400'}`}
                    >
                        Pagados
                    </button>
                    <button
                        onClick={() => handleFilterChange('TODOS')}
                        className={`btn btn-sm ${statusFilter === 'TODOS' ? 'btn-secondary bg-slate-700 text-white' : 'btn-secondary text-slate-400'}`}
                    >
                        Todos
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden flex flex-col flex-1 min-h-[400px]">
                <div className="table-container overflow-auto">
                    <table className="data-table">
                        <thead className="data-table-thead">
                            <tr>
                                <th className="data-table-th w-32">Folio</th>
                                <th className="data-table-th">Cliente</th>
                                <th className="data-table-th w-32">Fecha Emisión</th>
                                <th className="data-table-th w-32">Vencimiento</th>
                                <th className="data-table-th text-right w-32">Importe</th>
                                <th className="data-table-th text-right w-32">Saldo</th>
                                <th className="data-table-th text-center w-24">Estado</th>
                                <th className="data-table-th text-right w-24">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {initialData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">
                                        No se encontraron cuentas por cobrar.
                                    </td>
                                </tr>
                            ) : (
                                initialData.map((item) => (
                                    <tr key={item.id} className="data-table-tr hover:bg-slate-800/30 transition-colors group">
                                        <td className="data-table-td font-mono text-xs text-slate-300">
                                            {item.folio}
                                        </td>
                                        <td className="data-table-td">
                                            <div className="text-sm font-medium text-slate-200">{item.customerName}</div>
                                            <div className="text-[10px] text-slate-500">{item.customerRfc}</div>
                                        </td>
                                        <td className="data-table-td text-slate-400 text-xs">
                                            <ClientDate date={item.fechaEmision} />
                                        </td>
                                        <td className="data-table-td text-slate-400 text-xs">
                                            <ClientDate date={item.fechaVencimiento} />
                                        </td>
                                        <td className="data-table-td text-right text-slate-400 font-medium">
                                            ${item.importeOriginal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="data-table-td text-right text-white font-bold">
                                            ${item.saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="data-table-td text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${item.estatus === 'PAGADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    item.estatus === 'VENCIDO' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                {item.estatus}
                                            </span>
                                        </td>
                                        <td className="data-table-td text-right">
                                            {item.saldo > 0.01 && (
                                                <button className="action-btn hover:text-emerald-400" title="Registrar Pago">
                                                    <RotateCcw size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
