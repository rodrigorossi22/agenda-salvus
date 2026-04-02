import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AttendanceRow } from './AttendanceRow';
import { ProcedureTags } from './ProcedureTags';
import { updateAppointmentStatus, createMedicalReport } from '../../services/feegow';
import { formatNotes } from '../../utils/formatNotes';
import { generateEvolutionPdfBase64 } from '../../utils/generatePdf';

export function EvolutionModal({ appointment, procedureMap = {}, onClose, onSuccess }) {
    const initialStatus = appointment?.status_id === 2 ? 3 : (appointment?.status_id || 3);
    const [statusId, setStatusId] = useState(initialStatus);
    const [procedures, setProcedures] = useState([]);
    const [nextSteps, setNextSteps] = useState('');
    const [evolutionText, setEvolutionText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (appointment?.procedimentos?.length) {
            const initialTags = appointment.procedimentos.map((p) =>
                procedureMap[p.procedimentoID] || p.nome || `Proc #${p.procedimentoID}`
            );
            setProcedures(initialTags);
        } else if (appointment?.procedimento_nome) {
            setProcedures([appointment.procedimento_nome]);
        }
    }, [appointment, procedureMap]);

    if (!appointment) return null;

    const handleSave = async () => {
        try {
            setLoading(true);
            setError(null);

            const formattedNotes = formatNotes({
                procedures,
                nextSteps,
                evolution: evolutionText,
            });

            // 1. Atualiza Status
            await updateAppointmentStatus({
                agendamento_id: appointment.agendamento_id,
                status_id: statusId,
                obs: formattedNotes,
            });

            // 2. Gera o PDF Base64 da Evolução
            const dateStr = new Intl.DateTimeFormat('pt-BR').format(new Date());
            const timeStr = appointment.horario?.substring(0, 5) || '--:--';

            const pdfBase64 = await generateEvolutionPdfBase64({
                patientName: appointment.paciente_nome || 'Paciente não identificado',
                date: dateStr,
                time: timeStr,
                professionalName: appointment.profissional_nome || '',
                procedures: procedures,
                nextSteps: nextSteps,
                evolutionText: evolutionText
            });

            // 3. Envia Laudo/Prontuário
            await createMedicalReport({
                agendamento_id: appointment.agendamento_id,
                laudo_base64: pdfBase64
            });

            onSuccess();
            setTimeout(() => onClose(), 900);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao salvar a evolução.');
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                key="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            >
                <motion.div
                    key="modal-panel"
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 16 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="flex w-full max-w-2xl flex-col rounded-2xl overflow-hidden
                                border border-white/10 shadow-2xl shadow-black/60
                                bg-[#111]/80 backdrop-blur-xl"
                >
                    <div className="relative p-6 bg-gradient-to-b from-[#1a1612] to-transparent border-b border-white/5">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c5a059]/60 to-transparent" />

                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {appointment.paciente_nome || 'Paciente não identificado'}
                                </h2>
                                <div className="mt-1.5 flex items-center gap-3 text-sm text-gray-400">
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-[#c5a059] text-xs">◷</span>
                                        {appointment.horario?.substring(0, 5) || '--:--'}
                                    </span>
                                    <span className="text-[#333]">·</span>
                                    <span className="text-gray-300">
                                        {appointment.procedimento_nome || 'Consulta'}
                                    </span>
                                    {appointment.profissional_nome && (
                                        <>
                                            <span className="text-[#333]">·</span>
                                            <span>{appointment.profissional_nome}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <motion.button
                                onClick={onClose}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                ✕
                            </motion.button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-7">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
                            >
                                {error}
                            </motion.div>
                        )}

                        <AttendanceRow value={statusId} onChange={setStatusId} />

                        <ProcedureTags tags={procedures} onChange={setProcedures} allProcedures={Object.values(procedureMap)} />

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                Próximos passos
                            </label>
                            <input
                                type="text"
                                value={nextSteps}
                                onChange={(e) => setNextSteps(e.target.value)}
                                placeholder="Ex: Retorno em 30 dias..."
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600
                                           focus:border-[#c5a059]/50 focus:bg-white/8 focus:outline-none transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                Evolução / Observações
                            </label>
                            <textarea
                                rows={4}
                                value={evolutionText}
                                onChange={(e) => setEvolutionText(e.target.value)}
                                placeholder="Descreva a evolução do paciente..."
                                className="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600
                                           focus:border-[#c5a059]/50 focus:bg-white/8 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-black/30">
                        <motion.button
                            onClick={onClose}
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors
                                       hover:bg-white/8 hover:text-white disabled:opacity-50"
                        >
                            Cancelar
                        </motion.button>
                        <motion.button
                            onClick={handleSave}
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center rounded-lg bg-[#c5a059] px-6 py-2.5
                                       text-sm font-bold text-black transition-all hover:bg-[#d6b16a]
                                       hover:shadow-lg hover:shadow-[#c5a059]/20 disabled:opacity-50 min-w-[160px]"
                        >
                            {loading ? 'Salvando...' : 'Salvar na Feegow →'}
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
