import React from 'react'

export default function IdentificationStage({
  phone,
  onChangePhone,
  searchingPatient,
  searchFailed,
  foundPatientId,
  foundPatientName,
  errorMessage,
  onSearchPatient,
  onBack,
  onProceed
}) {
  return (
    <div className="w-full max-w-md px-4 py-8">
      <button 
        onClick={onBack}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#c5a059]/40 text-[#2e2a25] hover:text-[#8c6d31] hover:border-[#c5a059] hover:bg-[#faf8f5] shadow-xs hover:shadow-md transition-all font-medium text-sm mb-6 cursor-pointer group"
      >
        <svg className="w-4 h-4 text-[#c5a059] group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Voltar</span>
      </button>

      <header className="mb-8 border-b border-[#e6e2dc] pb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Pacientes Recorrentes</span>
        <h2 className="text-2xl font-serif mt-1 text-[#2e2a25]">Identificação do Paciente</h2>
        <p className="text-xs text-[#7a7065] mt-1">
          Informe seu celular cadastrado para verificar seus agendamentos e limites.
        </p>
      </header>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed">
          {errorMessage}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">WhatsApp / Celular *</label>
          <input 
            type="tel" 
            value={phone}
            onChange={onChangePhone}
            placeholder="(DD) 99999-9999"
            disabled={searchingPatient || !!foundPatientId}
            className="w-full bg-white border border-[#e6e2dc] disabled:bg-[#f7f6f3] disabled:text-[#a29382] rounded-lg px-4 py-3 text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm"
          />
        </div>

        {searchFailed && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#faf0e6] border border-[#e6d0ba] text-[#8c6d53] text-xs leading-relaxed">
              Não encontramos nenhum cadastro com este celular. Por favor, entre em contato pelo WhatsApp para atualizar seus dados ou prossiga como primeira vez na clínica.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a 
                href={import.meta.env.VITE_CLINIC_WHATSAPP || 'https://wa.me/5511999999999'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center justify-center bg-[#25d366] hover:bg-[#20ba5a] text-white font-bold py-3.5 rounded-lg uppercase tracking-wider text-[10px] transition-colors shadow-sm text-center cursor-pointer"
              >
                Falar no WhatsApp
              </a>
              <button
                type="button"
                onClick={() => onProceed(true)} // Proceed as first time
                className="bg-[#c5a059] hover:bg-[#b08e4f] text-white font-bold py-3.5 rounded-lg uppercase tracking-wider text-[10px] transition-colors shadow-sm cursor-pointer"
              >
                Primeira Vez
              </button>
            </div>
          </div>
        )}

        {foundPatientId ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#fcf9f2] border border-[#e6e2dc] text-[#7a7065] text-xs leading-relaxed">
              Olá, <strong className="text-[#2e2a25]">{foundPatientName}</strong>! Encontramos seu cadastro no sistema.
            </div>
            <button 
              type="button"
              onClick={() => onProceed(false)} // Proceed as patient
              className="w-full bg-[#c5a059] hover:bg-[#b08e4f] text-white font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors flex items-center justify-center shadow-md cursor-pointer"
            >
              Escolher Procedimento
            </button>
          </div>
        ) : (
          !searchingPatient && !searchFailed && (
            <button 
              type="button"
              onClick={onSearchPatient}
              className="w-full bg-[#c5a059] hover:bg-[#b08e4f] text-white font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors flex items-center justify-center shadow-md cursor-pointer"
            >
              Buscar Cadastro
            </button>
          )
        )}

        {searchingPatient && (
          <div className="flex justify-center items-center py-4 text-xs text-[#7a7065]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#c5a059] border-t-transparent mr-2" />
            Buscando cadastro...
          </div>
        )}
      </div>
    </div>
  )
}
