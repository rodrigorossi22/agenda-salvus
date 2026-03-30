import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PatientCard } from './PatientCard';

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
    }),
    exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export function PatientList({ appointments, professionalFilter, onCardClick }) {
    const filtered = professionalFilter
        ? appointments.filter((a) => String(a.profissional_id) === String(professionalFilter))
        : appointments;

    const sorted = [...filtered].sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

    if (sorted.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-gray-500"
            >
                <span className="text-4xl mb-4">📋</span>
                <p className="text-lg">Nenhum agendamento encontrado</p>
                <p className="text-sm mt-1">Selecione outra data ou profissional</p>
            </motion.div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div key={sorted.map(a => a.agendamento_id).join(',')} className="flex flex-col gap-3">
                {sorted.map((appt, i) => (
                    <motion.div
                        key={appt.agendamento_id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <PatientCard
                            appointment={appt}
                            onClick={onCardClick}
                        />
                    </motion.div>
                ))}
            </motion.div>
        </AnimatePresence>
    );
}
