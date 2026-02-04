'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { changePassword } from '@/app/actions/auth';
import { User, Lock, Save, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ConfigurationPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        const formData = new FormData(e.currentTarget);
        const res = await changePassword(formData);

        setResult(res);
        setLoading(false);

        if (res.success) {
            (e.target as HTMLFormElement).reset();
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                    <User size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Configuración</h1>
                    <p className="text-slate-400">Administra tu perfil y seguridad del sistema</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sidebar Info */}
                <div className="md:col-span-1 space-y-6">
                    <div className="card p-6 border-white/5">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <User size={18} className="text-primary" /> Tu Perfil
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">Nombre</label>
                                <div className="font-medium text-slate-200">{session?.user?.name || 'N/A'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">Correo Electrónico</label>
                                <div className="font-medium text-slate-200">{session?.user?.email || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content: Security */}
                <div className="md:col-span-2 space-y-6">
                    <div className="card p-8 border-white/5">
                        <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                            <Lock size={20} className="text-primary" /> Seguridad y Contraseña
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Contraseña Actual</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    required
                                    className="input w-full bg-slate-900/50 border-white/10"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        required
                                        className="input w-full bg-slate-900/50 border-white/10"
                                        placeholder="Mínimo 8 caracteres"
                                        minLength={8}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Confirmar Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        required
                                        className="input w-full bg-slate-900/50 border-white/10"
                                        placeholder="Repita la contraseña"
                                        minLength={8}
                                    />
                                </div>
                            </div>

                            {result?.success && (
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
                                    <CheckCircle size={18} /> {result.success}
                                </div>
                            )}

                            {result?.error && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
                                    <AlertTriangle size={18} /> {result.error}
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary px-8 h-12 flex items-center gap-2 font-bold shadow-lg shadow-primary/20"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Actualizar Contraseña
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
