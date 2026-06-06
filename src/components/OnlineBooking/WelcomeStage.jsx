import React from 'react'
import { motion } from 'framer-motion'

export default function WelcomeStage({ onSelectOption }) {
  return (
    <div className="w-full max-w-md px-4 py-8">
      <header className="mb-10 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Bem-vindo à Clínica Salvus</span>
        <h2 className="text-3xl font-serif mt-2 text-[#2e2a25]">Como prefere continuar?</h2>
        <p className="text-xs text-[#7a7065] mt-2">Selecione uma opção para iniciar o seu agendamento online</p>
      </header>

      <div className="space-y-4">
        <button
          onClick={() => onSelectOption('PATIENT')}
          className="w-full text-left bg-white hover:bg-[#c5a059]/5 border border-[#e6e2dc] hover:border-[#c5a059] rounded-xl p-5 transition-all duration-300 group cursor-pointer shadow-sm flex flex-col justify-between"
        >
          <div className="flex justify-between items-center w-full">
            <h3 className="font-semibold text-sm text-[#2e2a25] group-hover:text-[#c5a059] transition-colors">
              Já sou paciente
            </h3>
            <svg className="w-4 h-4 text-[#a29382] group-hover:text-[#c5a059] transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-xs text-[#7a7065] mt-2 leading-relaxed">
            Identifique-se com seu celular. O sistema carregará seus dados e validará seus limites de agendamento automaticamente.
          </p>
        </button>

        <button
          onClick={() => onSelectOption('NEW')}
          className="w-full text-left bg-white hover:bg-[#c5a059]/5 border border-[#e6e2dc] hover:border-[#c5a059] rounded-xl p-5 transition-all duration-300 group cursor-pointer shadow-sm flex flex-col justify-between"
        >
          <div className="flex justify-between items-center w-full">
            <h3 className="font-semibold text-sm text-[#2e2a25] group-hover:text-[#c5a059] transition-colors">
              Primeira vez na clínica
            </h3>
            <svg className="w-4 h-4 text-[#a29382] group-hover:text-[#c5a059] transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-xs text-[#7a7065] mt-2 leading-relaxed">
            Selecione o procedimento, escolha a data desejada e preencha sua ficha cadastral no final do processo.
          </p>
        </button>
      </div>
    </div>
  )
}
