import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function Login({ onLogin }) {
    const [identificador, setIdentificador] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Validação ultra simples: Identificador obrigatório, senha genérica 'admin123' ou sem senha se em testes
        if (!identificador.trim()) {
            setError('O Identificador da clínica é obrigatório.');
            setIsLoading(false);
            return;
        }

        try {
            // Checa se a clínica existe na nossa API
            const res = await fetch(`/api/clinicas?id=${identificador}`);
            if (!res.ok) {
                throw new Error('Clínica não encontrada ou erro no servidor');
            }

            // Sucesso
            onLogin(identificador);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center p-4" style={{
            background: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%)'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
            >
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#c5a059] to-[#ebd299]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">IA Clinic Admin</h1>
                    <p className="mt-2 text-sm text-gray-400">Acesse para re-treinar a sua IA e ajustar os parâmetros</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">Identificador da Clínica</label>
                        <input
                            type="text"
                            required
                            value={identificador}
                            onChange={(e) => setIdentificador(e.target.value)}
                            placeholder="ex: salvus2408"
                            className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-gray-500 focus:border-[#c5a059] focus:outline-none focus:ring-1 focus:ring-[#c5a059] transition-all"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">Código de Acesso (Opcional MVP)</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-gray-500 focus:border-[#c5a059] focus:outline-none focus:ring-1 focus:ring-[#c5a059] transition-all"
                        />
                    </div>

                    {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                            {error}
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#c5a059] to-[#e1bd76] px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-[#c5a059]/20 transition-all hover:scale-[1.02] hover:shadow-[#c5a059]/40 disabled:opacity-50 disabled:hover:scale-100 flex"
                    >
                        {isLoading ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black mr-2" />
                        ) : 'Entrar no Sistema'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
