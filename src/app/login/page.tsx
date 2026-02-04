'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, LogIn } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setShake(false);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Acceso denegado. El correo o la contraseña son incorrectos.');
                setShake(true);
                // Reset shake after animation completes
                setTimeout(() => setShake(false), 500);
            } else {
                router.push('/');
                router.refresh();
            }
        } catch (err) {
            setError('Error de conexión. Intente de nuevo más tarde.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-10 px-4" style={{ minHeight: 'calc(100vh - 120px)' }}>
            <div className={`max-w-sm w-full mx-auto ${shake ? 'animate-shake' : ''}`}>
                {/* Logo/Icon Header */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-white mb-4 shadow-lg">
                        <LogIn size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Iniciar Sesión</h1>
                    <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-medium opacity-80">Administrador SAE</p>
                </div>

                <div className="card shadow-2xl border-white/5 transition-all duration-300"
                    style={error ? { borderColor: 'rgba(239, 68, 68, 0.3)', boxShadow: '0 10px 40px -10px rgba(239, 68, 68, 0.15)' } : {}}>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-300 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-400' : 'text-slate-500'}`} size={18} />
                                <input
                                    type="email"
                                    required
                                    className={`input pl-35px h-12 transition-all ${error ? 'border-red-500/50 focus:border-red-500 bg-red-500/5' : ''}`}
                                    placeholder="usuario@ejemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-300 ml-1">Contraseña</label>
                            <div className="relative">
                                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-400' : 'text-slate-500'}`} size={18} />
                                <input
                                    type="password"
                                    required
                                    className={`input pl-35px h-12 transition-all ${error ? 'border-red-500/50 focus:border-red-500 bg-red-500/5' : ''}`}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-100 text-sm font-medium text-center shadow-inner">
                                {error}
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`btn w-full h-12 text-md font-bold tracking-wide transition-all ${error ? 'btn-secondary bg-red-500/20 text-red-200 border-red-500/30' : 'btn-primary shadow-blue-500/20 hover:shadow-blue-500/40'}`}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        INGRESAR AL SISTEMA
                                        <LogIn size={20} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-12 text-center opacity-40">
                    <span className="text-[10px] text-white uppercase font-black tracking-[0.3em]">
                        ASPEL DANY • SAE WEB 1.0
                    </span>
                </div>
            </div>
        </div>
    );
}
