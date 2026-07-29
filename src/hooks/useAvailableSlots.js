import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { fetchAvailableSchedule, fetchAppointments, fetchProcedures } from '../services/feegow.js';
import { getEquipmentOccupancy } from '../services/equipmentRules.js';
import { timeToMinutes } from '../utils/dateHelpers.js';
import { BUSINESS_RULES, DEFAULT_PROFESSIONAL_IDS, ESTHETIC_BODY_PROCEDURE_IDS, FEEGOW_PROCEDURES, FEEGOW_PROFESSIONALS } from '../constants/feegow.js';

const DEFAULT_PROCEDURE_ID = FEEGOW_PROCEDURES.EVALUATION_ESTHETIC;

export function useAvailableSlots({ selectedProcedure, flowMode, isTestMode, isDateAllowed }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedLocalId, setSelectedLocalId] = useState(null);
  const [availableSlots, setAvailableSlots] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [maxFetchedDate, setMaxFetchedDate] = useState(null);
  const [procedureDurations, setProcedureDurations] = useState({});
  const [professionalAppointmentsRange, setProfessionalAppointmentsRange] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  const slotsCacheRef = useRef({});
  const hasAutoSelectedRef = useRef(false);

  // Carrega duracoes de procedimentos
  useEffect(() => {
    async function loadDurations() {
      try {
        const list = await fetchProcedures();
        const map = {};
        list.forEach((p) => {
          const id = p.id || p.procedimento_id;
          let time = Number(p.tempo) || BUSINESS_RULES.DEFAULT_PROCEDURE_DURATION_MINUTES;
          if (ESTHETIC_BODY_PROCEDURE_IDS.includes(Number(id))) {
            time = 60;
          }
          if (id) {
            map[id] = time;
          }
        });
        setProcedureDurations(map);
      } catch (err) {
        console.error('Erro ao carregar durações dos procedimentos:', err);
      }
    }
    loadDurations();
  }, []);

  // Reset do cache quando modo de teste ou procedimento mudarem
  useEffect(() => {
    setMaxFetchedDate(null);
    hasAutoSelectedRef.current = false;
  }, [isTestMode, selectedProcedure]);

  // Carregamento otimizado de slots
  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    setErrorMessage(null);
    try {
      const today = new Date();
      const todayStr = format(today, 'dd-MM-yyyy');

      const standardLimit = addDays(today, BUSINESS_RULES.INITIAL_SEARCH_DAYS);
      const endLimit = addDays(selectedDate, 10);
      const finalEnd = endLimit > standardLimit ? endLimit : standardLimit;
      const futureStr = format(finalEnd, 'dd-MM-yyyy');

      const targetProcId = isTestMode ? FEEGOW_PROCEDURES.SHAPE_DETOX : (selectedProcedure?.feegowId || DEFAULT_PROCEDURE_ID);
      let baseProfIds = isTestMode ? [FEEGOW_PROFESSIONALS.TEST_MODE_USER] : (selectedProcedure?.professionalIds || DEFAULT_PROFESSIONAL_IDS);
      if (!isTestMode && !baseProfIds.includes(FEEGOW_PROFESSIONALS.NURSING)) {
        baseProfIds = [...baseProfIds, FEEGOW_PROFESSIONALS.NURSING];
      }
      const targetProfIds = baseProfIds;

      const cacheKey = `${flowMode}_${targetProcId}_${todayStr}_${futureStr}_${isTestMode}`;
      const cached = slotsCacheRef.current[cacheKey];

      if (cached && (Date.now() - cached.timestamp < BUSINESS_RULES.SLOTS_CACHE_TTL_MS)) {
        setProfessionalAppointmentsRange(cached.filteredAppts);
        setAvailableSlots(cached.mergedSlots);
        setMaxFetchedDate(finalEnd);
        setLoadingSlots(false);
        return;
      }

      // Execucao paralela ultra-otimizada (sem resolver nomes de pacientes para maximo desempenho HTTP)
      const apptsPromise = fetchAppointments(todayStr, futureStr, null, false, false).catch((err) => {
        console.error('Erro ao carregar agendamentos:', err);
        return [];
      });

      const schedulePromises = targetProfIds.map((profId) => {
        let fetchProcId = targetProcId;
        if (String(profId) === FEEGOW_PROFESSIONALS.NURSING) {
          fetchProcId = FEEGOW_PROCEDURES.SHAPE_DETOX;
        } else if (flowMode === 'DATE_FIRST' && !selectedProcedure) {
          fetchProcId = String(profId) === FEEGOW_PROFESSIONALS.ESTETICISTA ? FEEGOW_PROCEDURES.AGENDA_ESTETICISTA : FEEGOW_PROCEDURES.SHAPE_DETOX;
        }
        return fetchAvailableSchedule({
          procedimento_id: fetchProcId,
          data_start: todayStr,
          data_end: futureStr,
          profissional_id: profId,
        }).catch((err) => {
          console.error(`Erro ao carregar agenda do profissional ${profId}:`, err);
          return null;
        });
      });

      const [allAppts, ...scheduleResults] = await Promise.all([apptsPromise, ...schedulePromises]);

      const filteredAppts = (allAppts || []).filter((a) => targetProfIds.includes(String(a.profissional_id)));
      setProfessionalAppointmentsRange(filteredAppts);

      const mergedSlots = {};
      const reversedProfIds = [...targetProfIds].reverse();

      reversedProfIds.forEach((profId) => {
        const originalIndex = targetProfIds.indexOf(profId);
        const data = scheduleResults[originalIndex];
        if (!data) return;

        const localMap = data.profissional_id?.[profId]?.local_id || {};
        Object.keys(localMap).forEach((localId) => {
          if (!mergedSlots[localId]) {
            mergedSlots[localId] = {};
          }

          const dateMap = localMap[localId] || {};
          Object.keys(dateMap).forEach((dateKey) => {
            if (!mergedSlots[localId][dateKey]) {
              mergedSlots[localId][dateKey] = {};
            }

            const times = dateMap[dateKey] || [];
            times.forEach((timeStr) => {
              const current = mergedSlots[localId][dateKey][timeStr];
              if (current) {
                if (!current.split(',').includes(String(profId))) {
                  mergedSlots[localId][dateKey][timeStr] = `${current},${profId}`;
                }
              } else {
                mergedSlots[localId][dateKey][timeStr] = String(profId);
              }
            });
          });
        });
      });

      slotsCacheRef.current[cacheKey] = {
        filteredAppts,
        mergedSlots,
        timestamp: Date.now(),
      };

      setAvailableSlots(mergedSlots);
      setMaxFetchedDate(finalEnd);
    } catch (err) {
      console.error('Erro em loadSlots:', err);
      setErrorMessage('Erro ao carregar horários disponíveis da Feegow. Tente novamente.');
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedProcedure, isTestMode, selectedDate, flowMode]);

  const appointmentsForSelectedDate = useMemo(() => {
    if (!selectedDate || !professionalAppointmentsRange) return [];
    const targetDateStr = format(selectedDate, 'dd-MM-yyyy');
    return professionalAppointmentsRange.filter((a) => {
      if (!a?.data) return false;
      const cleanData = String(a.data).replace(/\//g, '-');
      if (cleanData === targetDateStr) return true;
      if (cleanData.includes('-')) {
        const parts = cleanData.split('-');
        if (parts[0].length === 4) {
          const formatted = `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
          return formatted === targetDateStr;
        }
      }
      return cleanData === targetDateStr;
    });
  }, [selectedDate, professionalAppointmentsRange]);

  const scarcitySlotsForDate = useMemo(() => {
    let morning = [];
    let afternoon = [];
    let evening = [];
    let foundLocalId = null;
    let slotLocals = {};

    if (!selectedDate || isNaN(selectedDate.getTime()) || !availableSlots) {
      return { morning, afternoon, evening, localId: foundLocalId, slotLocals };
    }

    if (isDateAllowed && !isDateAllowed(selectedDate)) {
      return { morning: [], afternoon: [], evening: [], localId: null, slotLocals: {} };
    }

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const dateStr = format(selectedDate, 'dd-MM-yyyy');
    const candidates = [];

    for (const localId of Object.keys(availableSlots)) {
      const dateSlots = availableSlots[localId]?.[dateKey] || {};
      const times = Object.keys(dateSlots).sort();
      if (times.length > 0) {
        const validSlots = times.filter((time) => {
          const slotProfId = String(dateSlots[time]);

          if (dateKey === '2026-07-13' && time === '17:30:00' && selectedProcedure?.feegowId === 338) {
            return false;
          }

          if (dateKey === '2026-07-31') {
            const isAllowedNursing = ['15:30:00', '15:30', '16:30:00', '16:30', '17:30:00', '17:30', '18:30:00', '18:30', '19:30:00', '19:30'].includes(time);
            if (!isAllowedNursing) return false;
          }

          const slotMinutes = timeToMinutes(time);
          const currentProcId = selectedProcedure?.feegowId || 149;
          const procDuration = procedureDurations[currentProcId] || 60;
          const slotEndMinutes = slotMinutes + procDuration;

          if (slotEndMinutes > BUSINESS_RULES.CLINIC_CLOSING_TIME_MINUTES + BUSINESS_RULES.CLINIC_CLOSING_TOLERANCE_MINUTES) {
            return false;
          }

          const blockedProcIds = getEquipmentOccupancy(slotMinutes, slotEndMinutes, appointmentsForSelectedDate);
          if (blockedProcIds.includes(currentProcId)) {
            return false;
          }

          if (slotProfId.includes(FEEGOW_PROFESSIONALS.ESTETICISTA)) {
            const dayOfWeek = selectedDate.getDay();
            if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) return true; // Seg, Qua, Sex
          }

          if (slotProfId.includes(FEEGOW_PROFESSIONALS.MONICA_SOUSA)) return true;
          if (slotProfId.includes(FEEGOW_PROFESSIONALS.NURSING)) return true;
          if (isTestMode) return true;

          return false;
        });

        if (validSlots.length > 0) {
          candidates.push({ localId, count: validSlots.length, slots: validSlots, rawDateSlots: dateSlots });
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.count - a.count);
      const best = candidates[0];
      foundLocalId = best.localId;

      best.slots.forEach((time) => {
        const hh = parseInt(time.split(':')[0], 10);
        const timeShort = time.substring(0, 5);
        slotLocals[timeShort] = best.localId;
        if (hh < 12) morning.push(timeShort);
        else if (hh < 18) afternoon.push(timeShort);
        else evening.push(timeShort);
      });
    }

    return { morning, afternoon, evening, localId: foundLocalId, slotLocals };
  }, [selectedDate, availableSlots, isDateAllowed, selectedProcedure, procedureDurations, appointmentsForSelectedDate, isTestMode]);

  const datesWithSlots = useMemo(() => {
    const set = new Set();
    if (!availableSlots) return set;
    Object.keys(availableSlots).forEach((localId) => {
      const datesObj = availableSlots[localId] || {};
      Object.keys(datesObj).forEach((dateKey) => {
        const times = Object.keys(datesObj[dateKey] || {});
        if (times.length > 0) set.add(dateKey);
      });
    });
    return set;
  }, [availableSlots]);

  const handleCalendarDateSelect = useCallback((date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  }, []);

  return {
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    selectedLocalId,
    setSelectedLocalId,
    availableSlots,
    loadingSlots,
    loadSlots,
    maxFetchedDate,
    scarcitySlotsForDate,
    datesWithSlots,
    handleCalendarDateSelect,
    errorMessage,
  };
}
