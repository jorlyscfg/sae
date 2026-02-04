'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, BarChart3, Settings, Package, Menu, X, Calendar, Folder } from 'lucide-react';

const menuGroups = [
    {
        title: null, // Grupo principal sin título
        items: [
            { name: 'Tablero de Control', href: '/', icon: LayoutDashboard },
        ]
    },
    {
        title: 'MÓDULO DE VENTAS',
        items: [
            { name: 'Facturas y Notas', href: '/facturas', icon: FileText },
            { name: 'Clientes', href: '/clientes', icon: Users },
        ]
    },
    {
        title: 'INVENTARIOS',
        items: [
            { name: 'Productos y Servicios', href: '/inventario', icon: Package },
            { name: 'Kardex al día', href: '/inventario?view=kardex', icon: BarChart3 }, // Placeholder visual
        ]
    },
    {
        title: 'UTILERÍAS',
        items: [
            { name: 'Bitácora', href: '/bitacora', icon: Calendar },
            { name: 'Repositorio', href: '/repositorio', icon: Folder },
            { name: 'Reportes', href: '/reportes', icon: BarChart3 },
            { name: 'Configuración', href: '/configuracion', icon: Settings },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {menuGroups.map((group, idx) => (
                            <div key={idx}>
                                {group.title && (
                                    <h3 style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold',
                                        color: 'var(--muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '0.5rem',
                                        paddingLeft: '0.5rem'
                                    }}>
                                        {group.title}
                                    </h3>
                                )}
                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <li key={item.href}>
                                                <Link
                                                    href={item.href}
                                                    onClick={closeSidebar}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        padding: '0.6rem 0.8rem', // Más compacto tipo SAE
                                                        borderRadius: '0.375rem',
                                                        backgroundColor: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                                        color: isActive ? 'var(--primary)' : 'var(--muted)', // Texto más claro para no activos
                                                        fontWeight: isActive ? 600 : 400,
                                                        fontSize: '0.85rem', // Letra un poco más pequeña
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    <item.icon size={18} />
                                                    {item.name}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
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
