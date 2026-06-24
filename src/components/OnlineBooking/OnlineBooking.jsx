/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchAvailableSchedule, searchPatient, createPatient, createAppointment, fetchProcedures, fetchAppointments } from '../../services/feegow'
import salvusLogo from '../../assets/logo_transparent.png'

import WelcomeStage from './WelcomeStage'
import IdentificationStage from './IdentificationStage'
import ProcedureStage from './ProcedureStage'
import DateTimeStage from './DateTimeStage'
import FormStage from './FormStage'
import SuccessStage from './SuccessStage'

const DEFAULT_PROCEDURE = {
  id: 149, // Outros (Consulta de Avaliação Estética) na Feegow
  name: 'Atendimento Estético',
  duration: 60
}

const STAGES = {
  WELCOME: 'WELCOME',
  IDENTIFICATION: 'IDENTIFICATION',
  PROCEDURE: 'PROCEDURE',
  DATETIME: 'DATETIME',
  FORM: 'FORM',
  SUCCESS: 'SUCCESS'
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':').map(Number)
  return parts[0] * 60 + parts[1]
}

function normalizeName(name) {
  if (!name) return ''
  const prepositions = ['de', 'do', 'dos', 'das', 'da', 'e']
  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      if (prepositions.includes(word) && index > 0) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export default function OnlineBooking() {
  const [stage, setStage] = useState(STAGES.WELCOME)
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

  const [procedureDurations, setProcedureDurations] = useState({})
  const [professionalAppointmentsRange, setProfessionalAppointmentsRange] = useState([])
  const appointmentsForSelectedDate = useMemo(() => {
    if (!selectedDate || !professionalAppointmentsRange) return []
    const dateStr = format(selectedDate, 'dd-MM-yyyy')
    return professionalAppointmentsRange.filter(a => a.data === dateStr)
  }, [selectedDate, professionalAppointmentsRange])
  const [loadingAppointments, setLoadingAppointments] = useState(false)

  const [patientMonthlyAppointments, setPatientMonthlyAppointments] = useState([])
  const [loadingCpfHistory, setLoadingCpfHistory] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [appointmentDetails, setAppointmentDetails] = useState(null)

  // Custom active professional derived from test mode or selected procedure
  const activeProfessionalId = isTestMode ? '1' : (selectedProcedure?.professionalId || '15')

  const handlePhoneChange = (val) => {
    const newVal = typeof val === 'string' ? val : val.target.value
    setPhone(newVal)
    setFoundPatientId(null)
    setFoundPatientName('')
    setSearchFailed(false)
  }

  const handleBirthDateChange = (e) => {
    let value = e.target.value
    
    // Remove qualquer caractere não-numérico
    const digits = value.replace(/\D/g, '')
    
    // Limita o input a no máximo 8 dígitos (DDMMYYYY)
    const truncated = digits.slice(0, 8)
    
    // Aplica a máscara DD/MM/AAAA dinamicamente
    let formatted = ''
    if (truncated.length > 0) {
      formatted += truncated.slice(0, 2)
    }
    if (truncated.length > 2) {
      formatted += '/' + truncated.slice(2, 4)
    }
    if (truncated.length > 4) {
      formatted += '/' + truncated.slice(4, 8)
    }
    
    setBirthDate(formatted)
  }

  const handleBirthDateBlur = (e) => {
    let value = e.target.value
    if (!value) return

    const parts = value.split('/')
    if (parts.length === 3 && parts[2].length === 2) {
      const yy = Number(parts[2])
      const currentYear2Digits = new Date().getFullYear() % 100 // 26 em 2026
      
      // Regra de século: se for maior que o ano atual (26), assume século passado (19YY), senão século atual (20YY)
      const fullYear = yy > currentYear2Digits ? 1900 + yy : 2000 + yy
      
      parts[2] = String(fullYear)
      setBirthDate(parts.join('/'))
    }
  }

  const loadPatientAppointmentsHistory = useCallback(async (patientId) => {
    if (!patientId) return
    setLoadingCpfHistory(true)
    setErrorMessage(null)
    try {
      const today = new Date()
      const startYear = today.getFullYear()
      const startMonth = String(today.getMonth() + 1).padStart(2, '0')
      const dateStart = `01-${startMonth}-${startYear}` // Primeiro dia do mês atual

      const futureLimit = addDays(today, 60)
      const dateEnd = format(futureLimit, 'dd-MM-yyyy')

      const appts = await fetchAppointments(dateStart, dateEnd, patientId, true)
      const activeAppts = appts.filter(
        // Antes: [11, 12, 13, 14, 16, 21]. Agora, os status 11 (Cancelado), 12 (Falta) e 14 (Desmarcado)
        // NÃO são ignorados, ou seja, "gastam" a cota semanal/mensal do paciente.
        (a) => ![13, 16, 21].includes(a.status_id)
      )
      setPatientMonthlyAppointments(activeAppts)
    } catch (err) {
      console.error('Erro ao buscar histórico de agendamentos por celular:', err)
    } finally {
      setLoadingCpfHistory(false)
    }
  }, [])

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
        // Carrega o histórico de consultas imediatamente
        await loadPatientAppointmentsHistory(result.patient_id)
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

  // Load procedure durations from Feegow on mount
  useEffect(() => {
    async function loadDurations() {
      try {
        const list = await fetchProcedures()
        const map = {}
        list.forEach(p => {
          const id = p.id || p.procedimento_id
          const time = Number(p.tempo) || 60
          if (id) {
            map[id] = time
          }
        })
        setProcedureDurations(map)
      } catch (err) {
        console.error('Erro ao carregar durações dos procedimentos:', err)
      }
    }
    loadDurations()
  }, [])

  // O carregamento global de agendamentos foi movido para loadSlots para maior performance e validação macro.

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
      
      const [data, appts] = await Promise.all([
        fetchAvailableSchedule({
          procedimento_id: targetProcId,
          data_start: todayStr,
          data_end: futureStr,
          profissional_id: activeProfessionalId
        }),
        fetchAppointments(todayStr, futureStr, null, false)
      ])
      
      const filteredAppts = appts.filter(a => String(a.profissional_id) === String(activeProfessionalId))
      setProfessionalAppointmentsRange(filteredAppts)
      
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

  // Helper function to check if date is allowed under patient's weekly/monthly limits
  const isDateAllowed = useCallback((dateToCheck) => {
    if (isFirstTime || !foundPatientId) return true

    const checkYear = dateToCheck.getFullYear()
    const checkMonth = dateToCheck.getMonth()

    // 1. Limite Mensal: Máximo 2 por mês
    const monthlyCount = patientMonthlyAppointments.filter(appt => {
      if (!appt.data || typeof appt.data !== 'string' || !appt.data.includes('-')) return false
      const [d, m, y] = appt.data.split('-').map(Number)
      return (y === checkYear && (m - 1) === checkMonth)
    }).length
    if (monthlyCount >= 2) return false

    // 2. Limite Semanal: Apenas 1 por semana
    const getStartOfWeek = (d) => startOfWeek(d, { weekStartsOn: 1 }) // Segunda-feira
    const checkWeekStartStr = format(getStartOfWeek(dateToCheck), 'yyyy-MM-dd')

    const hasWeeklyAppt = patientMonthlyAppointments.some(appt => {
      if (!appt.data || typeof appt.data !== 'string' || !appt.data.includes('-')) return false
      const [d, m, y] = appt.data.split('-').map(Number)
      if (!d || !m || !y) return false
      const apptDate = new Date(y, m - 1, d)
      if (isNaN(apptDate.getTime())) return false
      return format(getStartOfWeek(apptDate), 'yyyy-MM-dd') === checkWeekStartStr
    })
    if (hasWeeklyAppt) return false

    return true
  }, [isFirstTime, foundPatientId, patientMonthlyAppointments])

  // Filter slots based on the Date, apply professional constraint rules & prevent collision
  const scarcitySlotsForDate = useMemo(() => {
    let morning = []
    let afternoon = []
    let evening = []
    let foundLocalId = null

    if (!selectedDate || isNaN(selectedDate.getTime()) || !availableSlots) return { morning, afternoon, evening, localId: foundLocalId }

    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    const dateStr = format(selectedDate, 'dd-MM-yyyy')
    const durationMinutes = procedureDurations[selectedProcedure?.feegowId] || 60


    // Se ultrapassou o limite (semanal ou mensal), não exibe nenhum slot
    if (!isDateAllowed(selectedDate)) {
      return { morning: [], afternoon: [], evening: [], localId: null }
    }

    for (const localId of Object.keys(availableSlots)) {
      const dateSlots = availableSlots[localId]?.[dateKey] || []
      if (dateSlots.length > 0) {
        foundLocalId = localId

        const validSlots = dateSlots.filter(time => {
          const slotStart = timeToMinutes(time)
          const slotEnd = slotStart + durationMinutes

          const CLINIC_END_TIME = 20 * 60 + 30; // 1230 minutos (20:30h)
          const fitsHours = slotEnd <= CLINIC_END_TIME
          
          if (!fitsHours) return false

          const hasCollision = appointmentsForSelectedDate.some(appt => {
            const apptStart = timeToMinutes(appt.horario)
            const apptDuration = Number(appt.duracao) || 60
            const apptEnd = apptStart + apptDuration

            // Overlap check
            return slotStart < apptEnd && slotEnd > apptStart
          })

          return !hasCollision
        })

        // Algoritmo de Slot Snapping (Encadeamento Matemático)
        const snappedSlots = []
        let nextAvailableTime = 0

        validSlots.forEach(time => {
          const slotStart = timeToMinutes(time)
          if (slotStart >= nextAvailableTime) {
            snappedSlots.push(time)
            nextAvailableTime = slotStart + durationMinutes
          }
        })

        // Contagem de horários noturnos já agendados na Feegow naquele dia (Independente de Convênio)
        const eveningAppointmentsCount = appointmentsForSelectedDate.filter(appt => {
           return timeToMinutes(appt.horario) >= timeToMinutes('18:00:00')
        }).length

        const dayOfWeek = selectedDate.getDay()
        const isRestrictedDay = (dayOfWeek === 2 || dayOfWeek === 4) // Terça ou Quinta

        snappedSlots.forEach(time => {
          if (time < '12:00:00') {
            morning.push(time)
          } else if (time >= '12:00:00' && time < '18:00:00') {
            afternoon.push(time)
          } else {
            if (isRestrictedDay) {
               if (eveningAppointmentsCount >= 1) {
                 // Bloqueio Total: A Mônica já tem paciente agendado após as 18h na Feegow, logo, não mostraremos nenhuma vaga noturna no Gympass.
               } else if (evening.length < 1) {
                 // Trava Visual (Abordagem B): Limita o paciente do Gympass a ver apenas 1 única vaga na tela.
                 evening.push(time)
               }
            } else {
               evening.push(time) // Dias normais, mostra tudo
            }
          }
        })
        break; // Stop at first local that has slots for this date
      }
    }

    // Pega os 3 primeiros horários encadeados de forma sequencial (Snapping)
    const limitedMorning = morning.slice(0, 3)
    const limitedAfternoon = afternoon.slice(0, 3)
    const limitedEvening = evening.slice(0, 3)

    return {
      morning: limitedMorning,
      afternoon: limitedAfternoon,
      evening: limitedEvening,
      localId: foundLocalId
    }
  }, [selectedDate, availableSlots, selectedProcedure, appointmentsForSelectedDate, procedureDurations, isDateAllowed])

  // Extract dates that actually have slots available for selected procedure
  const datesWithSlots = useMemo(() => {
    const dates = new Set()

    for (const localId of Object.keys(availableSlots)) {
      const dateMap = availableSlots[localId] || {}
      for (const dateKey of Object.keys(dateMap)) {
        if (!dateKey || typeof dateKey !== 'string' || !dateKey.includes('-')) continue;
        const slots = dateMap[dateKey] || []
        
        // Filter slots based on professional availability rules
        const hasValidSlot = slots.some(time => {
          const slotStart = timeToMinutes(time)
          const durationMinutes = procedureDurations[selectedProcedure?.feegowId] || 60
          const slotEnd = slotStart + durationMinutes

          const CLINIC_END_TIME = 20 * 60 + 30; // 1230 minutos (20:30h)
          return slotEnd <= CLINIC_END_TIME
        })

        // Converte a chave da data para verificar limites preventivamente
        const [year, month, day] = dateKey.split('-').map(Number)
        if (!year || isNaN(year)) continue;
        const dateToCheck = new Date(year, month - 1, day)
        if (isNaN(dateToCheck.getTime())) continue;

        // Se todos os filtros passaram, a data tem slot
        if (hasValidSlot && isDateAllowed(dateToCheck)) {
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
  }, [availableSlots, selectedProcedure, isDateAllowed, procedureDurations, professionalAppointmentsRange])

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

      const normalizedName = normalizeName(name)
      setName(normalizedName)

      try {
        // Implementar verificação de duplicidade na submissão: chamar searchPatient({ cpf })
        const existingPatient = await searchPatient({ cpf: cleanCpf })
        if (existingPatient) {
          setErrorMessage('Já existe um cadastro com este CPF. Por favor, use a opção "Já sou paciente".')
          setSubmitting(false)
          return
        }

        // Formatar a Data de Nascimento para o formato da API (YYYY-MM-DD)
        const parts = birthDate.split('/')
        const formattedBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`

        // Padrão Gympass (ID 23) conforme solicitação do usuário.
        const originId = 23
        
        // Criar paciente
        const newPatientId = await createPatient({
          nome_completo: normalizedName,
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

      // Verificação final e rigorosa de limites na submissão
      if (!isDateAllowed(selectedDate)) {
        // Encontra qual limite foi violado para lançar o aviso correto
        const checkYear = selectedDate.getFullYear()
        const checkMonth = selectedDate.getMonth()
        const monthlyCount = patientMonthlyAppointments.filter(appt => {
          const [d, m, y] = appt.data.split('-').map(Number)
          return (y === checkYear && (m - 1) === checkMonth)
        }).length

        if (monthlyCount >= 2) {
          setErrorMessage('Este horário não está mais disponível para agendamento online. Por favor, fale no WhatsApp para consultar vagas.')
        } else {
          setErrorMessage('Identificamos que você já possui um agendamento nesta semana. A política da clínica permite apenas 1 agendamento por semana.')
        }
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

    if (!selectedDate || isNaN(selectedDate.getTime())) return datesWithSlots

    const isSelectedInList = datesWithSlots.some(
      day => !isNaN(day.getTime()) && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
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
      if (!selectedDate || isNaN(selectedDate.getTime())) {
        setSelectedDate(datesWithSlots[0])
        return
      }
      const hasSlotsForSelected = datesWithSlots.some(
        day => !isNaN(day.getTime()) && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
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

    // Valida limites se o paciente já foi identificado
    if (!isFirstTime && foundPatientId) {
      const allowed = isDateAllowed(date)
      if (!allowed) {
        const checkYear = date.getFullYear()
        const checkMonth = date.getMonth()
        const monthlyCount = patientMonthlyAppointments.filter(appt => {
          const [d, m, y] = appt.data.split('-').map(Number)
          return (y === checkYear && (m - 1) === checkMonth)
        }).length

        if (monthlyCount >= 2) {
          alert('Não há horários online disponíveis para este período. Por favor, entre em contato pelo WhatsApp para consultar encaixes na recepção.')
        } else {
          alert('A política da clínica permite apenas 1 agendamento por semana. Por favor, escolha outra data.')
        }
        return
      }
    }
    
    setSelectedDate(date)
    setSelectedTime(null)
  }

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
          {stage === STAGES.WELCOME && (
            <WelcomeStage
              onSelectOption={(option) => {
                if (option === 'PATIENT') {
                  setIsFirstTime(false)
                  setStage(STAGES.IDENTIFICATION)
                } else {
                  setIsFirstTime(true)
                  setStage(STAGES.PROCEDURE)
                }
              }}
            />
          )}

          {stage === STAGES.IDENTIFICATION && (
            <IdentificationStage
              phone={phone}
              onChangePhone={handlePhoneChange}
              searchingPatient={searchingPatient}
              searchFailed={searchFailed}
              foundPatientId={foundPatientId}
              foundPatientName={foundPatientName}
              errorMessage={errorMessage}
              onSearchPatient={handleSearchPatient}
              onBack={() => setStage(STAGES.WELCOME)}
              onProceed={(proceedAsFirstTime) => {
                if (proceedAsFirstTime) {
                  setIsFirstTime(true)
                  setFoundPatientId(null)
                  setFoundPatientName('')
                }
                setStage(STAGES.PROCEDURE)
              }}
            />
          )}

          {stage === STAGES.PROCEDURE && (
            <ProcedureStage
              onSelectProcedure={handleProcedureSelect}
              onBack={() => {
                if (!isFirstTime && foundPatientId) {
                  setStage(STAGES.IDENTIFICATION)
                } else {
                  setStage(STAGES.WELCOME)
                }
              }}
            />
          )}

          {stage === STAGES.DATETIME && (
            <DateTimeStage
              selectedProcedure={selectedProcedure}
              selectedDate={selectedDate}
              loadingSlots={loadingSlots}
              availableSlots={availableSlots}
              isTestMode={isTestMode}
              setIsTestMode={setIsTestMode}
              activeProfessionalId={activeProfessionalId}
              errorMessage={errorMessage}
              loadSlots={loadSlots}
              scarcitySlotsForDate={scarcitySlotsForDate}
              datesWithSlots={datesWithSlots}
              weekdaysWithSelected={weekdaysWithSelected}
              onSelectDate={setSelectedDate}
              onSelectTime={handleTimeSelect}
              handleCalendarDateSelect={handleCalendarDateSelect}
              onBack={() => {
                setSelectedProcedure(null)
                setSelectedTime(null)
                setStage(STAGES.PROCEDURE)
              }}
            />
          )}

          {stage === STAGES.FORM && (
            <FormStage
              isFirstTime={isFirstTime}
              selectedProcedure={selectedProcedure}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              isTestMode={isTestMode}
              name={name}
              setName={setName}
              cpf={cpf}
              setCpf={setCpf}
              birthDate={birthDate}
              onChangeBirthDate={handleBirthDateChange}
              onBlurBirthDate={handleBirthDateBlur}
              email={email}
              setEmail={setEmail}
              phone={phone}
              onChangePhone={handlePhoneChange}
              foundPatientName={foundPatientName}
              submitting={submitting}
              errorMessage={errorMessage}
              onBooking={handleBooking}
              onBack={() => setStage(STAGES.DATETIME)}
            />
          )}

          {stage === STAGES.SUCCESS && (
            <SuccessStage
              selectedProcedure={selectedProcedure}
              appointmentDetails={appointmentDetails}
              isTestMode={isTestMode}
              onReset={() => {
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
                setStage(STAGES.WELCOME)
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
