/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchAvailableSchedule, searchPatient, createPatient, createAppointment, fetchProcedures, fetchAppointments, updateAppointmentStatus } from '../../services/feegow'
import salvusLogo from '../../assets/logo_transparent.png'

import WelcomeStage from './WelcomeStage'
import IdentificationStage from './IdentificationStage'
import FlowSelectionStage from './FlowSelectionStage'
import ProcedureStage from './ProcedureStage'
import DateTimeStage from './DateTimeStage'
import FormStage from './FormStage'
import SuccessStage from './SuccessStage'
import WaitlistModal from './WaitlistModal'
import MyAppointmentsStage from './MyAppointmentsStage'
import ExclusiveSolutionsStage from './ExclusiveSolutionsStage'

const DEFAULT_PROCEDURE = {
  id: 338,
  feegowId: 338,
  name: 'Shape Detox Gympass',
  duration: 60
}

const STAGES = {
  WELCOME: 'WELCOME',
  IDENTIFICATION: 'IDENTIFICATION',
  FLOW_SELECTION: 'FLOW_SELECTION',
  PROCEDURE: 'PROCEDURE',
  DATETIME: 'DATETIME',
  FORM: 'FORM',
  SUCCESS: 'SUCCESS',
  MY_APPOINTMENTS: 'MY_APPOINTMENTS',
  EXCLUSIVE_SOLUTIONS: 'EXCLUSIVE_SOLUTIONS'
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':').map(Number)
  return parts[0] * 60 + parts[1]
}

function getEquipmentOccupancy(slotStart, slotEnd, appointmentsForDate) {
  if (!appointmentsForDate || appointmentsForDate.length === 0) return []

  const overlapping = appointmentsForDate.filter(appt => {
    if ([11, 12, 14].includes(Number(appt.status_id))) return false
    const apptStart = timeToMinutes(appt.horario)
    const apptDur = Number(appt.duracao) || 60
    const apptEnd = apptStart + apptDur
    return slotStart < apptEnd && slotEnd > apptStart
  })

  const ventosaCount = overlapping.filter(a =>
    Number(a.procedimento_id) === 346 ||
    String(a.procedimento_nome || '').toLowerCase().includes('ventosa')
  ).length

  const shapeDetoxCount = overlapping.filter(a =>
    Number(a.procedimento_id) === 338 ||
    String(a.procedimento_nome || '').toLowerCase().includes('shape detox')
  ).length

  const correnteRussaCount = overlapping.filter(a =>
    Number(a.procedimento_id) === 354 ||
    String(a.procedimento_nome || '').toLowerCase().includes('corrente')
  ).length

  const eletroCount = overlapping.filter(a =>
    Number(a.procedimento_id) === 347 ||
    String(a.procedimento_nome || '').toLowerCase().includes('eletro')
  ).length

  const heccusStrictCount = shapeDetoxCount + correnteRussaCount
  const totalEletroDevicesCount = shapeDetoxCount + correnteRussaCount + eletroCount

  const blockedProcIds = []

  // 1. Ventosaterapia (346): Apenas 1 kit na clínica
  if (ventosaCount >= 1) {
    blockedProcIds.push(346)
  }

  // 2. Shape Detox (338): 2 Mantas Térmicas & 2 Heccus
  if (shapeDetoxCount >= 2 || heccusStrictCount >= 2) {
    blockedProcIds.push(338)
  }

  // 3. Corrente Russa (354): Exige Heccus (máximo 2 na clínica)
  if (heccusStrictCount >= 2) {
    blockedProcIds.push(354)
  }

  // 4. Eletroestimulação (347): Heccus ou Extra (3 aparelhos no total)
  if (totalEletroDevicesCount >= 3 || (heccusStrictCount >= 2 && eletroCount >= 1)) {
    blockedProcIds.push(347)
  }

  return blockedProcIds
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

const sendWhatsappConfirmation = (data) => {
  const webhookUrl = 'https://rossiatmz.com.br/n8n/webhook/agendamento-online-confirmacao'
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch((err) => console.error('Erro ao disparar notificação de confirmação WhatsApp:', err))
}

export default function OnlineBooking({ isHomologation = false }) {
  const [stage, setStage] = useState(STAGES.WELCOME)
  const [flowMode, setFlowMode] = useState(null) // 'DATE_FIRST' | 'PROCEDURE_FIRST'
  const [allowedProfIdsForTime, setAllowedProfIdsForTime] = useState(null)
  const [blockedProcedureIdsForTime, setBlockedProcedureIdsForTime] = useState(null)
  const [timeSelectionSubtitle, setTimeSelectionSubtitle] = useState(null)
  const [selectedProcedure, setSelectedProcedure] = useState(null)
  const [lastSelectedProcedureId, setLastSelectedProcedureId] = useState(null)
  const [isFirstTime, setIsFirstTime] = useState(true)
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [foundPatientName, setFoundPatientName] = useState('')
  const [foundPatientId, setFoundPatientId] = useState(null)
  const [searchingPatient, setSearchingPatient] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [searchFailedByPhone, setSearchFailedByPhone] = useState(false)
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false)
  const [waitlistTurno, setWaitlistTurno] = useState('qualquer')
  const [isVagaRelampago, setIsVagaRelampago] = useState(false)

  const loadPatientAppointmentsHistory = useCallback(async (patientId) => {
    if (!patientId) return
    setLoadingCpfHistory(true)
    setErrorMessage(null)
    try {
      const today = new Date()
      const startYear = today.getFullYear()
      const startMonth = String(today.getMonth() + 1).padStart(2, '0')
      const dateStart = `01-${startMonth}-${startYear}`

      const futureLimit = addDays(today, 60)
      const dateEnd = format(futureLimit, 'dd-MM-yyyy')

      const appts = await fetchAppointments(dateStart, dateEnd, patientId, true)
      const activeAppts = appts.filter(
        (a) => ![13, 16, 21].includes(a.status_id)
      )
      setPatientMonthlyAppointments(activeAppts)
    } catch (err) {
      console.error('Erro ao buscar histórico de agendamentos por celular:', err)
    } finally {
      setLoadingCpfHistory(false)
    }
  }, [])

  const loadPatientActiveAppointments = useCallback(async (patientId) => {
    if (!patientId) return
    setLoadingActiveAppointments(true)
    try {
      const today = new Date()
      const dateStart = format(today, 'dd-MM-yyyy')
      const futureLimit = addDays(today, 90)
      const dateEnd = format(futureLimit, 'dd-MM-yyyy')

      const appts = await fetchAppointments(dateStart, dateEnd, patientId, false)
      const activeFuture = appts.filter((a) => ![11, 12, 14, 21].includes(Number(a.status_id)))
      setPatientActiveAppointments(activeFuture)
    } catch (err) {
      console.error('Erro ao buscar agendamentos ativos:', err)
    } finally {
      setLoadingActiveAppointments(false)
    }
  }, [])

  // Leitura dos parâmetros URL da Vaga Relâmpago (?date=DD-MM-YYYY&time=HH:mm) e Meus Agendamentos (?my_appointments=1&phone=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const dateParam = params.get('date')
    const timeParam = params.get('time')
    const myApptsParam = params.get('my_appointments')
    const phoneParam = params.get('phone') || params.get('telefone')

    if (myApptsParam === '1' || (phoneParam && !dateParam)) {
      setStage(STAGES.MY_APPOINTMENTS)
      if (phoneParam) {
        setPhone(phoneParam)
        searchPatient({ telefone: phoneParam }).then((res) => {
          if (res && res.patient_id) {
            setFoundPatientId(res.patient_id)
            setFoundPatientName(res.nome)
            loadPatientAppointmentsHistory(res.patient_id)
            loadPatientActiveAppointments(res.patient_id)
          }
        }).catch(console.error)
      }
      return
    }

    if (dateParam && timeParam) {
      const parts = dateParam.split('-')
      let parsedDate = null
      if (parts[0].length === 4) {
        parsedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      } else if (parts[2].length === 4) {
        parsedDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
      }
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate)
        setSelectedTime(timeParam)
        setIsVagaRelampago(true)
        setStage(STAGES.PROCEDURE)
      }
    }
  }, [loadPatientActiveAppointments, loadPatientAppointmentsHistory])

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedLocalId, setSelectedLocalId] = useState(null)
  const [availableSlots, setAvailableSlots] = useState({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [isTestMode, setIsTestMode] = useState(false)
  const [maxFetchedDate, setMaxFetchedDate] = useState(null)
  const hasAutoSelectedRef = useRef(false)

  const [procedureDurations, setProcedureDurations] = useState({})
  const [professionalAppointmentsRange, setProfessionalAppointmentsRange] = useState([])
  const appointmentsForSelectedDate = useMemo(() => {
    if (!selectedDate || !professionalAppointmentsRange) return []
    const targetDateStr = format(selectedDate, 'dd-MM-yyyy')
    return professionalAppointmentsRange.filter(a => {
      if (!a?.data) return false
      const cleanData = String(a.data).replace(/\//g, '-')
      if (cleanData === targetDateStr) return true
      if (cleanData.includes('-')) {
        const parts = cleanData.split('-')
        if (parts[0].length === 4) {
          const formatted = `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`
          return formatted === targetDateStr
        }
      }
      return cleanData === targetDateStr
    })
  }, [selectedDate, professionalAppointmentsRange])
  const [loadingAppointments, setLoadingAppointments] = useState(false)

  const [patientMonthlyAppointments, setPatientMonthlyAppointments] = useState([])
  const [loadingCpfHistory, setLoadingCpfHistory] = useState(false)

  const [patientActiveAppointments, setPatientActiveAppointments] = useState([])
  const [loadingActiveAppointments, setLoadingActiveAppointments] = useState(false)
  const [cancelledLateThisSession, setCancelledLateThisSession] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [appointmentDetails, setAppointmentDetails] = useState(null)

  // Custom active professional derived from test mode or selected procedure
  const activeProfessionalId = isTestMode ? '1' : (selectedProcedure?.professionalIds?.[0] || '15')

  const handlePhoneChange = (val) => {
    const newVal = typeof val === 'string' ? val : val.target.value
    setPhone(newVal)
    setFoundPatientId(null)
    setFoundPatientName('')
    setSearchFailed(false)
    setSearchFailedByPhone(false)
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

  const handleCancelAppointment = async (appt) => {
    if (!appt || !appt.agendamento_id) return
    try {
      let parsedDate = new Date()
      if (appt.data && appt.horario) {
        const [d, m, y] = appt.data.split('-').map(Number)
        const [hh, mm] = appt.horario.split(':').map(Number)
        parsedDate = new Date(y, m - 1, d, hh, mm)
      }
      const now = new Date()
      const hoursDiff = (parsedDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      const isLateCancel = hoursDiff < 24

      if (isLateCancel) {
        setCancelledLateThisSession(true)
      }

      await updateAppointmentStatus({
        agendamento_id: appt.agendamento_id,
        status_id: 11,
        obs: 'Cancelado pelo paciente via Web App'
      })

      if (foundPatientId) {
        await loadPatientAppointmentsHistory(foundPatientId)
        await loadPatientActiveAppointments(foundPatientId)
      }

      if (isLateCancel) {
        alert('Agendamento cancelado com sucesso. Como a desmarcação ocorreu com menos de 24h de antecedência, novas marcações e Fila de Espera para esta semana estão bloqueadas. Você poderá agendar normalmente a partir da próxima semana!')
      } else {
        alert('Seu agendamento foi cancelado com sucesso!')
      }
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err)
      alert('Não foi possível cancelar o agendamento no momento. Por favor, tente novamente ou entre em contato pelo WhatsApp.')
    }
  }

  const handleSearchPatient = async (forceCpfSearch = false) => {
    const targetPhone = phone.trim()
    const targetCpf = cpf.replace(/\D/g, '')

    if (!forceCpfSearch && !targetPhone) {
      setErrorMessage('Por favor, preencha o campo de celular.')
      return
    }

    if (forceCpfSearch && targetCpf.length !== 11) {
      setErrorMessage('Por favor, digite um CPF válido com 11 dígitos.')
      return
    }

    setSearchingPatient(true)
    setErrorMessage(null)
    setSearchFailed(false)

    try {
      const result = await searchPatient({
        telefone: targetPhone,
        cpf: forceCpfSearch ? targetCpf : ''
      })

      if (result && result.patient_id) {
        setFoundPatientId(result.patient_id)
        setFoundPatientName(result.nome)
        setSearchFailedByPhone(false)
        await loadPatientAppointmentsHistory(result.patient_id)
        await loadPatientActiveAppointments(result.patient_id)
      } else {
        if (!forceCpfSearch) {
          setSearchFailedByPhone(true)
        } else {
          setSearchFailed(true)
        }
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

  // Reset maxFetchedDate, hasAutoSelectedRef e availableSlots quando modo de teste ou procedimento mudarem
  useEffect(() => {
    setMaxFetchedDate(null)
    hasAutoSelectedRef.current = false
    setAvailableSlots({}) // Limpa os slots antigos para evitar auto-seleção baseada em estado obsoleto
  }, [isTestMode, selectedProcedure])

  // Load procedure durations from Feegow on mount
  useEffect(() => {
    async function loadDurations() {
      try {
        const list = await fetchProcedures()
        const map = {}
        list.forEach(p => {
          const id = p.id || p.procedimento_id
          let time = Number(p.tempo) || 60
          // Procedimentos estéticos corporais/agenda esteticista são cravados em exatamente 60 minutos
          if ([338, 339, 346, 347, 349, 354, 355, 149].includes(Number(id))) {
            time = 60
          }
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

  // Cache em memória para evitar chamadas repetidas à Feegow
  const slotsCacheRef = React.useRef({})

  // Load available slots function
  const loadSlots = useCallback(async () => {
    setLoadingSlots(true)
    setErrorMessage(null)
    try {
      const today = new Date()
      const todayStr = format(today, 'dd-MM-yyyy')
      
      // Janela inicial expandida para 60 dias (2 meses) para captura imediata da próxima vaga em procedimentos concorridos
      const standardLimit = addDays(today, 60)
      const endLimit = addDays(selectedDate, 15)
      let finalEnd = endLimit > standardLimit ? endLimit : standardLimit
      let futureStr = format(finalEnd, 'dd-MM-yyyy')
      
      const targetProcId = isTestMode ? 338 : (selectedProcedure?.feegowId || DEFAULT_PROCEDURE.id)
      let baseProfIds = isTestMode ? ['1'] : (selectedProcedure?.professionalIds || ['16', '15'])
      if (!isTestMode && !baseProfIds.includes('5')) {
        baseProfIds = [...baseProfIds, '5']
      }
      const targetProfIds = baseProfIds

      const cacheKey = `${flowMode}_${targetProcId}_${todayStr}_${futureStr}_${isTestMode}`
      const cached = slotsCacheRef.current[cacheKey]
      
      // Se houver cache válido por menos de 30 segundos, carrega instantaneamente em 0ms
      if (cached && (Date.now() - cached.timestamp < 30000)) {
        setProfessionalAppointmentsRange(cached.filteredAppts)
        setAvailableSlots(cached.mergedSlots)
        setMaxFetchedDate(finalEnd)
        setLoadingSlots(false)
        return
      }

      // Função auxiliar para consulta paralela à Feegow
      const fetchScheduleForEnd = async (searchEndStr) => {
        const apptsPromise = fetchAppointments(todayStr, searchEndStr, null, false).catch(err => {
          console.error('Erro ao carregar agendamentos:', err)
          return []
        })

        const schedulePromises = targetProfIds.map(profId => {
          let fetchProcId = targetProcId
          if (String(profId) === '5') {
            fetchProcId = 338
          } else if (!selectedProcedure || Number(targetProcId) === 149) {
            fetchProcId = String(profId) === '16' ? 339 : 338
          }
          return fetchAvailableSchedule({
            procedimento_id: fetchProcId,
            data_start: todayStr,
            data_end: searchEndStr,
            profissional_id: profId
          }).catch(err => {
            console.error(`Erro ao carregar agenda do profissional ${profId}:`, err)
            return null
          })
        })

        return await Promise.all([apptsPromise, ...schedulePromises])
      }

      // EXECUTAR TUDO EM PARALELO SIMULTÂNEO (SEM WATERFALL)
      let [allAppts, ...scheduleResults] = await fetchScheduleForEnd(futureStr)

      // Checa se encontrou alguma data com vaga no intervalo de 60 dias
      const hasAnySlotsInResults = scheduleResults.some(data => {
        if (!data || !data.profissional_id) return false
        return Object.keys(data.profissional_id).some(pId => {
          const localMap = data.profissional_id[pId]?.local_id || {}
          return Object.keys(localMap).some(locId => {
            const dateMap = localMap[locId] || {}
            return Object.keys(dateMap).some(dKey => (dateMap[dKey] || []).length > 0)
          })
        })
      })

      // Se não encontrou NENHUMA vaga nos primeiros 60 dias, estende a busca automaticamente para 90 dias (3 meses)
      if (!hasAnySlotsInResults && !isTestMode) {
        const extendedEnd = addDays(today, 90)
        finalEnd = extendedEnd
        futureStr = format(extendedEnd, 'dd-MM-yyyy')
        const extendedResults = await fetchScheduleForEnd(futureStr)
        allAppts = extendedResults[0]
        scheduleResults = extendedResults.slice(1)
      }

      const filteredAppts = (allAppts || []).filter(a => targetProfIds.includes(String(a.profissional_id)))
      setProfessionalAppointmentsRange(filteredAppts)

      // Merge slots
      const mergedSlots = {}
      const reversedProfIds = [...targetProfIds].reverse()
      
      reversedProfIds.forEach(profId => {
        const originalIndex = targetProfIds.indexOf(profId)
        const data = scheduleResults[originalIndex]
        if (!data) return
        
        const localMap = data.profissional_id?.[profId]?.local_id || {}
        Object.keys(localMap).forEach(localId => {
          if (!mergedSlots[localId]) {
            mergedSlots[localId] = {}
          }
          
          const dateMap = localMap[localId] || {}
          Object.keys(dateMap).forEach(dateKey => {
            if (!mergedSlots[localId][dateKey]) {
              mergedSlots[localId][dateKey] = {}
            }
            
            const times = dateMap[dateKey] || []
            times.forEach(timeStr => {
              const current = mergedSlots[localId][dateKey][timeStr]
              if (current) {
                if (!current.split(',').includes(String(profId))) {
                  mergedSlots[localId][dateKey][timeStr] = `${current},${profId}`
                }
              } else {
                mergedSlots[localId][dateKey][timeStr] = String(profId)
              }
            })
          })
        })
      })

      // Salva no cache em memória
      slotsCacheRef.current[cacheKey] = {
        filteredAppts,
        mergedSlots,
        timestamp: Date.now()
      }

      setAvailableSlots(mergedSlots)
      setMaxFetchedDate(finalEnd)
    } catch (err) {
      console.error(err)
      setErrorMessage('Erro ao carregar horários disponíveis da Feegow. Tente novamente.')
    } finally {
      setLoadingSlots(false)
    }
  }, [selectedProcedure, isTestMode, selectedDate, flowMode])

  // Load available slots when stage changes to DATETIME, or selectedDate is beyond the fetched range
  useEffect(() => {
    if (stage === STAGES.DATETIME) {
      if (!maxFetchedDate || selectedDate.getTime() > maxFetchedDate.getTime() || Object.keys(availableSlots).length === 0) {
        loadSlots()
      }
    }
  }, [stage, selectedProcedure, selectedDate, maxFetchedDate, loadSlots, availableSlots])

  // Helper function to check if date is allowed under patient's weekly/monthly limits and late cancellation rules
  const isDateAllowed = useCallback((dateToCheck) => {
    // 0. Bloqueio por cancelamento em cima da hora (<24h) na semana corrente
    if (cancelledLateThisSession) {
      const getStartOfWeek = (d) => startOfWeek(d, { weekStartsOn: 1 })
      const todayWeekStartStr = format(getStartOfWeek(new Date()), 'yyyy-MM-dd')
      const checkWeekStartStr = format(getStartOfWeek(dateToCheck), 'yyyy-MM-dd')
      if (todayWeekStartStr === checkWeekStartStr) {
        return false
      }
    }

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
  }, [isFirstTime, foundPatientId, patientMonthlyAppointments, cancelledLateThisSession])

  // Filter slots based on the Date, apply professional constraint rules & prevent collision
  const scarcitySlotsForDate = useMemo(() => {
    let morning = []
    let afternoon = []
    let evening = []
    let foundLocalId = null
    let slotLocals = {}

    if (!selectedDate || isNaN(selectedDate.getTime()) || !availableSlots) return { morning, afternoon, evening, localId: foundLocalId, slotLocals }

    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    const dateStr = format(selectedDate, 'dd-MM-yyyy')

    const isSaturday30MinHomologation = isHomologation && dateKey === '2026-08-01'

    // Se ultrapassou o limite (semanal ou mensal), não exibe nenhum slot
    const dateAllowed = isDateAllowed(selectedDate)
    if (!dateAllowed) {
      return { morning: [], afternoon: [], evening: [], localId: null, slotLocals: {} }
    }

    const candidates = []

    for (const localId of Object.keys(availableSlots)) {
      const dateSlots = availableSlots[localId]?.[dateKey] || {}
      const times = Object.keys(dateSlots).sort()
      if (times.length > 0) {
        const validSlots = times.filter(time => {
          let slotProfId = String(dateSlots[time])
          let validProfIds = slotProfId.split(',')
          const slotStart = timeToMinutes(time)
          
          let durationMinutes = isSaturday30MinHomologation ? 30 : 60
          if (!isSaturday30MinHomologation && !validProfIds.includes('16') && ![338, 339, 346, 347, 349, 354, 355].includes(Number(selectedProcedure?.feegowId))) {
            durationMinutes = procedureDurations[selectedProcedure?.feegowId] || 60
          }
          const slotEnd = slotStart + durationMinutes

          const CLINIC_END_TIME = 20 * 60 + 30; // 1230 minutos (20:30h)
          const CLINIC_END_TIME_TOLERANCE = 1; // 1 minuto de tolerância
          const fitsHours = slotEnd <= (CLINIC_END_TIME + CLINIC_END_TIME_TOLERANCE)
          
          if (!fitsHours) return false

          // Bloqueio pontual temporário do Shape Detox (338) em 13/07/2026 a partir de 17:30
          if (dateKey === '2026-07-13' && Number(selectedProcedure?.feegowId) === 338) {
            if (slotStart >= timeToMinutes('17:30:00')) {
              return false;
            }
          }

          // 1. Terça, Quinta e Sexta para a Esteticista
          const dayOfWeek = selectedDate.getDay()
          if (validProfIds.includes('16') && dayOfWeek !== 2 && dayOfWeek !== 4 && dayOfWeek !== 5) {
            validProfIds = validProfIds.filter(id => id !== '16')
          }

          // 2. Regra Especial Enfermagem (ID 5): Liberado EXCLUSIVAMENTE em 31/07/2026 nos horários específicos
          if (validProfIds.includes('5')) {
            const isAllowedFor5 = dateKey === '2026-07-31' && ['15:30:00', '15:30', '16:30:00', '16:30', '17:30:00', '17:30', '18:30:00', '18:30', '19:30:00', '19:30'].includes(time)
            if (!isAllowedFor5) {
              validProfIds = validProfIds.filter(id => id !== '5')
            }
          }

          // 3. Bloqueio de Almoço da Monica Sousa (ID 15) entre 14:00 (840 min) e 15:00 (900 min)
          if (validProfIds.includes('15')) {
            const LUNCH_START = 14 * 60; // 14:00 (840 min)
            const LUNCH_END = 15 * 60;   // 15:00 (900 min)
            if ((slotStart < LUNCH_START && slotEnd > LUNCH_START) || (slotStart >= LUNCH_START && slotStart < LUNCH_END)) {
              validProfIds = validProfIds.filter(id => id !== '15')
            }
          }

          // Se todos os profissionais foram filtrados pelas regras, o horário não está mais disponível
          if (validProfIds.length === 0) return false

          // Atualiza o slot com os profissionais sobreviventes para as próximas etapas
          dateSlots[time] = validProfIds.join(',')

          if (!isSaturday30MinHomologation) {
            const collidingAppt = appointmentsForSelectedDate.find(appt => {
              if (!validProfIds.includes(String(appt.profissional_id))) return false
              if ([11, 12, 14].includes(Number(appt.status_id))) return false
              const apptStart = timeToMinutes(appt.horario)
              const apptDuration = Number(appt.duracao) || 60
              const apptEnd = apptStart + apptDuration

              // Overlap check
              return slotStart < apptEnd && slotEnd > apptStart
            })

            if (collidingAppt) return false
          }

          // Equipment collision check across the entire clinic for selectedProcedure
          if (selectedProcedure?.feegowId) {
            const blockedEquipmentIds = getEquipmentOccupancy(slotStart, slotEnd, appointmentsForSelectedDate)
            if (blockedEquipmentIds.includes(Number(selectedProcedure.feegowId))) {
              return false
            }
          }

          return true
        })

        // Algoritmo de Slot Snapping (Encadeamento Matemático)
        const snappedSlots = []
        let nextAvailableTime = 0

        validSlots.forEach(time => {
          const slotStart = timeToMinutes(time)
          if (slotStart >= nextAvailableTime) {
            snappedSlots.push(time)
            
            const slotProfId = String(dateSlots[time])
            let slotDuration = isSaturday30MinHomologation ? 30 : 60
            if (!isSaturday30MinHomologation && !slotProfId.split(',').includes('16') && ![338, 339, 346, 347, 349, 354, 355].includes(Number(selectedProcedure?.feegowId))) {
              slotDuration = procedureDurations[selectedProcedure?.feegowId] || 60
            }
            nextAvailableTime = slotStart + slotDuration
          }
        })

        snappedSlots.forEach(time => {
          candidates.push({
            time,
            localId,
            profId: String(dateSlots[time])
          })
        })
      }
    }

    let baseProfIdsScarcity = isTestMode ? ['1'] : (selectedProcedure?.professionalIds || ['16', '15'])
    if (!isTestMode && !baseProfIdsScarcity.includes('5')) {
      baseProfIdsScarcity = [...baseProfIdsScarcity, '5']
    }
    const targetProfIds = baseProfIdsScarcity
    
    // Sort by priority (higher priority professional first)
    const prioritySorted = [...candidates].sort((a, b) => {
      const aProfs = a.profId.split(',')
      const bProfs = b.profId.split(',')
      const prioA = Math.min(...aProfs.map(id => {
        const idx = targetProfIds.indexOf(id)
        return idx === -1 ? 999 : idx
      }))
      const prioB = Math.min(...bProfs.map(id => {
        const idx = targetProfIds.indexOf(id)
        return idx === -1 ? 999 : idx
      }))
      return prioA - prioB
    })

    // Deduplicate times
    const uniqueCandidates = []
    const seenTimes = new Set()
    prioritySorted.forEach(cand => {
      if (!seenTimes.has(cand.time)) {
        seenTimes.add(cand.time)
        uniqueCandidates.push(cand)
      }
    })

    // Sort chronologically
    uniqueCandidates.sort((a, b) => a.time.localeCompare(b.time))

    // Contagem de horários noturnos da Monica
    const eveningAppointmentsCount = appointmentsForSelectedDate.filter(appt => {
       return String(appt.profissional_id) === '15' && timeToMinutes(appt.horario) >= timeToMinutes('18:00:00')
    }).length

    const dayOfWeek = selectedDate.getDay()
    const isRestrictedDay = (dayOfWeek === 2 || dayOfWeek === 4)

    uniqueCandidates.forEach(cand => {
      const { time, localId, profId } = cand
      const profIdsArr = profId.split(',')
      slotLocals[time] = localId
      if (!foundLocalId) {
        foundLocalId = localId
      }

      if (time < '12:00:00') {
        morning.push(time)
      } else if (time >= '12:00:00' && time < '18:00:00') {
        afternoon.push(time)
      } else {
        if (profIdsArr.includes('15') && isRestrictedDay) {
           const monicaVisualEveningSlots = evening.filter(t => {
             const slotLocal = slotLocals[t]
             const slotProfString = availableSlots[slotLocal]?.[dateKey]?.[t]
             return slotProfString && slotProfString.split(',').includes('15')
           }).length
           
           if (eveningAppointmentsCount >= 1) {
             // Bloqueio Total
           } else if (monicaVisualEveningSlots < 1) {
             evening.push(time)
           }
        } else {
           evening.push(time)
        }
      }
    })

    // Pega os 3 primeiros horários encadeados de forma sequencial (Snapping)
    const limitedMorning = isSaturday30MinHomologation ? morning : morning.slice(0, 3)
    const limitedAfternoon = isSaturday30MinHomologation ? afternoon : afternoon.slice(0, 3)
    const limitedEvening = isSaturday30MinHomologation ? evening : evening.slice(0, 3)

    return {
      morning: limitedMorning,
      afternoon: limitedAfternoon,
      evening: limitedEvening,
      localId: foundLocalId,
      slotLocals
    }
  }, [selectedDate, availableSlots, selectedProcedure, appointmentsForSelectedDate, procedureDurations, isDateAllowed, isTestMode, isHomologation])

  // Extract dates that actually have slots available for selected procedure
  const datesWithSlots = useMemo(() => {
    const dates = new Set()

    for (const localId of Object.keys(availableSlots)) {
      const dateMap = availableSlots[localId] || {}
      for (const dateKey of Object.keys(dateMap)) {
        if (!dateKey || typeof dateKey !== 'string' || !dateKey.includes('-')) continue;
        const slotsMap = dateMap[dateKey] || {}
        
        // Filter slots based on professional availability rules
        const hasValidSlot = Object.keys(slotsMap).some(time => {
          let slotProfId = String(slotsMap[time])
          let validProfIds = slotProfId.split(',')
          const slotStart = timeToMinutes(time)
          
          const isSaturday30MinHomologation = isHomologation && dateKey === '2026-08-01'
          let durationMinutes = isSaturday30MinHomologation ? 30 : (procedureDurations[selectedProcedure?.feegowId] || 60)
          if (!isSaturday30MinHomologation && validProfIds.includes('16') && Number(selectedProcedure?.feegowId) === 338) {
            durationMinutes = 60
          }
          const slotEnd = slotStart + durationMinutes

          const CLINIC_END_TIME = 20 * 60 + 30; // 1230 minutos (20:30h)
          const CLINIC_END_TIME_TOLERANCE = 1; // 1 minuto de tolerância
          const fitsHours = slotEnd <= (CLINIC_END_TIME + CLINIC_END_TIME_TOLERANCE)
          if (!fitsHours) return false

          // Bloqueio pontual temporário do Shape Detox (338) em 13/07/2026 a partir de 17:30
          if (dateKey === '2026-07-13' && Number(selectedProcedure?.feegowId) === 338) {
            if (slotStart >= timeToMinutes('17:30:00')) {
              return false;
            }
          }

          const [year, month, day] = dateKey.split('-').map(Number)
          const dateToCheck = new Date(year, month - 1, day)
          const dayOfWeek = dateToCheck.getDay()
          
          // 1. Terça, Quinta e Sexta para a Esteticista
          if (validProfIds.includes('16') && dayOfWeek !== 2 && dayOfWeek !== 4 && dayOfWeek !== 5) {
            validProfIds = validProfIds.filter(id => id !== '16')
          }

          // 2. Regra Especial Enfermagem (ID 5)
          if (validProfIds.includes('5')) {
            const isAllowedFor5 = dateKey === '2026-07-31' && ['15:30:00', '15:30', '16:30:00', '16:30', '17:30:00', '17:30', '18:30:00', '18:30', '19:30:00', '19:30'].includes(time)
            if (!isAllowedFor5) {
              validProfIds = validProfIds.filter(id => id !== '5')
            }
          }

          // 3. Bloqueio de Almoço da Monica Sousa (ID 15)
          if (validProfIds.includes('15')) {
            const LUNCH_START = 14 * 60; // 14:00 (840 min)
            const LUNCH_END = 15 * 60;   // 15:00 (900 min)
            if ((slotStart < LUNCH_START && slotEnd > LUNCH_START) || (slotStart >= LUNCH_START && slotStart < LUNCH_END)) {
              validProfIds = validProfIds.filter(id => id !== '15')
            }
          }

          if (validProfIds.length === 0) return false
          
          slotsMap[time] = validProfIds.join(',')

          // Collision check
          const dateStr = format(dateToCheck, 'dd-MM-yyyy')
          const appointmentsForSelectedDate = professionalAppointmentsRange.filter(a => {
            if (!a?.data) return false
            const cleanData = String(a.data).replace(/\//g, '-')
            if (cleanData === dateStr) return true
            if (cleanData.includes('-')) {
              const parts = cleanData.split('-')
              if (parts[0].length === 4) {
                const formatted = `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`
                return formatted === dateStr
              }
            }
            return cleanData === dateStr
          })
          
          const hasCollision = isSaturday30MinHomologation ? false : appointmentsForSelectedDate.some(appt => {
            if (!validProfIds.includes(String(appt.profissional_id))) return false
            if ([11, 12, 14].includes(Number(appt.status_id))) return false
            const apptStart = timeToMinutes(appt.horario)
            const apptDuration = Number(appt.duracao) || 60
            const apptEnd = apptStart + apptDuration
            return slotStart < apptEnd && slotEnd > apptStart
          })

          if (hasCollision) return false

          // Equipment collision check across the entire clinic for selectedProcedure
          if (selectedProcedure?.feegowId) {
            const blockedEquipmentIds = getEquipmentOccupancy(slotStart, slotEnd, appointmentsForSelectedDate)
            if (blockedEquipmentIds.includes(Number(selectedProcedure.feegowId))) {
              return false
            }
          }

          return true
        })

        // Converte a data para verificar limites preventivamente
        const [year, month, day] = dateKey.split('-').map(Number)
        if (!year || isNaN(year)) continue;
        const dateToCheck = new Date(year, month - 1, day)
        if (isNaN(dateToCheck.getTime())) continue;

        // Se tem slot válido fisicamente na Feegow, a data é marcada como disponível na régua
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
  }, [availableSlots, selectedProcedure, isDateAllowed, procedureDurations, professionalAppointmentsRange, isHomologation])

  const handleProcedureSelect = (proc) => {
    setSelectedProcedure(proc)
    setLastSelectedProcedureId(proc.id)

    if (flowMode === 'DATE_FIRST' && selectedTime) {
      if (!isFirstTime && foundPatientId) {
        handleBookingDirect({ procOverride: proc })
      } else {
        setStage(STAGES.FORM)
      }
    } else {
      setMaxFetchedDate(null)
      setStage(STAGES.DATETIME)
    }
  }

  const handleTimeSelect = (time, localId) => {
    setSelectedTime(time)
    setSelectedLocalId(localId)

    // Calcular equipamentos em uso na clínica inteira para o horário selecionado
    const timeMin = timeToMinutes(time)
    let selectedProcDuration = 60
    if (selectedProcedure?.feegowId) {
      selectedProcDuration = procedureDurations[selectedProcedure.feegowId] || 60
    }
    const timeEnd = timeMin + selectedProcDuration

    const blockedIds = getEquipmentOccupancy(timeMin, timeEnd, appointmentsForSelectedDate)
    setBlockedProcedureIdsForTime(blockedIds)

    if (flowMode === 'DATE_FIRST' && !selectedProcedure) {
      const dateKey = format(selectedDate, 'yyyy-MM-dd')
      const targetLocal = localId || scarcitySlotsForDate.localId
      const profIdRaw = availableSlots[targetLocal]?.[dateKey]?.[time] || '16'
      const profIdsAtTime = String(profIdRaw).split(',')

      setAllowedProfIdsForTime(profIdsAtTime)

      const formattedDateStr = format(selectedDate, 'dd/MM/yyyy')
      setTimeSelectionSubtitle(`Tratamentos disponíveis para ${formattedDateStr} às ${time.substring(0, 5)}h:`)

      setStage(STAGES.PROCEDURE)
      return
    }

    if (!isFirstTime && foundPatientId) {
      handleBookingDirect({ timeOverride: time, localIdOverride: localId })
    } else {
      setStage(STAGES.FORM)
    }
  }

  const handleBookingDirect = async ({ timeOverride = null, localIdOverride = null, procOverride = null } = {}) => {
    const bookingTime = timeOverride || selectedTime
    const bookingLocalId = localIdOverride || selectedLocalId || scarcitySlotsForDate.localId
    const bookingProc = procOverride || selectedProcedure

    if (!bookingTime || !foundPatientId) return

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const formattedDate = format(selectedDate, 'dd-MM-yyyy')
      const targetProcId = isTestMode ? 338 : bookingProc?.feegowId

      const dateKeyForBook = format(selectedDate, 'yyyy-MM-dd')
      const rawProfStr = String(availableSlots[bookingLocalId]?.[dateKeyForBook]?.[bookingTime] || '')
      const profIdsAtTime = rawProfStr.split(',')

      let targetProfId = 15
      if (bookingProc?.professionalIds) {
        const matched = bookingProc.professionalIds.find(p => profIdsAtTime.includes(String(p)))
        if (matched) {
          targetProfId = Number(matched)
        } else {
          targetProfId = Number(bookingProc.professionalIds[0])
        }
      }
      if (isTestMode) targetProfId = 1

      const profNameForNotes = targetProfId === 15 ? 'Monica Sousa' : (targetProfId === 16 ? 'Esteticista' : 'Freelancer')

      const duracaoParam = (isHomologation && formattedDate === '01-08-2026') ? 30 : undefined

      await createAppointment({
        local_id: bookingLocalId,
        paciente_id: foundPatientId,
        procedimento_id: targetProcId,
        data: formattedDate,
        horario: bookingTime,
        notas: `Agendamento realizado via link online de pacientes. ${formattedDate.replace(/-/g, '/')} e ${bookingTime?.substring(0, 5)}`,
        profissional_id: targetProfId,
        ...(duracaoParam ? { duracao: duracaoParam } : {})
      })

      sendWhatsappConfirmation({
        nome: foundPatientName || name,
        telefone: phone,
        procedimentoName: bookingProc?.name || DEFAULT_PROCEDURE.name,
        procedimentoId: targetProcId,
        date: format(selectedDate, 'dd/MM/yyyy'),
        time: bookingTime?.substring(0, 5) || ''
      })

      setAppointmentDetails({
        procedureName: bookingProc?.name || DEFAULT_PROCEDURE.name,
        date: format(selectedDate, 'dd/MM/yyyy'),
        time: bookingTime?.substring(0, 5) || ''
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
        
        const dateKeyForBook = format(selectedDate, 'yyyy-MM-dd')
        const targetProfId = isTestMode 
          ? 1 
          : Number(availableSlots[selectedLocalId || scarcitySlotsForDate.localId]?.[dateKeyForBook]?.[selectedTime] || selectedProcedure?.professionalIds?.[0])

        const profNameForNotes = targetProfId === 15 ? 'Monica Sousa' : (targetProfId === 16 ? 'Esteticista' : 'Freelancer')

        const duracaoParam = (isHomologation && formattedDate === '01-08-2026') ? 30 : undefined

        // Criar Agendamento
        await createAppointment({
          local_id: selectedLocalId || scarcitySlotsForDate.localId,
          paciente_id: newPatientId,
          procedimento_id: targetProcId,
          data: formattedDate,
          horario: selectedTime,
          notas: `Agendamento realizado via link online de pacientes. ${formattedDate.replace(/-/g, '/')} e ${selectedTime?.substring(0, 5)}`,
          profissional_id: targetProfId,
          ...(duracaoParam ? { duracao: duracaoParam } : {})
        })

        // Disparar notificação automática via WhatsApp no n8n (assíncrono)
        sendWhatsappConfirmation({
          nome: name,
          telefone: phone,
          procedimentoName: selectedProcedure?.name || DEFAULT_PROCEDURE.name,
          procedimentoId: targetProcId,
          date: format(selectedDate, 'dd/MM/yyyy'),
          time: selectedTime?.substring(0, 5) || ''
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
        
        const dateKeyForBook = format(selectedDate, 'yyyy-MM-dd')
        const targetProfId = isTestMode 
          ? 1 
          : Number(availableSlots[selectedLocalId || scarcitySlotsForDate.localId]?.[dateKeyForBook]?.[selectedTime] || selectedProcedure?.professionalIds?.[0])

        const profNameForNotes = targetProfId === 15 ? 'Monica Sousa' : (targetProfId === 16 ? 'Esteticista' : 'Freelancer')

        const duracaoParam = (isHomologation && formattedDate === '01-08-2026') ? 30 : undefined

        await createAppointment({
          local_id: selectedLocalId || scarcitySlotsForDate.localId,
          paciente_id: foundPatientId,
          procedimento_id: targetProcId,
          data: formattedDate,
          horario: selectedTime,
          notas: `Agendamento realizado via link online de pacientes. ${formattedDate.replace(/-/g, '/')} e ${selectedTime?.substring(0, 5)}`,
          profissional_id: targetProfId,
          ...(duracaoParam ? { duracao: duracaoParam } : {})
        })

        // Disparar notificação automática via WhatsApp no n8n (assíncrono)
        sendWhatsappConfirmation({
          nome: foundPatientName || name,
          telefone: phone,
          procedimentoName: selectedProcedure?.name || DEFAULT_PROCEDURE.name,
          procedimentoId: targetProcId,
          date: format(selectedDate, 'dd/MM/yyyy'),
          time: selectedTime?.substring(0, 5) || ''
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

  // Combined list of top 5 dates with slots plus the selected date if it's outside the list
  const weekdaysWithSelected = useMemo(() => {
    if (!datesWithSlots || datesWithSlots.length === 0) {
      return (selectedDate && !isNaN(selectedDate.getTime())) ? [selectedDate] : []
    }

    // Pega as 5 primeiras datas reais que possuem vagas disponíveis
    const top5Slots = datesWithSlots.slice(0, 5)

    if (!selectedDate || isNaN(selectedDate.getTime())) return top5Slots

    const isSelectedInTop5 = top5Slots.some(
      day => !isNaN(day.getTime()) && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    )
    
    // Se o usuário selecionou uma data via "Outro Dia" que não está entre os 5 primeiros, inclui a data escolhida na régua
    if (!isSelectedInTop5 && selectedDate) {
      const combined = [...top5Slots, selectedDate]
      return combined.sort((a, b) => a.getTime() - b.getTime())
    }

    return top5Slots
  }, [datesWithSlots, selectedDate])

  // Auto-select first date that actually has slots ONLY on initial load if current date has no slots
  useEffect(() => {
    if (datesWithSlots.length > 0 && !hasAutoSelectedRef.current) {
      const isSelectedDateInSlots = datesWithSlots.some(
        d => format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      )
      if (!isSelectedDateInSlots) {
        setSelectedDate(datesWithSlots[0])
      }
      hasAutoSelectedRef.current = true
    }
  }, [datesWithSlots])

  const handleCalendarDateSelect = (date) => {
    const dayOfWeek = date.getDay()
    
    // Regra especial: Sábados de agosto de 2026 liberados até o dia 22
    const isSpecialSaturday = 
      dayOfWeek === 6 && 
      date.getFullYear() === 2026 && 
      date.getMonth() === 7 && // 7 é Agosto em JavaScript (0-indexed)
      date.getDate() <= 22

    if (dayOfWeek === 0 || (dayOfWeek === 6 && !isSpecialSaturday)) {
      alert('A clínica não realiza atendimentos neste fim de semana. Por favor, escolha um dia útil.')
      return
    }

    setSelectedDate(date)
    setSelectedTime(null)
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#2e2a25] flex flex-col items-center justify-start py-10 font-sans">
      <div className="mb-6 flex justify-center">
        <img src={salvusLogo} alt="Clínica Salvus" className="h-30 md:h-36 object-contain" />
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
                if (option === 'EXCLUSIVE_SOLUTIONS') {
                  setStage(STAGES.EXCLUSIVE_SOLUTIONS)
                } else if (option === 'MY_APPOINTMENTS') {
                  setIsFirstTime(false)
                  setStage(STAGES.MY_APPOINTMENTS)
                } else if (option === 'PATIENT') {
                  setIsFirstTime(false)
                  setStage(STAGES.IDENTIFICATION)
                } else {
                  setIsFirstTime(true)
                  setStage(STAGES.FLOW_SELECTION)
                }
              }}
            />
          )}

          {stage === STAGES.EXCLUSIVE_SOLUTIONS && (
            <ExclusiveSolutionsStage
              onBack={() => setStage(STAGES.WELCOME)}
            />
          )}

          {stage === STAGES.MY_APPOINTMENTS && (
            <MyAppointmentsStage
              phone={phone}
              onChangePhone={handlePhoneChange}
              searchingPatient={searchingPatient}
              foundPatientName={foundPatientName}
              appointments={patientActiveAppointments}
              loadingAppointments={loadingActiveAppointments}
              onSearchPatient={handleSearchPatient}
              onCancelAppointment={handleCancelAppointment}
              onRescheduleAppointment={(appt) => {
                setIsFirstTime(false)
                setStage(STAGES.FLOW_SELECTION)
              }}
              onNewBooking={() => {
                setStage(STAGES.FLOW_SELECTION)
              }}
              onBack={() => setStage(STAGES.WELCOME)}
            />
          )}

          {stage === STAGES.IDENTIFICATION && (
            <IdentificationStage
              phone={phone}
              onChangePhone={handlePhoneChange}
              cpf={cpf}
              setCpf={setCpf}
              searchingPatient={searchingPatient}
              searchFailed={searchFailed}
              searchFailedByPhone={searchFailedByPhone}
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
                setStage(STAGES.FLOW_SELECTION)
              }}
            />
          )}

          {stage === STAGES.FLOW_SELECTION && (
            <FlowSelectionStage
              onSelectFlow={(mode) => {
                setFlowMode(mode)
                if (mode === 'DATE_FIRST') {
                  setSelectedProcedure(null)
                  setAllowedProfIdsForTime(null)
                  setTimeSelectionSubtitle(null)
                  setStage(STAGES.DATETIME)
                } else {
                  setStage(STAGES.PROCEDURE)
                }
              }}
              onBack={() => {
                if (!isFirstTime && foundPatientId) {
                  setStage(STAGES.IDENTIFICATION)
                } else {
                  setStage(STAGES.WELCOME)
                }
              }}
            />
          )}

          {stage === STAGES.PROCEDURE && (
            <ProcedureStage
              allowedProfIds={flowMode === 'DATE_FIRST' ? allowedProfIdsForTime : null}
              blockedProcedureIds={blockedProcedureIdsForTime}
              subtitle={flowMode === 'DATE_FIRST' ? timeSelectionSubtitle : null}
              onSelectProcedure={handleProcedureSelect}
              onBack={() => {
                if (flowMode === 'DATE_FIRST' && selectedTime) {
                  setStage(STAGES.DATETIME)
                } else {
                  setStage(STAGES.FLOW_SELECTION)
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
              onSelectDate={(date) => {
                setSelectedDate(date)
                setSelectedTime(null)
              }}
              onSelectTime={handleTimeSelect}
              handleCalendarDateSelect={handleCalendarDateSelect}
              onOpenWaitlistModal={(t = 'qualquer') => {
                setWaitlistTurno(t)
                setIsWaitlistModalOpen(true)
              }}
              onBack={() => {
                setSelectedProcedure(null)
                setSelectedTime(null)
                setStage(STAGES.FLOW_SELECTION)
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
                setSearchFailedByPhone(false)
                setStage(STAGES.WELCOME)
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <WaitlistModal 
        isOpen={isWaitlistModalOpen}
        onClose={() => setIsWaitlistModalOpen(false)}
        selectedDate={selectedDate}
        initialTurno={waitlistTurno}
        isFirstTime={isFirstTime}
        patientPhone={phone}
        patientName={foundPatientName || name}
      />
    </div>
  )
}
