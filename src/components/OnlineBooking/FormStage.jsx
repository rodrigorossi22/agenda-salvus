import React, { useState } from 'react'
import { format } from 'date-fns'
import { patientFormSchema } from '../../utils/validators'

export default function FormStage({
  isFirstTime,
  selectedProcedure,
  selectedDate,
  selectedTime,
  isTestMode,
  name: initialName = '',
  setName: setParentName,
  cpf: initialCpf = '',
  setCpf: setParentCpf,
  birthDate: initialBirthDate = '',
  onChangeBirthDate: setParentBirthDate,
  onBlurBirthDate,
  email: initialEmail = '',
  setEmail: setParentEmail,
  phone: initialPhone = '',
  onChangePhone: setParentPhone,
  foundPatientName,
  submitting,
  errorMessage,
  onBooking,
  onBack
}) {
  const [name, setName] = useState(initialName)
  const [cpf, setCpf] = useState(initialCpf)
  const [birthDate, setBirthDate] = useState(initialBirthDate)
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState(initialPhone)
  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = (e) => {
    e.preventDefault()

    if (isFirstTime) {
      // Validação Zod completa no lado do cliente
      const validationResult = patientFormSchema.safeParse({
        name,
        cpf,
        birthDate,
        email,
        phone
      })

      if (!validationResult.success) {
        const errors = {}
        validationResult.error.issues.forEach(issue => {
          const fieldName = issue.path[0]
          if (!errors[fieldName]) {
            errors[fieldName] = issue.message
          }
        })
        setFieldErrors(errors)
        return
      }
    }

    setFieldErrors({})

    // Atualiza estados do pai se fornecidos
    if (setParentName) setParentName(name)
    if (setParentCpf) setParentCpf(cpf)
    if (setParentEmail) setParentEmail(email)
    if (setParentPhone) setParentPhone(phone)

    onBooking(e, { name, cpf, birthDate, email, phone })
  }

  return (
    <div className="w-full max-w-md px-4 py-8">
      <button 
        onClick={onBack}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#c5a059]/40 text-[#2e2a25] hover:text-[#785b23] hover:border-[#c5a059] hover:bg-[#faf8f5] shadow-xs hover:shadow-md transition-all font-medium text-sm mb-6 cursor-pointer group"
      >
        <svg className="w-4 h-4 text-[#785b23] group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Voltar para Horários</span>
      </button>

      <header className="mb-8 border-b border-[#e6e2dc] pb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#785b23]">Você selecionou</span>
        <h2 className="text-xl font-serif mt-1 text-[#2e2a25]">{selectedProcedure?.name || 'Atendimento Estético'}</h2>
        <p className="text-xs text-[#7a7065] mt-1">
          Dia {format(selectedDate, 'dd/MM/yyyy')} às {selectedTime?.substring(0, 5) || ''} com {isTestMode ? 'Médico de Teste' : selectedProcedure?.professionalName} {isTestMode && '(Agenda Teste)'}
        </p>
      </header>

      {errorMessage && (
        <div role="alert" aria-live="assertive" className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {isFirstTime ? (
          /* Campos Primeira Vez */
          <>
            <div>
              <label htmlFor="input-name" className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">
                Nome Completo *
              </label>
              <input 
                id="input-name"
                type="text" 
                value={name}
                onChange={e => {
                  setName(e.target.value)
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: null }))
                }}
                placeholder="Digite seu nome e sobrenome"
                required
                className={`w-full bg-white border ${fieldErrors.name ? 'border-red-500' : 'border-[#e6e2dc]'} rounded-lg px-4 py-3 text-base text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm`}
              />
              {fieldErrors.name && (
                <span className="text-xs text-red-600 mt-1 block font-medium">{fieldErrors.name}</span>
              )}
            </div>

            <div>
              <label htmlFor="input-cpf" className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">
                CPF *
              </label>
              <input 
                id="input-cpf"
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={e => {
                  setCpf(e.target.value)
                  if (fieldErrors.cpf) setFieldErrors(prev => ({ ...prev, cpf: null }))
                }}
                placeholder="Apenas números (11 dígitos)"
                required
                className={`w-full bg-white border ${fieldErrors.cpf ? 'border-red-500' : 'border-[#e6e2dc]'} rounded-lg px-4 py-3 text-base text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm`}
              />
              {fieldErrors.cpf && (
                <span className="text-xs text-red-600 mt-1 block font-medium">{fieldErrors.cpf}</span>
              )}
            </div>

            <div>
              <label htmlFor="input-birthdate" className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">
                Data de Nascimento *
              </label>
              <input 
                id="input-birthdate"
                type="text"
                inputMode="numeric"
                value={birthDate}
                onChange={e => {
                  onChangeBirthDate(e)
                  if (fieldErrors.birthDate) setFieldErrors(prev => ({ ...prev, birthDate: null }))
                }}
                onBlur={onBlurBirthDate}
                placeholder="DD/MM/AAAA"
                required
                className={`w-full bg-white border ${fieldErrors.birthDate ? 'border-red-500' : 'border-[#e6e2dc]'} rounded-lg px-4 py-3 text-base text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm`}
              />
              {fieldErrors.birthDate && (
                <span className="text-xs text-red-600 mt-1 block font-medium">{fieldErrors.birthDate}</span>
              )}
            </div>

            <div>
              <label htmlFor="input-email" className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">
                E-mail *
              </label>
              <input 
                id="input-email"
                type="email" 
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: null }))
                }}
                placeholder="seu.email@exemplo.com"
                required
                className={`w-full bg-white border ${fieldErrors.email ? 'border-red-500' : 'border-[#e6e2dc]'} rounded-lg px-4 py-3 text-base text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm`}
              />
              {fieldErrors.email && (
                <span className="text-xs text-red-600 mt-1 block font-medium">{fieldErrors.email}</span>
              )}
            </div>

            <div>
              <label htmlFor="input-phone" className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">
                WhatsApp / Celular *
              </label>
              <input 
                id="input-phone"
                type="tel" 
                inputMode="tel"
                value={phone}
                onChange={e => {
                  onChangePhone(e.target.value)
                  if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: null }))
                }}
                placeholder="(DD) 99999-9999"
                required
                className={`w-full bg-white border ${fieldErrors.phone ? 'border-red-500' : 'border-[#e6e2dc]'} rounded-lg px-4 py-3 text-base text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm`}
              />
              {fieldErrors.phone && (
                <span className="text-xs text-red-600 mt-1 block font-medium">{fieldErrors.phone}</span>
              )}
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] bg-[#c5a059] disabled:bg-[#c5a059]/50 hover:bg-[#b08e4f] text-white font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors flex items-center justify-center shadow-md cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" aria-hidden="true" />
                  <span>Confirmando na Feegow...</span>
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
              className="w-full min-h-[48px] bg-[#c5a059] disabled:bg-[#c5a059]/50 hover:bg-[#b08e4f] text-white font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors flex items-center justify-center shadow-md cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" aria-hidden="true" />
                  <span>Confirmando na Feegow...</span>
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
