import React from 'react'
import { format } from 'date-fns'

export default function FormStage({
  isFirstTime,
  selectedProcedure,
  selectedDate,
  selectedTime,
  isTestMode,
  name,
  setName,
  cpf,
  setCpf,
  birthDate,
  onChangeBirthDate,
  onBlurBirthDate,
  email,
  setEmail,
  phone,
  onChangePhone,
  foundPatientName,
  submitting,
  errorMessage,
  onBooking,
  onBack
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
        <span>Voltar para Horários</span>
      </button>

      <header className="mb-8 border-b border-[#e6e2dc] pb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Você selecionou</span>
        <h2 className="text-xl font-serif mt-1 text-[#2e2a25]">{selectedProcedure?.name || 'Atendimento Estético'}</h2>
        <p className="text-xs text-[#7a7065] mt-1">
          Dia {format(selectedDate, 'dd/MM/yyyy')} às {selectedTime?.substring(0, 5) || ''} com {isTestMode ? 'Médico de Teste' : selectedProcedure?.professionalName} {isTestMode && '(Agenda Teste)'}
        </p>
      </header>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed">
          {errorMessage}
        </div>
      )}

      <form onSubmit={onBooking} className="space-y-6">
        {isFirstTime ? (
          /* Campos Primeira Vez */
          <>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">Nome Completo *</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Digite seu nome completo"
                required
                className="w-full bg-white border border-[#e6e2dc] rounded-lg px-4 py-3 text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">CPF *</label>
              <input 
                type="text" 
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                placeholder="Apenas números (11 dígitos)"
                required
                className="w-full bg-white border border-[#e6e2dc] rounded-lg px-4 py-3 text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">Data de Nascimento *</label>
              <input 
                type="text" 
                value={birthDate}
                onChange={onChangeBirthDate}
                onBlur={onBlurBirthDate}
                placeholder="DD/MM/AAAA"
                required
                className="w-full bg-white border border-[#e6e2dc] rounded-lg px-4 py-3 text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">E-mail *</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                className="w-full bg-white border border-[#e6e2dc] rounded-lg px-4 py-3 text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">WhatsApp / Celular *</label>
              <input 
                type="tel" 
                value={phone}
                onChange={e => onChangePhone(e.target.value)}
                placeholder="(DD) 99999-9999"
                required
                className="w-full bg-white border border-[#e6e2dc] rounded-lg px-4 py-3 text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm"
              />
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-[#c5a059] disabled:bg-[#c5a059]/50 hover:bg-[#b08e4f] text-white font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors flex items-center justify-center shadow-md cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Confirmando na Feegow...
                </>
              ) : (
                'Confirmar Agendamento'
              )}
            </button>
          </>
        ) : (
          /* Confirmação rápida do paciente identificado */
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-[#fcf9f2] border border-[#e6e2dc] text-[#7a7065] text-sm leading-relaxed">
              Olá, <strong className="text-[#2e2a25]">{foundPatientName}</strong>!<br />
              Seu celular <strong>{phone}</strong> já está cadastrado no sistema.<br /><br />
              Deseja confirmar o seu agendamento para este procedimento?
            </div>
            
            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-[#c5a059] disabled:bg-[#c5a059]/50 hover:bg-[#b08e4f] text-white font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors flex items-center justify-center shadow-md cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Confirmando na Feegow...
                </>
              ) : (
                'Confirmar Agendamento'
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
