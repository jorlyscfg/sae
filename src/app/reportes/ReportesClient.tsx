'use client';

import { useState, useEffect } from 'react';
import { BarChart3, FileText, Search, Printer, Download, Filter, FileCode } from 'lucide-react';
import { listDirectory } from '@/app/actions/explorer';

export default function ReportesClient() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadReports();
    }, []);

    async function loadReports() {
        setLoading(true);
        // Buscamos en la carpeta de reportes del sistema
        const data = await listDirectory('RutaReportes');
        setReports(data.files);
        setLoading(false);
    }

    const filteredReports = reports.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container">
            {/* Toolbar Optimized: Full Width Search + Action Button (Reportes) */}
            <div className="flex flex-col md:flex-row gap-3 mb-4 items-stretch md:items-center">
                {/* Search Bar */}
                <div className="relative flex-grow">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar reporte por nombre (ej: Factura, Inventario)..."
                        className="input pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', textAlign: 'center' }}>
                        <h3 style={{ color: '#6366f1', fontSize: '1.5rem', fontWeight: 700 }}>{reports.length}</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Plantillas Instaladas</p>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', textAlign: 'center' }}>
                        <h3 style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 700 }}>100%</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Compatibilidad QR2</p>
                    </div>
                </div>
            </div>

            <div className="card flex-1 flex flex-col min-h-0" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container flex-1 overflow-auto">
                    <table className="data-table">
                        <thead className="data-table-thead">
                            <tr>
                                <th className="data-table-th">
                                    <div className="th-filter-container">
                                        <span>Formato de Reporte</span>
                                        <input type="text" className="input-filter-header" placeholder="Filtrar..." disabled />
                                    </div>
                                </th>
                                <th className="data-table-th">
                                    <div className="th-filter-container">
                                        <span>Tipo de Archivo</span>
                                        <input type="text" className="input-filter-header" placeholder="Filtrar..." disabled />
                                    </div>
                                </th>
                                <th className="data-table-th">
                                    <div className="th-filter-container">
                                        <span>Modificado</span>
                                        <input type="text" className="input-filter-header" placeholder="Filtrar..." disabled />
                                    </div>
                                </th>
                                <th className="data-table-th" style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ padding: '4rem', textAlign: 'center' }}>Cargando formatos...</td></tr>
                            ) : filteredReports.map((report) => (
                                <tr key={report.name} className="data-table-tr hover-row cursor-pointer group">
                                    <td className="data-table-td">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500, color: '#f1f5f9' }}>
                                            <FileCode size={20} className="text-primary" />
                                            {report.name}
                                        </div>
                                    </td>
                                    <td className="data-table-td" style={{ color: '#94a3b8' }}>{report.name.split('.').pop()?.toUpperCase() || 'Formato'}</td>
                                    <td className="data-table-td" style={{ color: '#64748b' }}>
                                        {new Date(report.mtime).toLocaleDateString()}
                                    </td>
                                    <td className="data-table-td" style={{ textAlign: 'right' }}>
                                        <div className="flex items-center justify-end gap-1">
                                            <button className="action-btn action-btn-print" title="Imprimir">
                                                <Printer size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
