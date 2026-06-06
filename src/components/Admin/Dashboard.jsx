import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Dashboard({ clinicId, onLogout }) {
    const [data, setData] = useState({
        prompt: '',
        base_conhecimento: '',
        contato_humano_1: '',
        contato_humano_2: '',
        contato_humano_3: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRetraining, setIsRetraining] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' }); // type: 'success' | 'error'

    useEffect(() => {
        fetchClinicData();
    }, [clinicId]);

    const fetchClinicData = async () => {
        try {
            const res = await fetch(`/api/clinicas?id=${clinicId}`);
            if (!res.ok) throw new Error('Falha ao carregar as configurações.');
            const result = await res.json();
            setData({
                prompt: result.prompt || '',
                base_conhecimento: result.base_conhecimento || '',
                contato_humano_1: result.contato_humano_1 || '',
                contato_humano_2: result.contato_humano_2 || '',
                contato_humano_3: result.contato_humano_3 || ''
            });
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/clinicas?id=${clinicId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Falha ao salvar as alterações no banco.');

            showMessage('success', 'Configurações salvas com sucesso! Para que a IA aprenda a nova Base, clique em Re-treinar IA.');
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRetrain = async () => {
        setIsRetraining(true);
        try {
            const res = await fetch(`/api/retreinar?id=${clinicId}`, { method: 'POST' });
            const result = await res.json();

            if (!res.ok) throw new Error(result.error || 'Falha ao acionar a rede neural.');

            showMessage('success', 'Sinal de Re-treinamento enviado! A IA fará o chunking automático em background.');
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setIsRetraining(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#c5a059] border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-[#333] bg-[#0a0a0a]/80 backdrop-blur-md px-8 py-5">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-[#c5a059] to-[#ebd299]">
                            <span className="font-bold text-black text-xl">IA</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Configurações do Agente</h1>
                            <p className="text-sm text-gray-500">Clínica: <span className="text-[#c5a059] font-medium">{clinicId}</span></p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="rounded-lg border border-[#333] bg-transparent px-4 py-2 text-sm text-gray-400 hover:bg-[#111] hover:text-white transition-colors">
                        Sair
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-8 pt-8">
                {/* Messages */}
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className={`mb-6 rounded-xl border p-4 ${message.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-green-500/30 bg-green-500/10 text-green-400'}`}
                    >
                        <p className="font-medium">{message.text}</p>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

                    <div className="lg:col-span-2 space-y-6">
                        {/* Box 1: Prompt */}
                        <div className="rounded-2xl border border-[#333] bg-[#111] p-6 shadow-xl">
                            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#c5a059]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                Personalidade e Regras (Prompt)
                            </h2>
                            <p className="text-sm text-gray-500 mb-4">Instruções de como o comportamento da sua IA deve conduzir a recepção e o tom de voz.</p>
                            <textarea
                                name="prompt"
                                value={data.prompt}
                                onChange={handleChange}
                                rows={10}
                                className="w-full rounded-xl border border-[#333] bg-black/50 p-4 text-sm text-gray-200 placeholder-gray-600 focus:border-[#c5a059] focus:outline-none focus:ring-1 focus:ring-[#c5a059] font-mono leading-relaxed"
                                spellCheck="false"
                            />
                        </div>

                        {/* Box 2: RAG / Base Conhecimento */}
                        <div className="rounded-2xl border border-[#333] bg-[#111] p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#c5a059]" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                                    Base de Conhecimento (Textos, Tabelas de Preço, FAQ)
                                </h2>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                Cole aqui todo o conhecimento que a IA deve buscar (Procedimentos, Preços Fixos, Regras de Funcionamento). Ao modificar, será necessário Re-treinar a IA.
                            </p>
                            <textarea
                                name="base_conhecimento"
                                value={data.base_conhecimento}
                                onChange={handleChange}
                                rows={15}
                                className="w-full rounded-xl border border-[#333] bg-black/50 p-4 text-sm text-gray-200 placeholder-gray-600 focus:border-[#c5a059] focus:outline-none focus:ring-1 focus:ring-[#c5a059] font-mono leading-relaxed"
                                spellCheck="false"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Box 3: Contatos */}
                        <div className="rounded-2xl border border-[#333] bg-[#111] p-6 shadow-xl">
                            <h2 className="text-lg font-semibold text-white mb-2">Números de Transbordo</h2>
                            <p className="text-sm text-gray-500 mb-4">Telefones (WhatsApp) para os quais a IA deve direcionar quando for um assunto delicado.</p>

                            <div className="space-y-4">
                                {['contato_humano_1', 'contato_humano_2', 'contato_humano_3'].map((field, idx) => (
                                    <div key={field}>
                                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Número {idx + 1}</label>
                                        <input
                                            type="text"
                                            name={field}
                                            value={data[field]}
                                            onChange={handleChange}
                                            placeholder="Ex: 5511999999999"
                                            className="w-full rounded-lg border border-[#333] bg-black/50 px-3 py-2 text-sm text-white focus:border-[#c5a059] focus:outline-none focus:ring-1 focus:ring-[#c5a059]"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Ações Mágicas */}
                        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] p-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#c5a059]/5 to-transparent pointer-events-none" />
                            <h2 className="text-lg font-semibold text-white mb-4 relative z-10">Ações de Inteligência</h2>

                            <div className="space-y-4 relative z-10">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="group w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-3 text-sm font-semibold text-white transition-all border border-[#333] hover:border-gray-500 disabled:opacity-50"
                                >
                                    {isSaving ? <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" /> : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                    )}
                                    Salvar Textos no Banco
                                </button>

                                <div className="my-4 border-t border-[#333]" />

                                <button
                                    onClick={handleRetrain}
                                    disabled={isRetraining}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#ebd299] px-4 py-4 text-sm font-bold text-black shadow-lg shadow-[#c5a059]/30 hover:shadow-[#c5a059]/50 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    {isRetraining ? <span className="animate-spin h-4 w-4 border-2 border-black/20 border-t-black rounded-full" /> : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                                    )}
                                    Re-treinar IA (PGVector)
                                </button>
                                <p className="text-xs text-gray-500 text-center leading-tight">Ao clicar, ativa o processo que converte a nova Tabela de Preços e Base em embeddings matemáticos na Vector Store.</p>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
