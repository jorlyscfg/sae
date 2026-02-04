'use client';

import { useState, useEffect } from 'react';
import { FileText, Search, Database, ExternalLink } from 'lucide-react';
import { getAssociatedDocuments } from '@/app/actions/repositorio';
import ClientDate from '@/components/ClientDate';

export default function RepositorioClient() {
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadDocs();
    }, []);

    async function loadDocs() {
        setLoading(true);
        const data = await getAssociatedDocuments();
        setDocs(data);
        setLoading(false);
    }

    const filteredDocs = docs.filter(doc =>
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.nombreReceptor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.uuid?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container">
            {/* Toolbar Optimized: Full Width Search + Action Button (Repositorio) */}
            <div className="flex flex-col md:flex-row gap-3 mb-4 items-stretch md:items-center">
                {/* Search Bar */}
                <div className="relative flex-grow">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por UUID, cliente o RFC..."
                        className="input pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </div>

                {/* Info Badge (kept as action-like element but styled consistently) */}
                <div className="flex-shrink-0 flex items-center h-full">
                    <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '0 1.25rem', height: '100%', minHeight: '46px', borderRadius: '0.5rem', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Database size={20} color="#6366f1" />
                        <span style={{ color: '#f8fafc', fontWeight: 600, whiteSpace: 'nowrap' }}>{docs.length} Docs</span>
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
                                        <span>Fecha CFDI</span>
                                        <input type="text" className="input-filter-header" placeholder="Filtrar..." disabled />
                                    </div>
                                </th>
                                <th className="data-table-th">
                                    <div className="th-filter-container">
                                        <span>Folio / UUID</span>
                                        <input type="text" className="input-filter-header" placeholder="Filtrar..." disabled />
                                    </div>
                                </th>
                                <th className="data-table-th">
                                    <div className="th-filter-container">
                                        <span>Emisor</span>
                                        <input type="text" className="input-filter-header" placeholder="Filtrar..." disabled />
                                    </div>
                                </th>
                                <th className="data-table-th">
                                    <div className="th-filter-container">
                                        <span>Receptor</span>
                                        <input type="text" className="input-filter-header" placeholder="Filtrar..." disabled />
                                    </div>
                                </th>
                                <th className="data-table-th">
                                    <div className="th-filter-container">
                                        <span>Total</span>
                                        <input type="text" className="input-filter-header" placeholder="Filtrar..." disabled />
                                    </div>
                                </th>
                                <th className="data-table-th" style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ padding: '4rem', textAlign: 'center' }}>Cargando documentos...</td></tr>
                            ) : filteredDocs.length > 0 ? (
                                filteredDocs.map((doc) => (
                                    <tr key={doc.id} className="data-table-tr hover-row cursor-pointer group">
                                        <td className="data-table-td">
                                            <ClientDate date={doc.fecha} />
                                        </td>
                                        <td className="data-table-td">
                                            <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{doc.serie}{doc.folio}</div>
                                            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{doc.uuid}</div>
                                        </td>
                                        <td className="data-table-td" style={{ color: '#94a3b8' }}>{doc.nombreEmisor}</td>
                                        <td className="data-table-td" style={{ color: '#e2e8f0' }}>{doc.nombreReceptor}</td>
                                        <td className="data-table-td" style={{ color: '#10b981', fontWeight: 600 }}>
                                            ${Number(doc.total).toFixed(2)}
                                        </td>
                                        <td className="data-table-td" style={{ textAlign: 'right' }}>
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="action-btn action-btn-view" title="Ver Documento">
                                                    <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>No se encontraron documentos</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
