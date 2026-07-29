import { useState, useCallback } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { fetchAppointments, updateAppointmentStatus } from '../services/feegow.js';
import { BUSINESS_RULES, EXCLUDED_ACTIVE_STATUSES, EXCLUDED_HISTORY_STATUSES } from '../constants/feegow.js';

export function usePatientLimits() {
  const [patientMonthlyAppointments, setPatientMonthlyAppointments] = useState([]);
  const [loadingCpfHistory, setLoadingCpfHistory] = useState(false);
  const [patientActiveAppointments, setPatientActiveAppointments] = useState([]);
  const [loadingActiveAppointments, setLoadingActiveAppointments] = useState(false);
  const [cancelledLateThisSession, setCancelledLateThisSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadPatientAppointmentsHistory = useCallback(async (patientId) => {
    if (!patientId) return;
    setLoadingCpfHistory(true);
    setErrorMessage(null);
    try {
      const today = new Date();
      const startYear = today.getFullYear();
      const startMonth = String(today.getMonth() + 1).padStart(2, '0');
      const dateStart = `01-${startMonth}-${startYear}`;

      const futureLimit = addDays(today, BUSINESS_RULES.HISTORY_SEARCH_DAYS);
      const dateEnd = format(futureLimit, 'dd-MM-yyyy');

      const appts = await fetchAppointments(dateStart, dateEnd, patientId, true);
      const activeAppts = appts.filter(
        (a) => !EXCLUDED_HISTORY_STATUSES.includes(Number(a.status_id))
      );
      setPatientMonthlyAppointments(activeAppts);
    } catch (err) {
      console.error('Erro ao buscar histórico de agendamentos:', err);
    } finally {
      setLoadingCpfHistory(false);
    }
  }, []);

  const loadPatientActiveAppointments = useCallback(async (patientId) => {
    if (!patientId) return;
    setLoadingActiveAppointments(true);
    try {
      const today = new Date();
      const dateStart = format(today, 'dd-MM-yyyy');
      const futureLimit = addDays(today, BUSINESS_RULES.ACTIVE_SEARCH_DAYS);
      const dateEnd = format(futureLimit, 'dd-MM-yyyy');

      const appts = await fetchAppointments(dateStart, dateEnd, patientId, false);
      const activeFuture = appts.filter((a) => !EXCLUDED_ACTIVE_STATUSES.includes(Number(a.status_id)));
      setPatientActiveAppointments(activeFuture);
    } catch (err) {
      console.error('Erro ao buscar agendamentos ativos:', err);
    } finally {
      setLoadingActiveAppointments(false);
    }
  }, []);

  const isDateAllowed = useCallback(
    (dateToCheck) => {
      if (!patientMonthlyAppointments || patientMonthlyAppointments.length === 0) return true;

      // Trava 1: Cancelamento tardio (<24h) na sessao atual bloqueia novos agendamentos na semana
      if (cancelledLateThisSession) {
        const today = new Date();
        const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
        const endOfCurrentWeek = addDays(startOfCurrentWeek, 6);
        const checkTime = dateToCheck.getTime();
        if (checkTime >= startOfCurrentWeek.getTime() && checkTime <= endOfCurrentWeek.getTime()) {
          return false;
        }
      }

      const targetMonth = dateToCheck.getMonth();
      const targetYear = dateToCheck.getFullYear();

      // Trava 2: Maximo 2 agendamentos por mes calendario
      const sameMonthAppts = patientMonthlyAppointments.filter((a) => {
        if (!a?.data) return false;
        const parts = a.data.split('-');
        if (parts.length !== 3) return false;
        let apptYear, apptMonth;
        if (parts[0].length === 4) {
          apptYear = Number(parts[0]);
          apptMonth = Number(parts[1]) - 1;
        } else {
          apptYear = Number(parts[2]);
          apptMonth = Number(parts[1]) - 1;
        }
        return apptMonth === targetMonth && apptYear === targetYear;
      });

      if (sameMonthAppts.length >= BUSINESS_RULES.MAX_PATIENT_MONTHLY_APPOINTMENTS) return false;

      // Trava 3: Maximo 1 agendamento por semana (segunda a domingo)
      const weekStart = startOfWeek(dateToCheck, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);

      const sameWeekAppts = patientMonthlyAppointments.filter((a) => {
        if (!a?.data) return false;
        const parts = a.data.split('-');
        let apptDate;
        if (parts[0].length === 4) {
          apptDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else {
          apptDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
        return apptDate >= weekStart && apptDate <= weekEnd;
      });

      if (sameWeekAppts.length >= BUSINESS_RULES.MAX_PATIENT_WEEKLY_APPOINTMENTS) return false;

      return true;
    },
    [patientMonthlyAppointments, cancelledLateThisSession]
  );

  const handleCancelAppointment = useCallback(async (appt) => {
    if (!appt || !appt.agendamento_id) return;
    try {
      await updateAppointmentStatus({
        agendamento_id: appt.agendamento_id,
        status_id: 11, // Cancelado pelo paciente
        obs: 'Cancelado via portal de agendamento do paciente',
      });

      // Checa se o cancelamento foi tardio (<24h)
      if (appt.data && appt.horario) {
        const parts = appt.data.split('-');
        let apptDateTime;
        const timeParts = appt.horario.split(':').map(Number);
        if (parts[0].length === 4) {
          apptDateTime = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), timeParts[0], timeParts[1]);
        } else {
          apptDateTime = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), timeParts[0], timeParts[1]);
        }

        const diffHours = (apptDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);
        if (diffHours < BUSINESS_RULES.LATE_CANCELLATION_THRESHOLD_HOURS) {
          setCancelledLateThisSession(true);
        }
      }

      // Atualiza listas locais
      if (appt.paciente_id) {
        loadPatientAppointmentsHistory(appt.paciente_id);
        loadPatientActiveAppointments(appt.paciente_id);
      }
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
      throw err;
    }
  }, [loadPatientActiveAppointments, loadPatientAppointmentsHistory]);

  return {
    patientMonthlyAppointments,
    loadingCpfHistory,
    patientActiveAppointments,
    loadingActiveAppointments,
    cancelledLateThisSession,
    errorMessage,
    setErrorMessage,
    loadPatientAppointmentsHistory,
    loadPatientActiveAppointments,
    isDateAllowed,
    handleCancelAppointment,
  };
}
