import React, { useState, useRef, useEffect } from 'react';

export function ProcedureTags({ tags, onChange, allProcedures = [] }) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Filter procedures based on input
    const filteredProcedures = allProcedures.filter(p =>
        p.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(p)
    ).slice(0, 50); // limit to 50 results for performance

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAdd = (val) => {
        const text = val || inputValue;
        if (text.trim() && !tags.includes(text.trim())) {
            onChange([...tags, text.trim()]);
            setInputValue('');
            setIsOpen(false);
        }
    };

    const handleRemove = (tagToRemove) => {
        onChange(tags.filter((tag) => tag !== tagToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // If dropdown is open and there's an exact match or just one item, we could auto-select it.
            // But to keep it simple, just add the current input value.
            handleAdd();
        }
    };

    return (
        <div className="flex w-full flex-col gap-2">
            <label className="text-sm font-semibold text-gray-300">Procedimentos realizados</label>

            <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                    <div
                        key={tag}
                        className="flex items-center gap-1 rounded bg-[#c5a059]/10 px-3 py-1 text-sm font-medium text-[#c5a059] ring-1 ring-[#c5a059]/30"
                    >
                        <span>{tag}</span>
                        <button
                            type="button"
                            onClick={() => handleRemove(tag)}
                            className="ml-1 text-[#c5a059] opacity-70 hover:opacity-100 focus:outline-none"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            <div className="relative mt-1 flex" ref={dropdownRef}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Adicionar novo procedimento..."
                    className="flex-1 rounded-l border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#c5a059] focus:outline-none"
                />
                <button
                    type="button"
                    onClick={() => handleAdd()}
                    className="rounded-r bg-[#333] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#c5a059] hover:text-black focus:outline-none"
                >
                    Adicionar
                </button>

                {isOpen && inputValue.trim() && filteredProcedures.length > 0 && (
                    <ul className="absolute left-0 top-full z-10 mt-1 max-h-60 w-[calc(100%-80px)] overflow-auto rounded-md border border-[#333] bg-[#1a1612] py-1 shadow-lg shadow-black/50">
                        {filteredProcedures.map((proc, index) => (
                            <li
                                key={index}
                                onClick={() => handleAdd(proc)}
                                className="cursor-pointer px-4 py-2 text-sm text-gray-300 hover:bg-[#c5a059]/20 hover:text-white"
                            >
                                {proc}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
