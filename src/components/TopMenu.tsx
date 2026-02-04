'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LayoutDashboard, FileText, Users, BarChart3, Settings, Package, Calendar, Folder, LogOut, Wallet } from 'lucide-react';

const menuStructure = [
    {
        label: 'Tablero',
        href: '/',
        icon: LayoutDashboard,
        items: []
    },
    {
        label: 'Ventas',
        icon: FileText,
        items: [
            { name: 'Facturas', href: '/facturas', icon: FileText },
            { name: 'Cotizaciones', href: '/cotizaciones', icon: FileText },
            { name: 'Clientes', href: '/clientes', icon: Users },
            { name: 'Cobranza', href: '/cobranza', icon: Wallet },
        ]
    },
    {
        label: 'Inventarios',
        icon: Package,
        items: [
            { name: 'Inventario', href: '/inventario', icon: Package },
            { name: 'Kardex', href: '/inventario?view=kardex', icon: BarChart3 },
        ]
    },
    {
        label: 'Utilerías',
        icon: Settings,
        items: [
            { name: 'Bitácora', href: '/bitacora', icon: Calendar },
            { name: 'Repositorio', href: '/repositorio', icon: Folder },
            { name: 'Reportes', href: '/reportes', icon: BarChart3 },
            { name: 'Configuración', href: '/configuracion', icon: Settings },
        ]
    }
];

export default function TopMenu() {
    const pathname = usePathname();
    const { data: session } = useSession();

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
            <nav className="h-[48px] flex items-center px-1 bg-slate-900 overflow-x-auto no-scrollbar select-none">
                <div className="flex items-center gap-0.5 h-full min-w-max">
                    {menuStructure.map((group, idx) => {
                        const isMainActive = group.href === pathname || group.items.some(i => i.href === pathname);

                        return (
                            <div key={idx} className="flex items-center h-full py-1">
                                {/* Separator */}
                                {idx > 0 && <div className="h-5 w-px bg-slate-800 mx-1" />}

                                {/* If it has no items, it's a direct button */}
                                {group.items.length === 0 ? (
                                    <Link
                                        href={group.href || '#'}
                                        className={`
                                            flex flex-col items-center justify-center h-full min-w-[56px] px-1 rounded-[3px] transition-all duration-150 group relative
                                            ${isMainActive
                                                ? 'bg-blue-600 shadow-sm text-white ring-1 ring-blue-500/50'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 active:scale-95'}
                                        `}
                                    >
                                        <group.icon size={16} strokeWidth={isMainActive ? 2 : 1.5} />
                                        <span className={`text-[10px] font-medium uppercase tracking-tight whitespace-nowrap mt-0.5 ${isMainActive ? 'font-semibold' : ''}`}>{group.label}</span>
                                    </Link>
                                ) : (
                                    <div className="flex items-center gap-0.5">
                                        {group.items.map((subItem) => {
                                            const isActive = pathname === subItem.href || (pathname.startsWith(subItem.href) && subItem.href !== '/');
                                            return (
                                                <Link
                                                    key={subItem.href}
                                                    href={subItem.href}
                                                    className={`
                                                        flex flex-col items-center justify-center h-full min-w-[64px] px-1 rounded-[3px] transition-all duration-150 relative group overflow-hidden
                                                        ${isActive
                                                            ? 'bg-blue-600 shadow-md text-white ring-1 ring-blue-500/50 transform scale-[1.02]'
                                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 active:scale-95'}
                                                    `}
                                                    title={subItem.name}
                                                >
                                                    {/* Shine Effect on Active */}
                                                    {isActive && <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50 pointer-events-none"></div>}

                                                    <subItem.icon size={16} strokeWidth={isActive ? 2 : 1.5} className="relative z-10" />
                                                    <span className={`text-[9px] font-medium leading-none text-center whitespace-nowrap relative z-10 mt-0.5 ${isActive ? 'font-semibold' : ''}`}>
                                                        {subItem.name}
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex-1"></div>
            </nav>
        </header>
    );
}
