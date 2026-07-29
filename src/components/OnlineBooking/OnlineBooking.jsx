import React, { useState, useEffect, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
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

import { usePatientLimits } from '../../hooks/usePatientLimits'
import { usePatientSearch } from '../../hooks/usePatientSearch'
import { useAvailableSlots } from '../../hooks/useAvailableSlots'
import { useBookingFlow, STAGES } from '../../hooks/useBookingFlow'
import { FEEGOW_PROCEDURES, FEEGOW_PROFESSIONALS } from '../../constants/feegow'

const DEFAULT_PROCEDURE = {
  id: FEEGOW_PROCEDURES.EVALUATION_ESTHETIC,
  name: 'Atendimento Estético',
  duration: 60
}

export default function OnlineBooking() {
  const [isTestMode, setIsTestMode] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')

  const limits = usePatientLimits()
  const search = usePatientSearch(limits)
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), [])

  const [selectedProcedure, setSelectedProcedureState] = useState(null)
  const [flowMode, setFlowModeState] = useState(null)

  const slots = useAvailableSlots({
    selectedProcedure,
    flowMode,
    isTestMode,
    isDateAllowed: limits.isDateAllowed
  })

  const flow = useBookingFlow({
    patientSearch: search,
    patientLimits: limits,
    availableSlots: slots,
    isTestMode
  })

  const activeProfessionalId = isTestMode ? '1' : (flow.selectedProcedure?.professionalIds?.[0] || '15')

  // Auto detect test mode
  useEffect(() => {
    if (queryParams.get('test_mode') === 'true') {
      setIsTestMode(true)
    }
  }, [queryParams])

  // Process initial URL parameters (Vaga Relâmpago / Meus Agendamentos)
  useEffect(() => {
    const dateParam = queryParams.get('date')
    const timeParam = queryParams.get('time')
    const myApptsParam = queryParams.get('my_appointments')
    const phoneParam = queryParams.get('phone') || queryParams.get('telefone')

    if (myApptsParam === '1' || (phoneParam && !dateParam)) {
      flow.setStage(STAGES.MY_APPOINTMENTS)
      if (phoneParam) {
        search.setPhone(phoneParam)
        search.handleSearchPatient()
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
        slots.setSelectedDate(parsedDate)
        slots.setSelectedTime(timeParam)
        flow.setIsVagaRelampago(true)
        flow.setStage(STAGES.PROCEDURE)
      }
    }
  }, [queryParams])

  const handleBirthDateChange = (e) => {
    const value = e.target.value
    const digits = value.replace(/\D/g, '').slice(0, 8)
    let formatted = ''
    if (digits.length > 0) formatted += digits.slice(0, 2)
    if (digits.length > 2) formatted += '/' + digits.slice(2, 4)
    if (digits.length > 4) formatted += '/' + digits.slice(4, 8)
    setBirthDate(formatted)
  }

  const handleBirthDateBlur = (e) => {
    const value = e.target.value
    if (!value) return
    const parts = value.split('/')
    if (parts.length === 3 && parts[2].length === 2) {
      const yy = Number(parts[2])
      const currentYear2Digits = new Date().getFullYear() % 100
      const fullYear = yy > currentYear2Digits ? 1900 + yy : 2000 + yy
      parts[2] = String(fullYear)
      setBirthDate(parts.join('/'))
    }
  }

  const handleProcedureSelect = (procedure) => {
    flow.setSelectedProcedure(procedure)
    flow.setLastSelectedProcedureId(procedure.id)
    if (flow.flowMode === 'DATE_FIRST' && slots.selectedTime) {
      flow.setStage(STAGES.FORM)
    } else {
      flow.setStage(STAGES.DATETIME)
    }
  }

  const handleTimeSelect = (time, localId, profIdStr = null) => {
    slots.setSelectedTime(time)
    slots.setSelectedLocalId(localId)
    if (flow.flowMode === 'DATE_FIRST') {
      let allowedProfIds = null
      let blockedProcedureIds = null
      let subtitle = null

      if (profIdStr) {
        allowedProfIds = profIdStr.split(',')
        if (allowedProfIds.length === 1 && allowedProfIds.includes('5')) {
          blockedProcedureIds = [FEEGOW_PROCEDURES.EVALUATION_ESTHETIC, FEEGOW_PROCEDURES.AGENDA_ESTETICISTA]
          subtitle = 'Disponível apenas para procedimentos de Enfermagem (Shape Detox, Ventosa, etc.)'
        } else if (allowedProfIds.length === 1 && allowedProfIds.includes('16')) {
          blockedProcedureIds = [FEEGOW_PROCEDURES.EVALUATION_ESTHETIC]
          subtitle = 'Disponível para procedimentos com Esteticista'
        }
      }

      flow.setAllowedProfIdsForTime(allowedProfIds)
      flow.setBlockedProcedureIdsForTime(blockedProcedureIds)
      flow.setTimeSelectionSubtitle(subtitle)
      flow.setStage(STAGES.PROCEDURE)
    } else {
      flow.setStage(STAGES.FORM)
    }
  }

  const weekdaysWithSelected = useMemo(() => {
    if (!slots.datesWithSlots || slots.datesWithSlots.size === 0) {
      return (slots.selectedDate && !isNaN(slots.selectedDate.getTime())) ? [slots.selectedDate] : []
    }
    const datesArr = Array.from(slots.datesWithSlots).map((dStr) => {
      if (typeof dStr === 'string' && dStr.includes('-')) {
        const parts = dStr.split('-').map(Number);
        if (parts.length === 3 && parts[0] > 1900) {
          return new Date(parts[0], parts[1] - 1, parts[2]);
        }
      }
      return new Date(dStr);
    }).filter(d => d && !isNaN(d.getTime()));

    const isSelectedInList = datesArr.some(
      day => format(day, 'yyyy-MM-dd') === format(slots.selectedDate, 'yyyy-MM-dd')
    )
    if (!isSelectedInList && slots.selectedDate && !isNaN(slots.selectedDate.getTime())) {
      const combined = [...datesArr, slots.selectedDate]
      return combined.sort((a, b) => a.getTime() - b.getTime())
    }
    return datesArr.sort((a, b) => a.getTime() - b.getTime())
  }, [slots.datesWithSlots, slots.selectedDate])

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#2e2a25] flex flex-col items-center justify-start py-10 font-sans">
      <div className="mb-6 flex justify-center">
        <img src={salvusLogo} alt="Clínica Salvus" className="h-30 md:h-36 object-contain" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={flow.stage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="w-full flex justify-center"
        >
          {flow.stage === STAGES.WELCOME && (
            <WelcomeStage
              onSelectOption={(option) => {
                if (option === 'EXCLUSIVE_SOLUTIONS') {
                  flow.setStage(STAGES.EXCLUSIVE_SOLUTIONS)
                } else if (option === 'MY_APPOINTMENTS') {
                  flow.setIsFirstTime(false)
                  flow.setStage(STAGES.MY_APPOINTMENTS)
                } else if (option === 'PATIENT') {
                  flow.setIsFirstTime(false)
                  flow.setStage(STAGES.IDENTIFICATION)
                } else {
                  flow.setIsFirstTime(true)
                  flow.setStage(STAGES.FLOW_SELECTION)
                }
              }}
            />
          )}

          {flow.stage === STAGES.EXCLUSIVE_SOLUTIONS && (
            <ExclusiveSolutionsStage
              onBack={() => flow.setStage(STAGES.WELCOME)}
            />
          )}

          {flow.stage === STAGES.MY_APPOINTMENTS && (
            <MyAppointmentsStage
              phone={search.phone}
              onChangePhone={search.handlePhoneChange}
              searchingPatient={search.searchingPatient}
              foundPatientName={search.foundPatientName}
              appointments={limits.patientActiveAppointments}
              loadingAppointments={limits.loadingActiveAppointments}
              onSearchPatient={search.handleSearchPatient}
              onCancelAppointment={limits.handleCancelAppointment}
              onRescheduleAppointment={() => {
                flow.setIsFirstTime(false)
                flow.setStage(STAGES.FLOW_SELECTION)
              }}
              onNewBooking={() => {
                flow.setStage(STAGES.FLOW_SELECTION)
              }}
              onBack={() => flow.setStage(STAGES.WELCOME)}
            />
          )}

          {flow.stage === STAGES.IDENTIFICATION && (
            <IdentificationStage
              phone={search.phone}
              onChangePhone={search.handlePhoneChange}
              searchingPatient={search.searchingPatient}
              searchFailed={search.searchFailed}
              foundPatientId={search.foundPatientId}
              foundPatientName={search.foundPatientName}
              errorMessage={flow.errorMessage || limits.errorMessage}
              onSearchPatient={search.handleSearchPatient}
              onBack={() => flow.setStage(STAGES.WELCOME)}
              onProceed={(proceedAsFirstTime) => {
                if (proceedAsFirstTime) {
                  flow.setIsFirstTime(true)
                  search.setFoundPatientId(null)
                  search.setFoundPatientName('')
                }
                flow.setStage(STAGES.FLOW_SELECTION)
              }}
            />
          )}

          {flow.stage === STAGES.FLOW_SELECTION && (
            <FlowSelectionStage
              onSelectFlow={(mode) => {
                flow.setFlowMode(mode)
                if (mode === 'DATE_FIRST') {
                  flow.setSelectedProcedure(null)
                  flow.setAllowedProfIdsForTime(null)
                  flow.setTimeSelectionSubtitle(null)
                  flow.setStage(STAGES.DATETIME)
                } else {
                  flow.setStage(STAGES.PROCEDURE)
                }
              }}
              onBack={() => {
                if (!flow.isFirstTime && search.foundPatientId) {
                  flow.setStage(STAGES.IDENTIFICATION)
                } else {
                  flow.setStage(STAGES.WELCOME)
                }
              }}
            />
          )}

          {flow.stage === STAGES.PROCEDURE && (
            <ProcedureStage
              allowedProfIds={flow.flowMode === 'DATE_FIRST' ? flow.allowedProfIdsForTime : null}
              blockedProcedureIds={flow.blockedProcedureIdsForTime}
              subtitle={flow.flowMode === 'DATE_FIRST' ? flow.timeSelectionSubtitle : null}
              onSelectProcedure={handleProcedureSelect}
              onBack={() => {
                if (flow.flowMode === 'DATE_FIRST' && slots.selectedTime) {
                  flow.setStage(STAGES.DATETIME)
                } else {
                  flow.setStage(STAGES.FLOW_SELECTION)
                }
              }}
            />
          )}

          {flow.stage === STAGES.DATETIME && (
            <DateTimeStage
              selectedProcedure={flow.selectedProcedure}
              selectedDate={slots.selectedDate}
              loadingSlots={slots.loadingSlots}
              availableSlots={slots.availableSlots}
              isTestMode={isTestMode}
              setIsTestMode={setIsTestMode}
              activeProfessionalId={activeProfessionalId}
              errorMessage={slots.errorMessage || flow.errorMessage}
              loadSlots={slots.loadSlots}
              scarcitySlotsForDate={slots.scarcitySlotsForDate}
              datesWithSlots={slots.datesWithSlots}
              weekdaysWithSelected={weekdaysWithSelected}
              onSelectDate={(date) => {
                slots.setSelectedDate(date)
                slots.setSelectedTime(null)
              }}
              onSelectTime={handleTimeSelect}
              handleCalendarDateSelect={slots.handleCalendarDateSelect}
              onOpenWaitlistModal={(t = 'qualquer') => {
                flow.setWaitlistTurno(t)
                flow.setIsWaitlistModalOpen(true)
              }}
              onBack={() => {
                flow.setSelectedProcedure(null)
                slots.setSelectedTime(null)
                flow.setStage(STAGES.FLOW_SELECTION)
              }}
            />
          )}

          {flow.stage === STAGES.FORM && (
            <FormStage
              isFirstTime={flow.isFirstTime}
              selectedProcedure={flow.selectedProcedure}
              selectedDate={slots.selectedDate}
              selectedTime={slots.selectedTime}
              isTestMode={isTestMode}
              name={name}
              setName={setName}
              cpf={search.cpf}
              setCpf={search.setCpf}
              birthDate={birthDate}
              onChangeBirthDate={handleBirthDateChange}
              onBlurBirthDate={handleBirthDateBlur}
              email={email}
              setEmail={setEmail}
              phone={search.phone}
              onChangePhone={search.handlePhoneChange}
              foundPatientName={search.foundPatientName}
              submitting={flow.submitting}
              errorMessage={flow.errorMessage}
              onBooking={async (e, formData) => {
                if (formData) {
                  if (formData.name) setName(formData.name)
                  if (formData.cpf) search.setCpf(formData.cpf)
                  if (formData.email) setEmail(formData.email)
                  if (formData.phone) search.setPhone(formData.phone)
                }
                await flow.handleBooking(formData || { name, cpf: search.cpf, email, phone: search.phone, birthDate })
              }}
              onBack={() => flow.setStage(STAGES.DATETIME)}
            />
          )}

          {flow.stage === STAGES.SUCCESS && (
            <SuccessStage
              selectedProcedure={flow.selectedProcedure}
              appointmentDetails={flow.appointmentDetails}
              isTestMode={isTestMode}
              onReset={() => {
                flow.setSelectedProcedure(null)
                slots.setSelectedTime(null)
                setName('')
                search.setPhone('')
                search.setCpf('')
                setEmail('')
                setBirthDate('')
                search.setFoundPatientId(null)
                search.setFoundPatientName('')
                flow.setStage(STAGES.WELCOME)
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <WaitlistModal
        isOpen={flow.isWaitlistModalOpen}
        onClose={() => flow.setIsWaitlistModalOpen(false)}
        selectedDate={slots.selectedDate}
        initialTurno={flow.waitlistTurno}
        isFirstTime={flow.isFirstTime}
        patientPhone={search.phone}
        patientName={search.foundPatientName || name}
      />
    </div>
  )
}
