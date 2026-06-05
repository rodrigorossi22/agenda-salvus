/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo, useCallback } from 'react'
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

  // Filter slots based on the Date, apply 60-min minimum duration filter and Scarcity rules
  const scarcitySlotsForDate = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    
    let morning = []
    let afternoon = []
    let evening = []
    let foundLocalId = null

    // Helper to add 30 minutes to an HH:MM:SS time string
    const add30Minutes = (timeStr) => {
      const [h, m, s] = timeStr.split(':').map(Number)
      let newM = m + 30
      let newH = h
      if (newM >= 60) {
        newM -= 60
        newH += 1
      }
      const pad = (n) => String(n).padStart(2, '0')
      return `${pad(newH)}:${pad(newM)}:${pad(s)}`
    }

    const isHeadSpa = selectedProcedure?.id === 'head-spa'

    for (const localId of Object.keys(availableSlots)) {
      const dateSlots = availableSlots[localId]?.[dateKey] || []
      if (dateSlots.length > 0) {
        foundLocalId = localId

        // Filter: Keep slot only if:
        // 1. It fits the professional's hours (Monica starts before 20:00, Raquel between 14:00 and 16:00)
        // 2. The subsequent 30-min block is also available (requires 60 min total)
        const validSlots = dateSlots.filter(time => {
          if (isHeadSpa) {
            // Raquel rules: strictly between 14h and 17h, last slot starts at 16h
            if (time < '14:00:00' || time > '16:00:00') return false
          } else {
            // Monica rules: starts before 20h
            if (time >= '20:00:00') return false
          }
          const nextTime = add30Minutes(time)
          return dateSlots.includes(nextTime)
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
        setErrorMessage(
          err.message?.includes('Feegow')
            ? err.message
            : 'Este horário foi preenchido recentemente por outro paciente. Por favor, selecione outra vaga.'
        )
        loadSlots()
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
        setErrorMessage(
          err.message?.includes('Feegow')
            ? err.message
            : 'Este horário foi preenchido recentemente por outro paciente. Por favor, selecione outra vaga.'
        )
        loadSlots()
      } finally {
        setSubmitting(false)
      }
    }
  }

  // Weekdays only horizontal list builder (14 days, skipping sat/sun)
  const weekdays = useMemo(() => {
    const list = []
    let current = new Date()
    const isHeadSpa = selectedProcedure?.id === 'head-spa'
    
    while (list.length < 14) {
      const dayOfWeek = current.getDay() // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
      
      if (isHeadSpa) {
        // Raquel: Only Mondays (1), Tuesdays (2), Wednesdays (3)
        if (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3) {
          list.push(new Date(current))
        }
      } else {
        // Monica: Mon to Fri (exclude Sat/Sun)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          list.push(new Date(current))
        }
      }
      current = addDays(current, 1)
    }
    return list
  }, [selectedProcedure])

  // Combined list of weekdays plus the selected date if it's outside the standard 14 days
  const weekdaysWithSelected = useMemo(() => {
    const isSelectedInList = weekdays.some(
      day => format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    )
    if (!isSelectedInList && selectedDate) {
      const combined = [...weekdays, selectedDate]
      return combined.sort((a, b) => a.getTime() - b.getTime())
    }
    return weekdays
  }, [weekdays, selectedDate])

  // Auto-reset selected date to the first available day if it's invalid according to procedure rules
  useEffect(() => {
    if (weekdays.length > 0) {
      const dayOfWeek = selectedDate.getDay()
      const isHeadSpa = selectedProcedure?.id === 'head-spa'
      let isValid = false
      if (isHeadSpa) {
        isValid = (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3)
      } else {
        isValid = (dayOfWeek !== 0 && dayOfWeek !== 6)
      }
      
      if (!isValid) {
        setSelectedDate(weekdays[0])
      }
    }
  }, [selectedProcedure, selectedDate, weekdays])

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
                  <div className="border-b border-[#e6e2dc] pb-4 mb-6">
                    <h3 className="text-xl font-serif text-[#2e2a25] font-medium">{category}</h3>
                    <p className="text-[10px] text-[#a29382] tracking-wider uppercase mt-1">
                      {category === 'Recuperação' && 'Alívio & Regeneração'}
                      {category === 'Desintoxicação' && 'Purificação & Forma'}
                      {category === 'Reset Mental' && 'Equilíbrio & Relaxamento'}
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    {categoryProcs.map((proc) => (
                      <button
                        key={proc.id}
                        onClick={() => handleProcedureSelect(proc)}
                        className="w-full text-left bg-[#fdfbf7] hover:bg-[#c5a059]/5 border border-[#e6e2dc] hover:border-[#c5a059] rounded-xl p-4 transition-all duration-300 group cursor-pointer flex flex-col justify-between shadow-sm"
                      >
                        <div className="flex gap-4 items-start w-full">
                          {/* Ilustração Colorida em SVG à esquerda */}
                          <div className="w-16 h-16 flex-shrink-0 bg-white border border-[#e6e2dc] group-hover:border-[#c5a059]/30 rounded-xl flex items-center justify-center p-1 shadow-sm transition-colors">
                            {proc.id === 'ventosaterapia' && (
                              <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 38c6-5 12-8 18-8s12 3 18 8v6H6v-6z" fill="#f5d6c6" />
                                <path d="M24 30c-2-6-5-10-8-14" stroke="#e0b29b" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M24 30c2-6 5-10 8-14" stroke="#e0b29b" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M20 22a4 4 0 0 1 8 0v2h-8v-2z" fill="#a0d8ef" fillOpacity="0.6" stroke="#5cb3d1" strokeWidth="1.2" />
                                <path d="M22 24a2 2 0 0 1 4 0h-4z" fill="#e78572" />
                                <circle cx="24" cy="20" r="1" fill="#fff" fillOpacity="0.8" />
                                <path d="M11 26a4 4 0 0 1 8 0v2h-8v-2z" fill="#a0d8ef" fillOpacity="0.6" stroke="#5cb3d1" strokeWidth="1.2" />
                                <path d="M13 28a2 2 0 0 1 4 0h-4z" fill="#e78572" />
                                <circle cx="15" cy="24" r="1" fill="#fff" fillOpacity="0.8" />
                                <path d="M29 26a4 4 0 0 1 8 0v2h-8v-2z" fill="#a0d8ef" fillOpacity="0.6" stroke="#5cb3d1" strokeWidth="1.2" />
                                <path d="M31 28a2 2 0 0 1 4 0h-4z" fill="#e78572" />
                                <circle cx="33" cy="24" r="1" fill="#fff" fillOpacity="0.8" />
                              </svg>
                            )}
                            {proc.id === 'eletroestimulacao' && (
                              <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M24 6c-8 6-10 14-10 18s2 12 10 18c8-6 10-14 10-18S32 12 24 6z" fill="#e57373" fillOpacity="0.3" />
                                <path d="M24 6c-4 6-6 14-6 18s2 12 6 18c4-6 6-14 6-18s-2-12-6-18z" fill="#e57373" fillOpacity="0.6" />
                                <path d="M24 6v36M21 9c-3 5-4 11-4 15s1 10 4 15M27 9c3 5 4 11 4 15s-1 10-4 15" stroke="#ff8a80" strokeWidth="1" />
                                <rect x="18" y="20" width="12" height="8" rx="2" fill="#5c6bc0" stroke="#3f51b5" strokeWidth="1" />
                                <circle cx="24" cy="24" r="2" fill="#fff" />
                                <path d="M5 24h6l2-4 2 8 2-6 2 2h4" stroke="#29b6f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M30 24h4l2-4 2 8 2-6 2 2h6" stroke="#29b6f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                            {proc.id === 'shape-detox' && (
                              <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16 8c2 4 1 12 0 28s6 12 8 12 8-4 8-12-2-16-2-28" fill="#f5d6c6" />
                                <path d="M16 22c3 1 5 3 8 3s5-2 8-3v4c-3 4-5 5-8 5s-5-1-8-5v-4z" fill="#e8f5e9" stroke="#c8e6c9" strokeWidth="0.8" />
                                <circle cx="34" cy="14" r="8" fill="#81c784" stroke="#4caf50" strokeWidth="1" />
                                <path d="M31 15.5l2-3 2 3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M32 13.5c1-1 2.5-1 2.5-1s0 1.5-1 2.5c-.8.8-1.5 1-1.5 1s0-.7.7-1.5z" fill="#fff" />
                                <path d="M34 11.5c.8-.8 2-.8 2-.8s0 1.2-1 2c-.6.6-1.2.8-1.2.8s0-.6.5-1.2z" fill="#fff" />
                              </svg>
                            )}
                            {proc.id === 'drenagem-linfatica' && (
                              <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 28c8-1 16-2 24-2s12 1 16 3v5H4v-6z" fill="#faf9f6" stroke="#e6e2dc" strokeWidth="1" />
                                <path d="M8 23c6-2 15-3 22-1s12 3 14 5" stroke="#e0b29b" strokeWidth="1.5" fill="#f5d6c6" />
                                <circle cx="41" cy="22" r="3.5" fill="#f5d6c6" stroke="#e0b29b" strokeWidth="1" />
                                <path d="M18 15c1 1 2 4 0 6" stroke="#c5a059" strokeWidth="2.5" strokeLinecap="round" />
                                <path d="M23 14c1 1 2 4 0 6" stroke="#c5a059" strokeWidth="2.5" strokeLinecap="round" />
                                <path d="M12 21c2-1 4-1 6 0" stroke="#81c784" strokeWidth="1.2" strokeLinecap="round" />
                                <path d="M15 21l3-1-2-2" stroke="#81c784" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                            {proc.id === 'head-spa' && (
                              <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 32c4-2 12-2 16 0v4H10v-4z" fill="#fff" stroke="#e6e2dc" strokeWidth="1" />
                                <path d="M12 25c2-3 5-5 8-5s6 2 8 5" stroke="#e0b29b" strokeWidth="1.5" fill="#f5d6c6" />
                                <path d="M20 20c-1-3-3-6-6-6s-6 3-6 6" fill="#5d4037" />
                                <path d="M15 11c1 1.5 2 3 1.5 4.5" stroke="#c5a059" strokeWidth="2.5" strokeLinecap="round" />
                                <path d="M12 2h12v3H12V2z" fill="#7a7065" />
                                <path d="M9 5h18l-3 4H12L9 5z" fill="#c5a059" />
                                <path d="M12 9l-4 9M18 9v10M24 9l4 9" stroke="#fff176" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                              </svg>
                            )}
                            {proc.id === 'massagem-relaxante' && (
                              <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 28c8-1 16-2 24-2s12 1 16 3v5H4v-6z" fill="#faf9f6" stroke="#e6e2dc" strokeWidth="1" />
                                <path d="M8 23c6-2 15-3 22-1s12 3 14 5" stroke="#e0b29b" strokeWidth="1.5" fill="#f5d6c6" />
                                <path d="M20 16c2 1 3 3.5 1.5 5" stroke="#c5a059" strokeWidth="2.5" strokeLinecap="round" />
                                <path d="M26 15c2 1 3 3.5 1.5 5" stroke="#c5a059" strokeWidth="2.5" strokeLinecap="round" />
                                <ellipse cx="14" cy="22" rx="3" ry="1.5" fill="#37474f" />
                                <ellipse cx="21" cy="21" rx="3.5" ry="1.5" fill="#37474f" />
                                <ellipse cx="28" cy="21.5" rx="3" ry="1.5" fill="#37474f" />
                                <path d="M33 13l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill="#fff176" />
                              </svg>
                            )}
                          </div>

                          <div className="flex-1">
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
            <div className="relative flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-lg border border-[#e6e2dc] bg-white text-[#7a7065] hover:border-[#c5a059] hover:text-[#c5a059] hover:bg-[#c5a059]/5 transition-all duration-200 cursor-pointer overflow-hidden group">
              <svg className="w-5 h-5 mb-1 text-[#7a7065] group-hover:text-[#c5a059] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[9px] font-semibold tracking-wider text-center">Outro Dia</span>
              <input 
                type="date"
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    const chosenDate = new Date(year, month - 1, day);
                    handleCalendarDateSelect(chosenDate);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
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
