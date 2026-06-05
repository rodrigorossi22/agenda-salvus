/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchAvailableSchedule, searchPatient, createPatient, createAppointment } from '../../services/feegow'
import salvusLogo from '../../assets/logo_transparent.png'

const DEFAULT_PROCEDURE = {
  id: 149, // Outros (Consulta de Avaliação Estética) na Feegow
  name: 'Atendimento Estético',
  duration: 60
}

const STAGES = {
  PROCEDURE: 'PROCEDURE',
  DATETIME: 'DATETIME',
  FORM: 'FORM',
  SUCCESS: 'SUCCESS'
}

const PROCEDURES = [
  {
    id: 'ventosaterapia',
    name: 'Ventosaterapia',
    description: 'Sucção contra dor e inflamação.',
    category: 'Recuperação',
    feegowId: 346,
    professionalId: '15', // Monica
    professionalName: 'Monica Sousa'
  },
  {
    id: 'eletroestimulacao',
    name: 'Eletroestimulação',
    description: 'Estímlos para regeneração muscular.',
    category: 'Recuperação',
    feegowId: 347,
    professionalId: '15', // Monica
    professionalName: 'Monica Sousa'
  },
  {
    id: 'shape-detox',
    name: 'Shape Detox',
    description: 'Protocolo para eliminar toxinas.',
    category: 'Desintoxicação',
    feegowId: 338,
    professionalId: '15', // Monica
    professionalName: 'Monica Sousa'
  },
  {
    id: 'drenagem-linfatica',
    name: 'Drenagem Linfática',
    description: 'Redução de inchaço e retenção.',
    category: 'Desintoxicação',
    feegowId: 339,
    professionalId: '15', // Monica
    professionalName: 'Monica Sousa'
  },
  {
    id: 'head-spa',
    name: 'Head Spa',
    description: 'Terapia capilar relaxante.',
    category: 'Reset Mental',
    feegowId: 348,
    professionalId: '16', // Raquel
    professionalName: 'Raquel Nina'
  },
  {
    id: 'massagem-relaxante',
    name: 'Massagem Relaxante',
    description: 'Alívio de estresse e tensões.',
    category: 'Reset Mental',
    feegowId: 349,
    professionalId: '15', // Monica
    professionalName: 'Monica Sousa'
  }
]

export default function OnlineBooking() {
  const [stage, setStage] = useState(STAGES.PROCEDURE)
  const [selectedProcedure, setSelectedProcedure] = useState(null)
  const [isFirstTime, setIsFirstTime] = useState(true)
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [foundPatientName, setFoundPatientName] = useState('')
  const [foundPatientId, setFoundPatientId] = useState(null)
  const [searchingPatient, setSearchingPatient] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedLocalId, setSelectedLocalId] = useState(null)
  const [availableSlots, setAvailableSlots] = useState({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [isTestMode, setIsTestMode] = useState(false)
  const [maxFetchedDate, setMaxFetchedDate] = useState(null)

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [appointmentDetails, setAppointmentDetails] = useState(null)
  const dateInputRef = useRef(null)

  // Custom active professional derived from test mode or selected procedure
  const activeProfessionalId = isTestMode ? '1' : (selectedProcedure?.professionalId || '15')

  const handlePhoneChange = (e) => {
    setPhone(e.target.value)
    setFoundPatientId(null)
    setFoundPatientName('')
    setSearchFailed(false)
  }

  const handleSearchPatient = async () => {
    if (!phone.trim()) {
      setErrorMessage('Por favor, preencha o campo de celular.')
      return
    }
    setSearchingPatient(true)
    setErrorMessage(null)
    setSearchFailed(false)
    try {
      const result = await searchPatient({ telefone: phone })
      if (result && result.patient_id) {
        setFoundPatientId(result.patient_id)
        setFoundPatientName(result.nome)
      } else {
        setSearchFailed(true)
      }
    } catch (err) {
      console.error(err)
      setErrorMessage('Erro ao buscar cadastro. Tente novamente.')
    } finally {
      setSearchingPatient(false)
    }
  }

  // Parse tracking parameters (UTMs)
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), [])

  // Automatically detect test mode from URL query parameters
  useEffect(() => {
    if (queryParams.get('test_mode') === 'true') {
      setIsTestMode(true)
    }
  }, [queryParams])

  // Reset maxFetchedDate when test mode status changes
  useEffect(() => {
    setMaxFetchedDate(null)
  }, [isTestMode])
  
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
  const loadSlots = useCallback(async () => {
    setLoadingSlots(true)
    setErrorMessage(null)
    try {
      const today = new Date()
      const todayStr = format(today, 'dd-MM-yyyy')
      
      // Fetch up to 30 days from today, or 14 days after selectedDate (whichever is later)
      const standardLimit = addDays(today, 30)
      const endLimit = addDays(selectedDate, 14)
      const finalEnd = endLimit > standardLimit ? endLimit : standardLimit
      const futureStr = format(finalEnd, 'dd-MM-yyyy')
      
      const targetProcId = isTestMode ? 338 : (selectedProcedure?.feegowId || DEFAULT_PROCEDURE.id)
      const data = await fetchAvailableSchedule({
        procedimento_id: targetProcId,
        data_start: todayStr,
        data_end: futureStr,
        profissional_id: activeProfessionalId
      })
      
      // Nesting resolution: content.profissional_id[activeProfessionalId].local_id
      const localMap = data.profissional_id?.[activeProfessionalId]?.local_id || {}
      setAvailableSlots(localMap)
      setMaxFetchedDate(finalEnd)
    } catch (err) {
      console.error(err)
      setErrorMessage('Erro ao carregar horários disponíveis da Feegow. Tente novamente.')
    } finally {
      setLoadingSlots(false)
    }
  }, [activeProfessionalId, selectedProcedure, isTestMode, selectedDate])

  // Load available slots when active professional or selected procedure changes, or stage changes to DATETIME, or selectedDate is beyond the fetched range
  useEffect(() => {
    if (stage === STAGES.DATETIME && selectedProcedure) {
      if (!maxFetchedDate || selectedDate.getTime() > maxFetchedDate.getTime()) {
        loadSlots()
      }
    }
  }, [stage, selectedProcedure, selectedDate, maxFetchedDate, loadSlots])

  // Filter slots based on the Date, apply professional constraint rules
  const scarcitySlotsForDate = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    
    let morning = []
    let afternoon = []
    let evening = []
    let foundLocalId = null

    const isHeadSpa = selectedProcedure?.id === 'head-spa'

    for (const localId of Object.keys(availableSlots)) {
      const dateSlots = availableSlots[localId]?.[dateKey] || []
      if (dateSlots.length > 0) {
        foundLocalId = localId

        // Filter: Keep slot only if it fits the professional's hours
        // Raquel: strictly between 14h and 17h (last slot starts at 16h)
        // Monica: starts before 20h
        const validSlots = dateSlots.filter(time => {
          if (isHeadSpa) {
            return time >= '14:00:00' && time <= '16:00:00'
          } else {
            return time < '20:00:00'
          }
        })

        validSlots.forEach(time => {
          if (time < '12:00:00') {
            morning.push(time)
          } else if (time >= '12:00:00' && time < '18:00:00') {
            afternoon.push(time)
          } else {
            evening.push(time)
          }
        })
        break; // Stop at first local that has slots for this date
      }
    }

    // Helper to get 3 random slots and sort them chronologically
    const getRandomSlots = (array, count = 3) => {
      if (array.length <= count) return [...array].sort()
      const shuffled = [...array].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, count).sort()
    }

    const limitedMorning = getRandomSlots(morning, 3)
    const limitedAfternoon = getRandomSlots(afternoon, 3)
    const limitedEvening = getRandomSlots(evening, 3)

    return {
      morning: limitedMorning,
      afternoon: limitedAfternoon,
      evening: limitedEvening,
      localId: foundLocalId
    }
  }, [selectedDate, availableSlots, selectedProcedure])

  // Extract dates that actually have slots available for selected procedure
  const datesWithSlots = useMemo(() => {
    const dates = new Set()
    const isHeadSpa = selectedProcedure?.id === 'head-spa'

    for (const localId of Object.keys(availableSlots)) {
      const dateMap = availableSlots[localId] || {}
      for (const dateKey of Object.keys(dateMap)) {
        const slots = dateMap[dateKey] || []
        
        // Filter slots based on professional availability rules
        const hasValidSlot = slots.some(time => {
          if (isHeadSpa) {
            return time >= '14:00:00' && time <= '16:00:00'
          } else {
            return time < '20:00:00'
          }
        })

        if (hasValidSlot) {
          dates.add(dateKey)
        }
      }
    }

    return Array.from(dates)
      .map(dateStr => {
        const [year, month, day] = dateStr.split('-').map(Number)
        return new Date(year, month - 1, day)
      })
      .sort((a, b) => a.getTime() - b.getTime())
  }, [availableSlots, selectedProcedure])

  const handleProcedureSelect = (proc) => {
    setSelectedProcedure(proc)
    setMaxFetchedDate(null)
    setStage(STAGES.DATETIME)
  }

  const handleTimeSelect = (time, localId) => {
    setSelectedTime(time)
    setSelectedLocalId(localId)
    setStage(STAGES.FORM)
  }

  const handleCalendarButtonClick = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker()
      } catch (err) {
        dateInputRef.current.click()
      }
    }
  }

  const handleBooking = async (e) => {
    e.preventDefault()

    if (isFirstTime) {
      if (!name.trim() || !phone.trim() || !cpf.trim() || !birthDate.trim() || !email.trim()) {
        setErrorMessage('Por favor, preencha todos os campos obrigatórios (Nome, Celular, CPF, Data de Nascimento e E-mail).')
        return
      }

      // Validar se o CPF tem exatamente 11 dígitos numéricos limpos
      const cleanCpf = cpf.replace(/\D/g, '')
      if (cleanCpf.length !== 11) {
        setErrorMessage('O CPF deve conter exatamente 11 dígitos.')
        return
      }

      // Validar se a data de nascimento tem o formato DD/MM/AAAA usando regex /^\d{2}\/\d{2}\/\d{4}$/
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birthDate)) {
        setErrorMessage('A data de nascimento deve estar no formato DD/MM/AAAA.')
        return
      }

      setSubmitting(true)
      setErrorMessage(null)

      try {
        // Implementar verificação de duplicidade na submissão: chamar searchPatient({ cpf })
        const existingPatient = await searchPatient({ cpf: cleanCpf })
        if (existingPatient) {
          setErrorMessage('Já existe um cadastro com este CPF. Por favor, use a aba "Já sou paciente".')
          setSubmitting(false)
          return
        }

        // Formatar a Data de Nascimento para o formato da API (YYYY-MM-DD)
        const parts = birthDate.split('/')
        const formattedBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`

        const originId = getOrigemId()
        
        // Criar paciente
        const newPatientId = await createPatient({
          nome_completo: name,
          celular: phone,
          cpf: cleanCpf,
          email,
          nascimento: formattedBirthDate,
          origem_id: originId
        })

        if (!newPatientId) {
          throw new Error('Falha ao registrar paciente na Feegow.')
        }

        // Formatar data da consulta (dd-MM-yyyy para Feegow)
        const formattedDate = format(selectedDate, 'dd-MM-yyyy')

        const targetProcId = isTestMode ? 338 : selectedProcedure?.feegowId
        const targetProfId = isTestMode ? 1 : selectedProcedure?.professionalId
        const professionalName = isTestMode ? 'Teste' : (selectedProcedure?.professionalName || 'Monica Sousa')

        // Criar Agendamento
        await createAppointment({
          local_id: selectedLocalId || scarcitySlotsForDate.localId,
          paciente_id: newPatientId,
          procedimento_id: targetProcId,
          data: formattedDate,
          horario: selectedTime,
          notas: `Agendamento automático via link online (${isTestMode ? 'Teste' : selectedProcedure?.professionalName}). Origem/UTM: ID ${getOrigemId()}.`,
          profissional_id: targetProfId
        })

        setAppointmentDetails({
          procedureName: selectedProcedure?.name || DEFAULT_PROCEDURE.name,
          date: format(selectedDate, 'dd/MM/yyyy'),
          time: selectedTime?.substring(0, 5) || ''
        })

        setStage(STAGES.SUCCESS)
      } catch (err) {
        console.error(err)
        const isFeegowError = err.message?.includes('Feegow')
        setErrorMessage(
          isFeegowError
            ? err.message
            : 'Este horário foi preenchido recentemente por outro paciente. Por favor, selecione outra vaga.'
        )
        if (!isFeegowError) {
          loadSlots()
        }
      } finally {
        setSubmitting(false)
      }

    } else {
      // Já sou paciente
      if (!phone.trim()) {
        setErrorMessage('Por favor, preencha o celular.')
        return
      }

      if (!foundPatientId) {
        setErrorMessage('Por favor, busque seu cadastro antes de confirmar.')
        return
      }

      setSubmitting(true)
      setErrorMessage(null)

      try {
        const formattedDate = format(selectedDate, 'dd-MM-yyyy')
        const targetProcId = isTestMode ? 338 : selectedProcedure?.feegowId
        const targetProfId = isTestMode ? 1 : selectedProcedure?.professionalId

        await createAppointment({
          local_id: selectedLocalId || scarcitySlotsForDate.localId,
          paciente_id: foundPatientId,
          procedimento_id: targetProcId,
          data: formattedDate,
          horario: selectedTime,
          notas: `Agendamento automático via link online (${isTestMode ? 'Teste' : selectedProcedure?.professionalName}). Origem/UTM: ID ${getOrigemId()}.`,
          profissional_id: targetProfId
        })

        setAppointmentDetails({
          procedureName: selectedProcedure?.name || DEFAULT_PROCEDURE.name,
          date: format(selectedDate, 'dd/MM/yyyy'),
          time: selectedTime?.substring(0, 5) || ''
        })

        setStage(STAGES.SUCCESS)
      } catch (err) {
        console.error(err)
        const isFeegowError = err.message?.includes('Feegow')
        setErrorMessage(
          isFeegowError
            ? err.message
            : 'Este horário foi preenchido recentemente por outro paciente. Por favor, selecione outra vaga.'
        )
        if (!isFeegowError) {
          loadSlots()
        }
      } finally {
        setSubmitting(false)
      }
    }
  }

  // Combined list of dates with slots plus the selected date if it's outside the list
  const weekdaysWithSelected = useMemo(() => {
    if (datesWithSlots.length === 0) return []

    const isSelectedInList = datesWithSlots.some(
      day => format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    )
    if (!isSelectedInList && selectedDate) {
      const combined = [...datesWithSlots, selectedDate]
      return combined.sort((a, b) => a.getTime() - b.getTime())
    }
    return datesWithSlots
  }, [datesWithSlots, selectedDate])

  // Auto-select first date that actually has slots when slots are loaded or selectedDate becomes invalid
  useEffect(() => {
    if (datesWithSlots.length > 0) {
      const hasSlotsForSelected = datesWithSlots.some(
        day => format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      )
      if (!hasSlotsForSelected) {
        setSelectedDate(datesWithSlots[0])
      }
    }
  }, [datesWithSlots, selectedDate])

  const handleCalendarDateSelect = (date) => {
    const isHeadSpa = selectedProcedure?.id === 'head-spa'
    const dayOfWeek = date.getDay()
    
    let isValid = false
    let message = ''
    
    if (isHeadSpa) {
      isValid = (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3)
      message = 'O Head Spa da profissional Raquel Nina está disponível apenas de segunda a quarta-feira. Por favor, escolha um desses dias.'
    } else {
      isValid = (dayOfWeek !== 0 && dayOfWeek !== 6)
      message = 'A clínica não realiza atendimentos aos finais de semana (sábado e domingo). Por favor, escolha um dia útil.'
    }
    
    if (!isValid) {
      alert(message)
      return
    }
    
    setSelectedDate(date)
    setSelectedTime(null)
  }

  const renderProcedureStage = () => {
    const categories = ['Recuperação', 'Desintoxicação', 'Reset Mental']

    const getCategoryFooter = (category) => {
      const categoryProcs = PROCEDURES.filter(p => p.category === category)
      const uniqueProfs = [...new Set(categoryProcs.map(p => p.professionalName))]
      return `${categoryProcs.length} procedimento${categoryProcs.length > 1 ? 's' : ''} • com ${uniqueProfs.join(', ')}`
    }

    return (
      <div className="w-full max-w-6xl px-4">
        <header className="mb-12 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Agendamento Online</span>
          <h2 className="text-4xl font-serif mt-2 text-[#2e2a25]">Escolha o seu Atendimento</h2>
          <p className="text-sm text-[#7a7065] mt-2">Selecione uma categoria e o procedimento desejado para continuar</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((category) => {
            const categoryProcs = PROCEDURES.filter((p) => p.category === category)

            return (
              <div 
                key={category} 
                className="bg-white border border-[#e6e2dc] rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div>
                  <div className="border-b border-[#e6e2dc] pb-4 mb-6 flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-serif text-[#2e2a25] font-medium">{category}</h3>
                      <p className="text-[10px] text-[#a29382] tracking-wider uppercase mt-1">
                        {category === 'Recuperação' && 'Alívio & Regeneração'}
                        {category === 'Desintoxicação' && 'Purificação & Forma'}
                        {category === 'Reset Mental' && 'Equilíbrio & Relaxamento'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-4 p-1.5 bg-[#c5a059]/5 border border-[#c5a059]/10 rounded-xl text-[#c5a059]">
                      {category === 'Recuperação' && (
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                          <path d="M6 21c0-4 2.5-6.5 6-6.5s6 2.5 6 6.5" />
                          <path d="M3 11c1-.7 2-.7 3 0s2 .7 3 0" />
                          <path d="M15 11c1-.7 2-.7 3 0s2 .7 3 0" />
                          <circle cx="12" cy="9.5" r="1.5" fill="#c5a059" fillOpacity="0.15" />
                          <circle cx="9" cy="14" r="1.5" fill="#c5a059" fillOpacity="0.15" />
                          <circle cx="15" cy="14" r="1.5" fill="#c5a059" fillOpacity="0.15" />
                        </svg>
                      )}
                      {category === 'Desintoxicação' && (
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                          <path d="M12 8c-1.5 1.5-1.5 3.5 0 5s1.5 3.5 0 5" />
                          <path d="M9 11c1 1.5 1 3.5 0 5" strokeDasharray="1 1" />
                        </svg>
                      )}
                      {category === 'Reset Mental' && (
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-2-4-2.5c-.5.5-2 1-4 2.5S5 12 5 14a7 7 0 0 0 7 7z" />
                          <path d="M12 7c.5-1 1.5-2 3-2s-1 2.5-3 2.5z" />
                          <path d="M12 7c-.5-1-1.5-2-3-2s1 2.5 3 2.5z" />
                          <path d="M10 14c.5.5 1.5.5 2 0" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    {categoryProcs.map((proc) => (
                      <button
                        key={proc.id}
                        onClick={() => handleProcedureSelect(proc)}
                        className="w-full text-left bg-[#fdfbf7] hover:bg-[#c5a059]/5 border border-[#e6e2dc] hover:border-[#c5a059] rounded-xl p-4 transition-all duration-300 group cursor-pointer flex flex-col justify-between shadow-sm"
                      >
                        <div className="w-full">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-semibold text-sm text-[#2e2a25] group-hover:text-[#c5a059] transition-colors">
                              {proc.name}
                            </h4>
                            <span className="text-[10px] bg-white border border-[#e6e2dc] text-[#7a7065] px-2 py-0.5 rounded-full whitespace-nowrap">
                              60 min
                            </span>
                          </div>
                          <p className="text-xs text-[#7a7065] mt-1.5 leading-relaxed">
                            {proc.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between w-full mt-4 pt-2.5 border-t border-[#f2efeb] text-[10px] text-[#a29382]">
                          <span>Por: {proc.professionalName}</span>
                          <span className="text-[#c5a059] font-semibold flex items-center gap-0.5">
                            Selecionar
                            <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#e6e2dc] pt-4 text-[11px] text-[#7a7065] font-serif italic text-center">
                  {getCategoryFooter(category)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderDateTimeStage = () => {
    const hasSlots = Object.keys(availableSlots).length > 0

    return (
      <div className="w-full max-w-3xl px-4">
        <button 
          onClick={() => {
            setSelectedProcedure(null)
            setSelectedTime(null)
            setStage(STAGES.PROCEDURE)
          }}
          className="flex items-center text-sm text-[#7a7065] hover:text-[#c5a059] mb-6 transition-colors cursor-pointer"
        >
          ← Voltar para Procedimentos
        </button>

        <header className="mb-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Agendamento Online</span>
          <h2 className="text-4xl font-serif mt-2 text-[#2e2a25]">{selectedProcedure?.name || 'Agenda Recovery e Bem-estar'}</h2>
          <p className="text-sm text-[#7a7065] mt-2">Profissional: {selectedProcedure?.professionalName || 'Monica Sousa'}</p>
        </header>

        {/* Test Mode Notification Banners */}
        {(!isTestMode && !hasSlots && !loadingSlots && selectedProcedure) && (
          <div className="mb-6 p-4 rounded-lg bg-[#faf0e6] border border-[#e6d0ba] text-[#8c6d53] text-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <p className="font-semibold">⚠️ Sem horários cadastrados</p>
              <p className="text-xs mt-1 text-[#9e826c]">
                A profissional {selectedProcedure?.professionalName || 'Monica Sousa'} (ID {selectedProcedure?.professionalId}) não possui horários ativos no Feegow. 
                Para testar o fluxo de agendamento localmente, clique no botão ao lado para carregar a agenda de teste (Dr. Deangelo ID 1).
              </p>
            </div>
            <button
              onClick={() => {
                setIsTestMode(true)
              }}
              className="bg-[#c5a059] hover:bg-[#b08e4f] text-white text-xs font-semibold px-4 py-2 rounded transition-colors whitespace-nowrap shadow-sm cursor-pointer"
            >
              Usar Agenda de Teste
            </button>
          </div>
        )}

        {isTestMode && activeProfessionalId === '1' && (
          <div className="mb-6 p-3 rounded-lg bg-[#ebf3e3] border border-[#c6dcae] text-[#5c7a40] text-xs flex justify-between items-center shadow-sm">
            <span>
              🛠️ <strong>Modo de Teste Ativo:</strong> Carregando horários do Dr. Deangelo (ID 1). O agendamento final será registrado nesta agenda.
            </span>
            <button 
              onClick={() => {
                setIsTestMode(false)
              }}
              className="text-[#5c7a40] hover:underline font-bold ml-2 whitespace-nowrap cursor-pointer"
            >
              Restaurar {selectedProcedure?.professionalName || 'Monica Sousa'}
            </button>
          </div>
        )}

        {/* Connection Error Banner with Try Again Button */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between items-center leading-relaxed">
            <span>{errorMessage}</span>
            <button 
              onClick={loadSlots}
              className="bg-[#c5a059] text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-[#b08e4f] transition-colors cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Seletor de Datas e Horários ou Mensagem de Sem Vagas */}
        {!loadingSlots && datesWithSlots.length === 0 ? (
          <div className="my-12 py-10 px-6 bg-[#faf9f6] border border-[#e6e2dc] rounded-2xl text-center max-w-xl mx-auto shadow-sm">
            <h3 className="text-2xl font-serif text-[#2e2a25] mb-4">Agenda Totalmente Preenchida</h3>
            <p className="text-sm text-[#7a7065] mb-8 leading-relaxed">
              Nossos horários online para este procedimento com {selectedProcedure?.professionalName || 'a profissional'} estão temporariamente esgotados nos próximos dias.
              Para solicitar um horário de encaixe personalizado ou entrar na lista de espera, entre em contato direto com a nossa recepção via WhatsApp.
            </p>
            <a 
              href={import.meta.env.VITE_CLINIC_WHATSAPP || 'https://wa.me/5511999999999'} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center justify-center bg-[#c5a059] hover:bg-[#b08e4f] text-white font-bold py-3.5 px-8 rounded-lg uppercase tracking-widest text-xs transition-colors shadow-md text-center cursor-pointer"
            >
              Solicitar Encaixe no WhatsApp
            </a>
          </div>
        ) : (
          <>
            {/* Quick Date Selector tabs */}
            <div className="mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-3">1. Escolha o Dia</h3>
              <div className="flex gap-2 items-center overflow-x-auto pb-3 scrollbar-thin">
                {weekdaysWithSelected.map((day, idx) => {
                  const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedDate(day)
                        setSelectedTime(null)
                      }}
                      className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' 
                          : 'border-[#e6e2dc] bg-white text-[#7a7065] hover:border-[#a29382] hover:text-[#2e2a25]'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-medium">{format(day, 'eee', { locale: ptBR })}</span>
                      <span className="text-xl font-bold mt-1">{format(day, 'd')}</span>
                      <span className="text-[10px] uppercase">{format(day, 'MMM', { locale: ptBR })}</span>
                    </button>
                  )
                })}

                {/* Calendário Selector Button */}
                <div 
                  onClick={handleCalendarButtonClick}
                  className="relative flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-lg border border-[#e6e2dc] bg-white text-[#7a7065] hover:border-[#c5a059] hover:text-[#c5a059] hover:bg-[#c5a059]/5 transition-all duration-200 cursor-pointer overflow-hidden group"
                >
                  <svg className="w-5 h-5 mb-1 text-[#7a7065] group-hover:text-[#c5a059] transition-colors pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[9px] font-semibold tracking-wider text-center pointer-events-none">Outro Dia</span>
                  <input 
                    ref={dateInputRef}
                    type="date"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [year, month, day] = e.target.value.split('-').map(Number);
                        const chosenDate = new Date(year, month - 1, day);
                        handleCalendarDateSelect(chosenDate);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                </div>
              </div>
            </div>

            {/* Time Selector grids */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-4">2. Horários Disponíveis</h3>

              {loadingSlots ? (
                <div className="flex justify-center items-center py-12 text-[#7a7065]">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c5a059] border-t-transparent mr-2" />
                  Consultando agenda da Feegow...
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Morning section */}
                  <div>
                    <h4 className="text-sm font-medium text-[#7a7065] mb-3 border-b border-[#e6e2dc] pb-1">Manhã</h4>
                    {scarcitySlotsForDate.morning.length === 0 ? (
                      <p className="text-xs text-[#a29382] italic">Sem horários livres no turno da manhã.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {scarcitySlotsForDate.morning.map(time => (
                          <button
                            key={time}
                            onClick={() => handleTimeSelect(time, scarcitySlotsForDate.localId)}
                            className="bg-white hover:bg-[#c5a059] border border-[#e6e2dc] hover:border-[#c5a059] text-[#2e2a25] hover:text-white font-medium py-3 rounded-lg text-sm text-center transition-all duration-200 shadow-sm cursor-pointer"
                          >
                            {time.substring(0, 5)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Afternoon section */}
                  <div>
                    <h4 className="text-sm font-medium text-[#7a7065] mb-3 border-b border-[#e6e2dc] pb-1">Tarde</h4>
                    {scarcitySlotsForDate.afternoon.length === 0 ? (
                      <p className="text-xs text-[#a29382] italic">Sem horários livres no turno da tarde.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {scarcitySlotsForDate.afternoon.map(time => (
                          <button
                            key={time}
                            onClick={() => handleTimeSelect(time, scarcitySlotsForDate.localId)}
                            className="bg-white hover:bg-[#c5a059] border border-[#e6e2dc] hover:border-[#c5a059] text-[#2e2a25] hover:text-white font-medium py-3 rounded-lg text-sm text-center transition-all duration-200 shadow-sm cursor-pointer"
                          >
                            {time.substring(0, 5)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Evening section */}
                  <div>
                    <h4 className="text-sm font-medium text-[#7a7065] mb-3 border-b border-[#e6e2dc] pb-1">Noite</h4>
                    {scarcitySlotsForDate.evening.length === 0 ? (
                      <p className="text-xs text-[#a29382] italic">Sem horários livres no turno da noite.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {scarcitySlotsForDate.evening.map(time => (
                          <button
                            key={time}
                            onClick={() => handleTimeSelect(time, scarcitySlotsForDate.localId)}
                            className="bg-white hover:bg-[#c5a059] border border-[#e6e2dc] hover:border-[#c5a059] text-[#2e2a25] hover:text-white font-medium py-3 rounded-lg text-sm text-center transition-all duration-200 shadow-sm cursor-pointer"
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
          </>
        )}
      </div>
    )
  }

  const renderFormStage = () => {
    return (
      <div className="w-full max-w-md px-4">
        <button 
          onClick={() => setStage(STAGES.DATETIME)}
          className="flex items-center text-sm text-[#7a7065] hover:text-[#c5a059] mb-6 transition-colors cursor-pointer"
        >
          ← Voltar para Horários
        </button>

        <header className="mb-8 border-b border-[#e6e2dc] pb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Você selecionou</span>
          <h2 className="text-xl font-serif mt-1 text-[#2e2a25]">{selectedProcedure?.name || 'Atendimento Estético'}</h2>
          <p className="text-sm text-[#7a7065] mt-1">
            Dia {format(selectedDate, 'dd/MM/yyyy')} às {selectedTime?.substring(0, 5) || ''} com {isTestMode ? 'Médico de Teste' : selectedProcedure?.professionalName} {isTestMode && '(Agenda Teste)'}
          </p>
        </header>

        {/* Abas */}
        <div className="flex border-b border-[#e6e2dc] mb-6">
          <button
            type="button"
            onClick={() => {
              setIsFirstTime(true)
              setFoundPatientId(null)
              setFoundPatientName('')
              setSearchFailed(false)
              setErrorMessage(null)
            }}
            className={`flex-1 text-center py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border-b-2 cursor-pointer ${
              isFirstTime
                ? 'border-[#c5a059] text-[#c5a059]'
                : 'border-transparent text-[#7a7065] hover:text-[#2e2a25]'
            }`}
          >
            Primeira Vez
          </button>
          <button
            type="button"
            onClick={() => {
              setIsFirstTime(false)
              setFoundPatientId(null)
              setFoundPatientName('')
              setSearchFailed(false)
              setErrorMessage(null)
            }}
            className={`flex-1 text-center py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border-b-2 cursor-pointer ${
              !isFirstTime
                ? 'border-[#c5a059] text-[#c5a059]'
                : 'border-transparent text-[#7a7065] hover:text-[#2e2a25]'
            }`}
          >
            Já sou paciente
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm leading-relaxed">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleBooking} className="space-y-6">
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
                  onChange={e => setBirthDate(e.target.value)}
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
                  onChange={e => setPhone(e.target.value)}
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
            /* Campos Já sou paciente */
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-2">WhatsApp / Celular *</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(DD) 99999-9999"
                  required
                  className="w-full bg-white border border-[#e6e2dc] rounded-lg px-4 py-3 text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors shadow-sm"
                />
              </div>

              {searchFailed && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm leading-relaxed">
                    Não encontramos nenhum cadastro com este celular. Por favor, entre em contato pelo WhatsApp para atualizar seus dados.
                  </div>
                  <a 
                    href={import.meta.env.VITE_CLINIC_WHATSAPP || 'https://wa.me/5511999999999'} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="mt-4 inline-flex items-center justify-center w-full bg-[#25d366] hover:bg-[#20ba5a] text-white font-bold py-3 rounded-lg uppercase tracking-wider text-xs transition-colors shadow-md text-center"
                  >
                    Falar no WhatsApp
                  </a>
                </div>
              )}

              {foundPatientId ? (
                <div className="space-y-4">
                  <p className="text-sm text-[#7a7065] font-medium bg-[#fcf9f2] border border-[#e6e2dc] p-4 rounded-lg">
                    Olá, <strong className="text-[#2e2a25]">{foundPatientName}</strong>! Encontramos seu cadastro. Deseja confirmar seu agendamento?
                  </p>
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
              ) : (
                !searchingPatient && (
                  <button 
                    type="button"
                    onClick={handleSearchPatient}
                    className="w-full bg-[#c5a059] hover:bg-[#b08e4f] text-white font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors flex items-center justify-center shadow-md cursor-pointer"
                  >
                    Buscar Cadastro
                  </button>
                )
              )}

              {searchingPatient && (
                <div className="flex justify-center items-center py-4 text-sm text-[#7a7065]">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#c5a059] border-t-transparent mr-2" />
                  Buscando cadastro...
                </div>
              )}
            </>
          )}
        </form>
      </div>
    )
  }

  const renderSuccessStage = () => (
    <div className="w-full max-w-md px-4 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#c5a059]/10 text-[#c5a059] mb-6 border border-[#c5a059]/20 shadow-sm">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <h2 className="text-3xl font-serif text-[#2e2a25] mb-2">Agendamento Realizado!</h2>
      <p className="text-sm text-[#7a7065] mb-8 leading-relaxed">
        Seu horário com {isTestMode ? 'Médico de Teste' : selectedProcedure?.professionalName} foi registrado com sucesso na Feegow. Te esperamos!
      </p>

      <div className="bg-[#faf9f6] border border-[#e6e2dc] rounded-xl p-6 text-left space-y-4 mb-8 shadow-sm">
        <div>
          <span className="text-[10px] uppercase font-semibold tracking-widest text-[#7a7065] block">Atendimento</span>
          <span className="text-[#2e2a25] font-medium">{selectedProcedure?.name}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] uppercase font-semibold tracking-widest text-[#7a7065] block">Data</span>
            <span className="text-[#2e2a25] font-medium">{appointmentDetails?.date}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold tracking-widest text-[#7a7065] block">Horário</span>
            <span className="text-[#2e2a25] font-medium">{appointmentDetails?.time}h</span>
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase font-semibold tracking-widest text-[#7a7065] block">Profissional</span>
          <span className="text-[#2e2a25] font-medium">{isTestMode ? 'Médico de Teste' : selectedProcedure?.professionalName}</span>
        </div>
      </div>

      <button 
        onClick={() => {
          setSelectedProcedure(null)
          setSelectedTime(null)
          setName('')
          setPhone('')
          setCpf('')
          setEmail('')
          setBirthDate('')
          setFoundPatientId(null)
          setFoundPatientName('')
          setSearchFailed(false)
          setStage(STAGES.PROCEDURE)
        }}
        className="text-xs uppercase tracking-widest text-[#c5a059] hover:underline font-semibold cursor-pointer"
      >
        Marcar outro agendamento
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#2e2a25] flex flex-col items-center justify-start py-10 font-sans">
      <div className="mb-6 flex justify-center">
        <img src={salvusLogo} alt="Clínica Salvus" className="h-20 md:h-24 object-contain" />
      </div>
      
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
