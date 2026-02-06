'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, BarChart3, Settings, Package, Menu, X, Calendar, Folder } from 'lucide-react';

const menuGroups = [
    {
        title: null,
        items: [
            { name: 'Tablero', href: '/', icon: LayoutDashboard },
            { name: 'Facturas', href: '/facturas', icon: FileText },
            { name: 'Inventario', href: '/inventario', icon: Package },
        ]
    }
];

const secondaryItems = [
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Kardex', href: '/inventario?view=kardex', icon: BarChart3 },
    { name: 'Bitácora', href: '/bitacora', icon: Calendar },
    { name: 'Repositorio', href: '/repositorio', icon: Folder },
    { name: 'Reportes', href: '/reportes', icon: BarChart3 },
    { name: 'Configuración', href: '/configuracion', icon: Settings },
];

import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const toggleSidebar = () => setIsOpen(!isOpen);
    const closeSidebar = () => setIsOpen(false);

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                className="mobile-toggle"
                onClick={toggleSidebar}
                aria-label="Toggle Menu"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay for mobile */}
            <div
                className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
                onClick={closeSidebar}
            />

            {/* Sidebar Aside */}
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                Aspel Dany
                            </h1>
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>SAE Web Edition</p>
                        </div>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* Primary Items */}
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {menuGroups[0].items.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={closeSidebar}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${isActive
                                                ? 'bg-primary/10 text-primary font-semibold'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                                }`}
                                        >
                                            <item.icon size={18} />
                                            <span style={{ fontSize: '0.9rem' }}>{item.name}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Collapsible Section */}
                        <div className="mt-2">
                            <button
                                onClick={() => setIsMoreOpen(!isMoreOpen)}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-md transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <MoreHorizontal size={18} />
                                    <span style={{ fontSize: '0.9rem' }}>Más Opciones</span>
                                </div>
                                {isMoreOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>

                            {isMoreOpen && (
                                <ul style={{
                                    listStyle: 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem',
                                    marginTop: '0.25rem',
                                    paddingLeft: '0.5rem',
                                    borderLeft: '1px solid var(--border)',
                                    marginLeft: '1rem'
                                }}>
                                    {secondaryItems.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <li key={item.href}>
                                                <Link
                                                    href={item.href}
                                                    onClick={closeSidebar}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all ${isActive
                                                        ? 'text-primary font-medium'
                                                        : 'text-slate-500 hover:text-slate-300'
                                                        }`}
                                                >
                                                    <item.icon size={16} />
                                                    <span style={{ fontSize: '0.85rem' }}>{item.name}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </nav>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--foreground)' }}>Usuario Local</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Online</p>
                    </div>
                </div>
            </aside>
        </>
    );
}
