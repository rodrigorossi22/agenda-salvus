import React from 'react'

export default function FlowSelectionStage({ onSelectFlow, onBack }) {
  return (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 sm:p-10 space-y-8 border border-[#e6e2dc]">
      <div className="text-center space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#c5a059]">
          Agendamento Online
        </span>
        <h2 className="text-2xl sm:text-3xl font-serif text-[#2e2a25]">
          Como prefere agendar?
        </h2>
        <p className="text-sm text-[#7a7065]">
          Escolha a opção mais conveniente para você navegar
        </p>
      </div>

      <div className="space-y-4 pt-2">
        <button
          onClick={() => onSelectFlow('DATE_FIRST')}
          className="w-full text-left p-6 rounded-2xl border border-[#e6e2dc] hover:border-[#c5a059] bg-[#faf8f5] hover:bg-[#f4efe8] transition-all group flex items-start space-x-5 shadow-sm hover:shadow-md cursor-pointer"
        >
          <div className="p-3 bg-white border border-[#e6e2dc] rounded-xl text-[#c5a059] group-hover:scale-105 transition-transform shadow-xs">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-serif font-medium text-[#2e2a25] text-lg flex items-center justify-between">
              <span>Agendar por Data</span>
              <span className="text-[10px] bg-[#c5a059]/15 text-[#8c6d31] font-sans font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Rápido
              </span>
            </div>
            <p className="text-xs text-[#7a7065] mt-1.5 leading-relaxed font-sans">
              Veja os dias e horários livres na clínica primeiro e escolha o tratamento para o momento desejado.
            </p>
          </div>
        </button>

        <button
          onClick={() => onSelectFlow('PROCEDURE_FIRST')}
          className="w-full text-left p-6 rounded-2xl border border-[#e6e2dc] hover:border-[#c5a059] bg-[#faf8f5] hover:bg-[#f4efe8] transition-all group flex items-start space-x-5 shadow-sm hover:shadow-md cursor-pointer"
        >
          <div className="p-3 bg-white border border-[#e6e2dc] rounded-xl text-[#c5a059] group-hover:scale-105 transition-transform shadow-xs">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-serif font-medium text-[#2e2a25] text-lg">
              Agendar por Tratamento
            </div>
            <p className="text-xs text-[#7a7065] mt-1.5 leading-relaxed font-sans">
              Escolha o procedimento desejado (Drenagem, Massagem, etc) para consultar os horários específicos.
            </p>
          </div>
        </button>
      </div>

      <div className="pt-2">
        <button
          onClick={onBack}
          className="w-full py-2.5 text-xs text-[#7a7065] hover:text-[#2e2a25] font-medium transition-colors cursor-pointer text-center"
        >
          ← Voltar
        </button>
      </div>
    </div>
  )
}
