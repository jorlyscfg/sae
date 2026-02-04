'use client';

import { useState, useEffect } from 'react';
import { FileText, Search, Clock, User, ArrowLeft, Download, Filter } from 'lucide-react';
import { getBitacoraFiles, readBitacoraContent } from '@/app/actions/bitacora';
import ClientDate from '@/components/ClientDate';

export default function BitacoraClient() {
    const [files, setFiles] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [content, setContent] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadFiles();
    }, []);

    async function loadFiles() {
        setLoading(true);
        const data = await getBitacoraFiles();
        setFiles(data);
        setLoading(false);
    }

    async function handleOpenFile(filename: string) {
        setLoading(true);
        setSelectedFile(filename);
        const data = await readBitacoraContent(filename);
        setContent(data);
        setLoading(false);
    }

    const filteredFiles = files.filter(f =>
        f.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.date.includes(searchTerm)
    );

    const filteredContent = content?.filter(item =>
        item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedFile) {
        return (
            <div className="container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <button
                        onClick={() => { setSelectedFile(null); setContent(null); setSearchTerm(''); }}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem', borderRadius: '50%' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
                            {selectedFile}
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Visualizando contenido de la bitácora original</p>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={18} />
                        <input
                            type="text"
                            placeholder="Buscar dentro de este log (mensajes, productos, folios...)"
                            className="input"
                            style={{ paddingLeft: '3rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="card flex-1 flex flex-col min-h-0" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-container flex-1 overflow-auto">
                        <table className="data-table">
                            <thead className="data-table-thead">
                                <tr>
                                    <th className="data-table-th" style={{ width: '200px' }}>
                                        <div className="th-filter-container">
                                            <span>Timestamp Original</span>
                                            <input type="text" className="input-filter-header" placeholder="Filtrar..." disabled />
                                        </div>
                                    </th>
                                    <th className="data-table-th" style={{ width: '150px' }}>
                                        <div className="th-filter-container">
                                            <span>Usuario</span>
                                            <input type="text" className="input-filter-header" placeholder="Filtrar..." disabled />
                                        </div>
                                    </th>
                                    <th className="data-table-th">
                                        <div className="th-filter-container">
                                            <span>Mensaje del Sistema</span>
                                            <input type="text" className="input-filter-header" placeholder="Filtrar..." disabled />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={3} style={{ padding: '4rem', textAlign: 'center' }}>Cargando contenido...</td></tr>
                                ) : filteredContent?.map((item) => (
                                    <tr key={item.id} className="data-table-tr hover-row group">
                                        <td className="data-table-td" style={{ color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Clock size={14} className="text-muted" />
                                                {item.timestamp}
                                            </div>
                                        </td>
                                        <td className="data-table-td">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                                                <User size={14} />
                                                {item.user}
                                            </div>
                                        </td>
                                        <td className="data-table-td" style={{ color: '#f1f5f9' }}>
                                            {item.message}
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

    return (
        <div className="container">
            {/* Toolbar Optimized: Full Width Search + Action Button (Bitacora) */}
            <div className="flex flex-col md:flex-row gap-3 mb-4 items-stretch md:items-center">
                {/* Search Bar */}
                <div className="relative flex-grow">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Filtrar archivos por nombre o fecha (ej: 2025)..."
                        className="input pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {loading ? (
                    <p style={{ color: '#94a3b8' }}>Buscando archivos...</p>
                ) : filteredFiles.map((file) => (
                    <div
                        key={file.filename}
                        className="card"
                        style={{ padding: '1.5rem', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid #334155' }}
                        onClick={() => handleOpenFile(file.filename)}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#6366f1'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = '#334155'}
                    >
                        <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                                <FileText size={24} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                                    {file.filename}
                                </h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                    <span style={{ fontSize: '0.875rem', color: '#6366f1', fontWeight: 500 }}>
                                        Abrir Log →
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
