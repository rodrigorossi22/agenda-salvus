import { useState, useCallback, useEffect } from 'react';
import { createPatient, createAppointment } from '../services/feegow.js';
import { FEEGOW_ORIGIN, BUSINESS_RULES } from '../constants/feegow.js';

export const STAGES = {
  WELCOME: 'WELCOME',
  IDENTIFICATION: 'IDENTIFICATION',
  FLOW_SELECTION: 'FLOW_SELECTION',
  PROCEDURE: 'PROCEDURE',
  DATETIME: 'DATETIME',
  FORM: 'FORM',
  SUCCESS: 'SUCCESS',
  MY_APPOINTMENTS: 'MY_APPOINTMENTS',
  EXCLUSIVE_SOLUTIONS: 'EXCLUSIVE_SOLUTIONS',
};

const sendWhatsappConfirmation = (data) => {
  const webhookUrl = 'https://rossiatmz.com.br/n8n/webhook/agendamento-online-confirmacao';
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch((err) => console.error('Erro ao disparar notificação de confirmação WhatsApp:', err));
};

export function useBookingFlow({ patientSearch, patientLimits, availableSlots, isTestMode }) {
  const [stage, setStage] = useState(STAGES.WELCOME);
  const [flowMode, setFlowMode] = useState(null); // 'DATE_FIRST' | 'PROCEDURE_FIRST'
  const [allowedProfIdsForTime, setAllowedProfIdsForTime] = useState(null);
  const [blockedProcedureIdsForTime, setBlockedProcedureIdsForTime] = useState(null);
  const [timeSelectionSubtitle, setTimeSelectionSubtitle] = useState(null);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [lastSelectedProcedureId, setLastSelectedProcedureId] = useState(null);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [waitlistTurno, setWaitlistTurno] = useState('qualquer');
  const [isVagaRelampago, setIsVagaRelampago] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Origem UTM
  const getOrigemId = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const utmSource = (params.get('utm_source') || '').toLowerCase();
    const utmMedium = (params.get('utm_medium') || '').toLowerCase();
    const origemParam = params.get('origem');

    if (origemParam && !isNaN(Number(origemParam))) return Number(origemParam);
    if (utmSource.includes('instagram') || utmMedium.includes('instagram')) return FEEGOW_ORIGIN.INSTAGRAM_DM;
    if (
      utmSource.includes('cpc') || utmMedium.includes('cpc') ||
      utmSource.includes('google') || utmMedium.includes('google') ||
      utmSource.includes('ad') || utmMedium.includes('ad')
    ) {
      return FEEGOW_ORIGIN.PAID_TRAFFIC;
    }
    return FEEGOW_ORIGIN.DIRECT_WHATSAPP;
  }, []);

  const handleBooking = useCallback(async (formData, slotsData = {}) => {
    const bookingDate = slotsData.selectedDate || availableSlots?.selectedDate;
    const bookingTime = slotsData.selectedTime || availableSlots?.selectedTime;
    const bookingLocalId = slotsData.selectedLocalId || availableSlots?.selectedLocalId;

    if (!bookingDate || !bookingTime) {
      setErrorMessage('Por favor, selecione uma data e horário.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      let patientId = patientSearch?.foundPatientId;

      if (!patientId) {
        const createRes = await createPatient({
          nome_completo: formData.name,
          celular: formData.phone,
          cpf: formData.cpf,
          email: formData.email,
          nascimento: formData.birthDate,
          origem_id: getOrigemId(),
        });
        patientId = createRes;
      }

      if (!patientId) {
        throw new Error('Não foi possível identificar ou criar o cadastro do paciente.');
      }

      const procId = selectedProcedure?.feegowId || 149;
      const profId = isTestMode ? '1' : (selectedProcedure?.professionalIds?.[0] || '15');
      const formattedDate = `${String(bookingDate.getDate()).padStart(2, '0')}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}-${bookingDate.getFullYear()}`;
      const formattedTime = `${bookingTime}:00`;

      const apptRes = await createAppointment({
        local_id: bookingLocalId || 1,
        paciente_id: patientId,
        procedimento_id: procId,
        profissional_id: profId,
        data: formattedDate,
        horario: formattedTime,
        notas: `Agendamento realizado via WebApp Salvus. Origem: ${getOrigemId()}`,
      });

      const details = {
        patientName: formData.name || patientSearch?.foundPatientName,
        procedureName: selectedProcedure?.name || 'Atendimento Estético',
        date: formattedDate,
        time: bookingTime,
        phone: formData.phone || patientSearch?.phone,
      };

      setAppointmentDetails(details);
      sendWhatsappConfirmation(details);
      setStage(STAGES.SUCCESS);
    } catch (err) {
      console.error('Erro no agendamento:', err);
      setErrorMessage(err.message || 'Erro ao realizar agendamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }, [availableSlots, isTestMode, patientSearch, selectedProcedure, getOrigemId]);

  return {
    stage,
    setStage,
    flowMode,
    setFlowMode,
    allowedProfIdsForTime,
    setAllowedProfIdsForTime,
    blockedProcedureIdsForTime,
    setBlockedProcedureIdsForTime,
    timeSelectionSubtitle,
    setTimeSelectionSubtitle,
    selectedProcedure,
    setSelectedProcedure,
    lastSelectedProcedureId,
    setLastSelectedProcedureId,
    isFirstTime,
    setIsFirstTime,
    isWaitlistModalOpen,
    setIsWaitlistModalOpen,
    waitlistTurno,
    setWaitlistTurno,
    isVagaRelampago,
    setIsVagaRelampago,
    appointmentDetails,
    submitting,
    errorMessage,
    setErrorMessage,
    handleBooking,
  };
}
