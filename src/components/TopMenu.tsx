'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LayoutDashboard, FileText, Users, BarChart3, Settings, Package, Calendar, Folder, LogOut, Wallet } from 'lucide-react';

const menuStructure = [
    { label: 'Tablero', href: '/', icon: LayoutDashboard, items: [] },
    { label: 'Facturas', href: '/facturas', icon: FileText, items: [] },
    { label: 'Inventario', href: '/inventario', icon: Package, items: [] },
];

const moreItems = [
    { name: 'Cotizaciones', href: '/cotizaciones', icon: FileText },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Cobranza', href: '/cobranza', icon: Wallet },
    { name: 'Kardex', href: '/inventario?view=kardex', icon: BarChart3 },
    { name: 'Bitácora', href: '/bitacora', icon: Calendar },
    { name: 'Repositorio', href: '/repositorio', icon: Folder },
    { name: 'Reportes', href: '/reportes', icon: BarChart3 },
    { name: 'Configuración', href: '/configuracion', icon: Settings },
];

import { MoreHorizontal, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function TopMenu() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsMoreOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (pathname === '/login') return null;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex flex-col bg-slate-900 border-b border-slate-800 shadow-xl transition-all duration-200">
            {/* Row 1: App Title & Global Actions (Ultra Compact 32px) */}
            <div className="h-8 flex items-center justify-between px-4 bg-slate-950 border-b border-slate-800 select-none">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-[9px] shadow-sm">
                        D
                    </div>
                    <div className="flex items-center gap-2">
                        <h1 className="font-bold text-xs text-slate-100 tracking-wide font-sans">ASPEL DANY</h1>
                        <span className="text-[10px] text-slate-600">|</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">SAE Web</span>
                    </div>
                </div>

                {/* Right: User & System Status */}
                <div className="flex items-center gap-4 text-[10px] font-medium tracking-wide">
                    <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 group cursor-default hover:border-slate-700 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-slate-400 group-hover:text-slate-200 transition-colors uppercase">EN LÍNEA</span>
                    </div>
                    <div className="h-3 w-px bg-slate-800"></div>
                    <div className="flex items-center gap-3 text-slate-400">
                        <Link href="/configuracion" className="flex items-center gap-2 hover:text-slate-100 transition-colors">
                            <Users size={12} />
                            <span className="uppercase">{session?.user?.name || 'USUARIO'}</span>
                        </Link>
                        <div className="h-3 w-px bg-slate-800"></div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="action-btn action-btn-delete"
                            title="Salir"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Row 2: Main Ribbon/Toolbar (Ultra Compact 48px) */}
            <nav className="h-[48px] flex items-center px-1 bg-slate-900 select-none relative z-40">
                <div className="flex items-center gap-0.5 h-full min-w-max">
                    {/* Primary Items */}
                    {menuStructure.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-item ${isActive ? 'active' : 'text-slate-400'}`}
                            >
                                <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                                <span className={`text-[10px] font-medium uppercase tracking-tight whitespace-nowrap mt-1 ${isActive ? 'font-semibold' : ''}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    <div className="h-6 w-px bg-slate-800 mx-0"></div>

                    {/* More Options Dropdown */}
                    <div className="relative h-full flex items-center" ref={dropdownRef}>
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setIsMoreOpen(!isMoreOpen)}
                            className={`nav-item ${isMoreOpen || moreItems.some(i => i.href === pathname) ? 'active' : 'text-slate-400'}`}
                        >
                            <ChevronDown size={18} strokeWidth={isMoreOpen || moreItems.some(i => i.href === pathname) ? 2 : 1.5} className="mb-0" />
                            <span className={`text-[10px] font-medium uppercase tracking-tight whitespace-nowrap mt-1 ${isMoreOpen || moreItems.some(i => i.href === pathname) ? 'font-semibold' : ''}`}>
                                Más
                            </span>
                            {moreItems.some(i => i.href === pathname) && (
                                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full shadow-sm ring-1 ring-slate-900" />
                            )}
                        </div>

                        {/* Dropdown Menu */}
                        {isMoreOpen && (
                            <div
                                className="absolute right-0 w-[220px] bg-slate-900 border border-slate-700 rounded-md shadow-2xl py-1 z-50 origin-top-right ring-1 ring-black/50"
                                style={{ top: '100%', marginTop: '4px' }}
                            >
                                <div className="grid grid-cols-1 gap-0.5 p-1">
                                    {moreItems.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsMoreOpen(false)}
                                                className={`
                                                    flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors
                                                    ${isActive
                                                        ? 'bg-blue-600/10 text-blue-400'
                                                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'}
                                                `}
                                            >
                                                <item.icon size={16} strokeWidth={1.5} />
                                                {item.name}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1"></div>
            </nav>
        </header>
    );
}
