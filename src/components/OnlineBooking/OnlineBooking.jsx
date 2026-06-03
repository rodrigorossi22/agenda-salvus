import React, { useState, useEffect, useMemo } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchAvailableSchedule, searchPatient, createPatient, createAppointment } from '../../services/feegow'

const PROCEDURES = [
  { id: 249, name: 'Shape Detox', duration: 90, desc: 'Tratamento corporal completo para redução de medidas e eliminação de toxinas.' },
  { id: 54, name: 'Limpeza de Pele', duration: 90, desc: 'Limpeza profunda com extração, esfoliação e hidratação.' },
  { id: 92, name: 'Drenagem Linfática', duration: 60, desc: 'Massagem terapêutica para redução de retenção de líquidos e inchaços.' },
  { id: 149, name: 'Outros', duration: 60, desc: 'Agende uma avaliação inicial estética com a profissional Monica Sousa.' }
]

const STAGES = {
  PROCEDURE: 'PROCEDURE',
  DATETIME: 'DATETIME',
  FORM: 'FORM',
  SUCCESS: 'SUCCESS'
}

export default function OnlineBooking() {
  const [stage, setStage] = useState(STAGES.PROCEDURE)
  const [selectedProcedure, setSelectedProcedure] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedLocalId, setSelectedLocalId] = useState(null)
  const [availableSlots, setAvailableSlots] = useState({})
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [appointmentDetails, setAppointmentDetails] = useState(null)

  // Parse tracking parameters (UTMs)
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), [])
  
  const getOrigemId = () => {
    const utmSource = (queryParams.get('utm_source') || '').toLowerCase()
    const utmMedium = (queryParams.get('utm_medium') || '').toLowerCase()
    const origemParam = queryParams.get('origem')

    if (origemParam && !isNaN(Number(origemParam))) return Number(origemParam)
    if (utmSource.includes('instagram') || utmMedium.includes('instagram')) return 22 // DM Instagram
    if (
      utmSource.includes('cpc') || utmMedium.includes('cpc') ||
      utmSource.includes('google') || utmMedium.includes('google') ||
      utmSource.includes('ad') || utmMedium.includes('ad')
    ) {
      return 6 // Tráfego Pago
    }
    return 20 // Contato direto Whatsapp (padrão)
  }

  // Load available slots function
  const loadSlots = async () => {
    if (!selectedProcedure) return
    setLoadingSlots(true)
    setErrorMessage(null)
    try {
      const todayStr = format(new Date(), 'dd-MM-yyyy')
      const futureStr = format(addDays(new Date(), 30), 'dd-MM-yyyy')
      const data = await fetchAvailableSchedule({
        procedimento_id: selectedProcedure.id,
        data_start: todayStr,
        data_end: futureStr
      })
      
      // Nesting resolution: content.profissional_id["15"].local_id
      const localMap = data.profissional_id?.['15']?.local_id || {}
      setAvailableSlots(localMap)
    } catch (err) {
      console.error(err)
      setErrorMessage('Erro ao carregar horários disponíveis da Feegow. Tente novamente.')
    } finally {
      setLoadingSlots(false)
    }
  }

  // Load available slots when procedure changes
  useEffect(() => {
    loadSlots()
  }, [selectedProcedure])

  // Filter slots based on the Date and apply Scarcity rules
  const scarcitySlotsForDate = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    
    let morning = []
    let afternoon = []
    let foundLocalId = null

    for (const localId of Object.keys(availableSlots)) {
      const dateSlots = availableSlots[localId]?.[dateKey] || []
      if (dateSlots.length > 0) {
        foundLocalId = localId
        dateSlots.forEach(time => {
          if (time < '12:00:00') {
            morning.push(time)
          } else {
            afternoon.push(time)
          }
        })
        break; // Stop at first local that has slots for this date
      }
    }

    morning.sort()
    afternoon.sort()

    // Apply scarcity rule: Max 3 per period
    const limitedMorning = morning.slice(0, 3)
    const limitedAfternoon = afternoon.slice(0, 3)

    return {
      morning: limitedMorning,
      afternoon: limitedAfternoon,
      localId: foundLocalId
    }
  }, [selectedDate, availableSlots])

  const handleTimeSelect = (time, localId) => {
    setSelectedTime(time)
    setSelectedLocalId(localId)
    setStage(STAGES.FORM)
  }

  const handleBooking = async (e) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setErrorMessage('Por favor, preencha o Nome e o Celular.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      // Step 1: Search patient
      let patientId = await searchPatient({ cpf, telefone: phone })
      
      // Step 2: Create if not found
      if (!patientId) {
        const originId = getOrigemId()
        patientId = await createPatient({
          nome_completo: name,
          celular: phone,
          cpf,
          origem_id: originId
        })
      }

      if (!patientId) {
        throw new Error('Falha ao registrar ou buscar paciente na Feegow.')
      }

      // Step 3: Format selectedDate from YYYY-MM-DD back to dd-mm-YYYY
      const formattedDate = format(selectedDate, 'dd-MM-yyyy')

      // Step 4: Create Appointment
      await createAppointment({
        local_id: selectedLocalId || scarcitySlotsForDate.localId,
        paciente_id: patientId,
        procedimento_id: selectedProcedure.id,
        data: formattedDate,
        horario: selectedTime,
        notas: `Agendamento automático via link online (Mônica). Origem/UTM: ID ${getOrigemId()}.`
      })

      setAppointmentDetails({
        procedureName: selectedProcedure.name,
        date: format(selectedDate, 'dd/MM/yyyy'),
        time: selectedTime.substring(0, 5)
      })

      setStage(STAGES.SUCCESS)
    } catch (err) {
      console.error(err)
      setErrorMessage(
        err.message?.includes('Feegow')
          ? err.message
          : 'Este horário foi preenchido recentemente por outro paciente. Por favor, selecione outra vaga.'
      )
      // Reload slots to get the updated available slots after error
      loadSlots()
    } finally {
      setSubmitting(false)
    }
  }

  const renderProcedureStage = () => (
    <div className="w-full max-w-4xl px-4 py-8">
      <header className="text-center mb-12">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Agendamento Online</span>
        <h2 className="text-4xl font-serif mt-2 text-[#f5f5f5]">Monica Sousa</h2>
        <p className="text-sm text-[#a29382] mt-2">Escolha um procedimento para verificar horários disponíveis.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {PROCEDURES.map(proc => (
          <div 
            key={proc.id} 
            onClick={() => {
              setSelectedProcedure(proc)
              setStage(STAGES.DATETIME)
            }}
            className="group border border-[#333] bg-[#111] hover:border-[#c5a059] p-6 rounded-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-[#c5a059]/5"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-medium text-[#f5f5f5] group-hover:text-[#c5a059] transition-colors">{proc.name}</h3>
              <span className="text-xs bg-[#c5a059]/10 text-[#c5a059] font-semibold px-2 py-1 rounded">
                {proc.duration} min
              </span>
            </div>
            <p className="text-sm text-[#888] leading-relaxed">{proc.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderDateTimeStage = () => {
    const days = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i))

    return (
      <div className="w-full max-w-3xl px-4 py-8">
        <button 
          onClick={() => {
            setSelectedProcedure(null)
            setSelectedTime(null)
            setStage(STAGES.PROCEDURE)
          }}
          className="flex items-center text-sm text-[#a29382] hover:text-[#c5a059] mb-8 transition-colors"
        >
          ← Voltar para Procedimentos
        </button>

        <header className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Procedimento</span>
          <h2 className="text-2xl font-serif mt-1 text-[#f5f5f5]">{selectedProcedure.name}</h2>
          <p className="text-sm text-[#a29382] mt-1">Duração média de {selectedProcedure.duration} minutos.</p>
        </header>

        {/* Connection Error Banner with Try Again Button */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/30 border border-red-900/50 text-red-400 text-sm flex justify-between items-center leading-relaxed">
            <span>{errorMessage}</span>
            <button 
              onClick={loadSlots}
              className="bg-[#c5a059] text-black text-xs font-semibold px-3 py-1.5 rounded hover:bg-[#b08e4f] transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Quick Date Selector tabs */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#a29382] mb-3">1. Escolha o Dia</h3>
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin">
            {days.map((day, idx) => {
              const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedDate(day)
                    setSelectedTime(null)
                  }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-lg border transition-all duration-200 ${
                    isSelected 
                      ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' 
                      : 'border-[#333] bg-[#111] text-[#888] hover:border-[#a29382] hover:text-[#f5f5f5]'
                  }`}
                >
                  <span className="text-xs uppercase font-medium">{format(day, 'eee', { locale: ptBR })}</span>
                  <span className="text-xl font-bold mt-1">{format(day, 'd')}</span>
                  <span className="text-[10px] uppercase">{format(day, 'MMM', { locale: ptBR })}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Selector grids */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#a29382] mb-4">2. Horários Disponíveis</h3>

          {loadingSlots ? (
            <div className="flex justify-center items-center py-12 text-[#a29382]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c5a059] border-t-transparent mr-2" />
              Consultando agenda da Feegow...
            </div>
          ) : (
            <div className="space-y-8">
              {/* Morning section */}
              <div>
                <h4 className="text-sm font-medium text-[#888] mb-3 border-b border-[#222] pb-1">Manhã</h4>
                {scarcitySlotsForDate.morning.length === 0 ? (
                  <p className="text-xs text-[#555] italic">Sem horários livres no turno da manhã.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {scarcitySlotsForDate.morning.map(time => (
                      <button
                        key={time}
                        onClick={() => handleTimeSelect(time, scarcitySlotsForDate.localId)}
                        className="bg-[#111] hover:bg-[#c5a059] border border-[#333] hover:border-[#c5a059] text-[#f5f5f5] hover:text-black font-medium py-3 rounded-lg text-sm text-center transition-all duration-200"
                      >
                        {time.substring(0, 5)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Afternoon section */}
              <div>
                <h4 className="text-sm font-medium text-[#888] mb-3 border-b border-[#222] pb-1">Tarde</h4>
                {scarcitySlotsForDate.afternoon.length === 0 ? (
                  <p className="text-xs text-[#555] italic">Sem horários livres no turno da tarde.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {scarcitySlotsForDate.afternoon.map(time => (
                      <button
                        key={time}
                        onClick={() => handleTimeSelect(time, scarcitySlotsForDate.localId)}
                        className="bg-[#111] hover:bg-[#c5a059] border border-[#333] hover:border-[#c5a059] text-[#f5f5f5] hover:text-black font-medium py-3 rounded-lg text-sm text-center transition-all duration-200"
                      >
                        {time.substring(0, 5)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderFormStage = () => (
    <div className="w-full max-w-md px-4 py-8">
      <button 
        onClick={() => setStage(STAGES.DATETIME)}
        className="flex items-center text-sm text-[#a29382] hover:text-[#c5a059] mb-8 transition-colors"
      >
        ← Voltar para Horários
      </button>

      <header className="mb-8 border-b border-[#222] pb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Você selecionou</span>
        <h2 className="text-xl font-serif mt-1 text-[#f5f5f5]">{selectedProcedure.name}</h2>
        <p className="text-sm text-[#a29382] mt-1">
          Dia {format(selectedDate, 'dd/MM/yyyy')} às {selectedTime.substring(0, 5)} com Monica Sousa
        </p>
      </header>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/30 border border-red-900/50 text-red-400 text-sm leading-relaxed">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleBooking} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[#a29382] mb-2">Nome Completo *</label>
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Digite seu nome completo"
            required
            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-[#555] focus:outline-none focus:border-[#c5a059] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[#a29382] mb-2">WhatsApp / Celular *</label>
          <input 
            type="tel" 
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(DD) 99999-9999"
            required
            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-[#555] focus:outline-none focus:border-[#c5a059] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[#a29382] mb-2">
            CPF <span className="text-[10px] text-[#555] font-normal">(Opcional - ajuda a validar seu cadastro)</span>
          </label>
          <input 
            type="text" 
            value={cpf}
            onChange={e => setCpf(e.target.value)}
            placeholder="000.000.000-00"
            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-[#555] focus:outline-none focus:border-[#c5a059] transition-colors"
          />
        </div>

        <button 
          type="submit"
          disabled={submitting}
          className="w-full bg-[#c5a059] disabled:bg-[#c5a059]/50 hover:bg-[#b08e4f] text-black font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors flex items-center justify-center"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent mr-2" />
              Confirmando na Feegow...
            </>
          ) : (
            'Confirmar Agendamento'
          )}
        </button>
      </form>
    </div>
  )

  const renderSuccessStage = () => (
    <div className="w-full max-w-md px-4 py-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#c5a059]/10 text-[#c5a059] mb-6 border border-[#c5a059]/20">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <h2 className="text-3xl font-serif text-[#f5f5f5] mb-2">Agendamento Realizado!</h2>
      <p className="text-sm text-[#a29382] mb-8 leading-relaxed">
        Seu horário com Monica Sousa foi registrado com sucesso na Feegow. Te esperamos!
      </p>

      <div className="bg-[#111] border border-[#222] rounded-xl p-6 text-left space-y-4 mb-8">
        <div>
          <span className="text-[10px] uppercase font-semibold tracking-widest text-[#555] block">Procedimento</span>
          <span className="text-[#f5f5f5] font-medium">{appointmentDetails?.procedureName}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] uppercase font-semibold tracking-widest text-[#555] block">Data</span>
            <span className="text-[#f5f5f5] font-medium">{appointmentDetails?.date}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold tracking-widest text-[#555] block">Horário</span>
            <span className="text-[#f5f5f5] font-medium">{appointmentDetails?.time}h</span>
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase font-semibold tracking-widest text-[#555] block">Profissional</span>
          <span className="text-[#f5f5f5] font-medium">Monica Sousa</span>
        </div>
      </div>

      <button 
        onClick={() => {
          setSelectedProcedure(null)
          setSelectedTime(null)
          setName('')
          setPhone('')
          setCpf('')
          setStage(STAGES.PROCEDURE)
        }}
        className="text-xs uppercase tracking-widest text-[#c5a059] hover:underline font-semibold"
      >
        Marcar outro agendamento
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex items-center justify-center font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="w-full flex justify-center"
        >
          {stage === STAGES.PROCEDURE && renderProcedureStage()}
          {stage === STAGES.DATETIME && renderDateTimeStage()}
          {stage === STAGES.FORM && renderFormStage()}
          {stage === STAGES.SUCCESS && renderSuccessStage()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
