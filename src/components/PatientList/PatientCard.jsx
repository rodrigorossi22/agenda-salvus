import React from 'react';
import { motion } from 'framer-motion';

// Status IDs according to Feegow API
// 3: Atendido
// 6: Não compareceu
// 15: Remarcado
// Others: Pendente (e.g., 1, 3, 4, etc.)

export function PatientCard({ appointment, onClick }) {
    const {
        horario,
        paciente_nome,
        procedimento_nome,
        status_id,
        notas
    } = appointment;

    // Determine status color
    let statusColor = 'bg-gray-500'; // Cinza - Pendente
    if (status_id === 3) statusColor = 'bg-green-500'; // Verde - Atendido
    else if (status_id === 6) statusColor = 'bg-red-500'; // Vermelho - Faltou
    else if (status_id === 15) statusColor = 'bg-purple-500'; // Roxo - Remarcado

    const isEvolucaoPendente = status_id === 3 && (!notas || notas.trim() === '');
    const isEvolucaoSalva = status_id === 3 && notas && notas.trim() !== '';

    return (
        <motion.div
            onClick={() => onClick(appointment)}
            whileHover={{ x: 3, backgroundColor: 'rgb(26 26 26)' }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`
        relative flex cursor-pointer overflow-hidden rounded-md bg-[#111] p-4 text-white
        border
        ${isEvolucaoPendente ? 'animate-pulse border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-[#333]'}
      `}
        >
            {/* Barra lateral colorida por status */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor}`} />

            <div className="flex w-full flex-col pl-2">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-xl font-semibold">{horario?.substring(0, 5) || '--:--'}</span>
                        <span className="ml-3 text-lg">{paciente_nome || 'Paciente não identificado'}</span>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2">
                        {isEvolucaoPendente && (
                            <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-500">
                                Evolução Pendente
                            </span>
                        )}
                        {isEvolucaoSalva && (
                            <span className="flex items-center gap-1 rounded bg-[#c5a059]/20 px-2 py-0.5 text-xs font-medium text-[#c5a059]">
                                <span>✓</span> Evolução salva
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-2 text-sm text-gray-400">
                    {procedimento_nome || 'Consulta Padrão'}
                </div>
            </div>
        </motion.div>
    );
}
