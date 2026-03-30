import React from 'react';

// status IDs:
// Compareceu = 3 (Atendido)
// Não compareceu = 6
// Remarcado = 15

export function AttendanceRow({ value, onChange }) {
    const options = [
        { label: 'Compareceu', value: 3 },
        { label: 'Não compareceu', value: 6 },
        { label: 'Remarcado', value: 15 },
    ];

    return (
        <div className="flex w-full flex-col gap-2">
            <label className="text-sm font-semibold text-gray-300">Status de comparecimento</label>
            <div className="flex gap-2 rounded bg-[#111] p-1">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={`
              flex-1 rounded py-2 text-sm font-medium transition-colors
              ${value === option.value
                                ? 'bg-[#c5a059] text-black shadow-md'
                                : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                            }
            `}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
