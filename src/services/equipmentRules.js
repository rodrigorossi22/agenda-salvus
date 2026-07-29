import { FEEGOW_PROCEDURES, INACTIVE_APPOINTMENT_STATUSES } from '../constants/feegow.js';
import { timeToMinutes } from '../utils/dateHelpers.js';

/**
 * Calcula os IDs de procedimentos bloqueados para um intervalo de horario (slot)
 * com base nos agendamentos existentes no mesmo dia e na disponibilidade fisica dos equipamentos.
 * 
 * @param {number} slotStart - Inicio do slot em minutos desde a meia-noite
 * @param {number} slotEnd - Fim do slot em minutos desde a meia-noite
 * @param {Array} appointmentsForDate - Agendamentos do dia na clinica
 * @returns {Array<number>} IDs de procedimentos bloqueados por choque de equipamento
 */
export function getEquipmentOccupancy(slotStart, slotEnd, appointmentsForDate) {
  if (!appointmentsForDate || appointmentsForDate.length === 0) return [];

  const overlapping = appointmentsForDate.filter((appt) => {
    // Ignorar cancelados / inativos
    if (INACTIVE_APPOINTMENT_STATUSES.includes(Number(appt.status_id))) return false;

    const apptStart = timeToMinutes(appt.horario);
    const apptDur = Number(appt.duracao) || 60;
    const apptEnd = apptStart + apptDur;

    // Colisao de tempo
    return slotStart < apptEnd && slotEnd > apptStart;
  });

  const ventosaCount = overlapping.filter(
    (a) => Number(a.procedimento_id) === FEEGOW_PROCEDURES.VENTOSATERAPIA ||
           String(a.procedimento_nome || '').toLowerCase().includes('ventosa')
  ).length;

  const shapeDetoxCount = overlapping.filter(
    (a) => Number(a.procedimento_id) === FEEGOW_PROCEDURES.SHAPE_DETOX ||
           String(a.procedimento_nome || '').toLowerCase().includes('shape detox')
  ).length;

  const correnteRussaCount = overlapping.filter(
    (a) => Number(a.procedimento_id) === FEEGOW_PROCEDURES.CORRENTE_RUSSA ||
           String(a.procedimento_nome || '').toLowerCase().includes('corrente')
  ).length;

  const eletroCount = overlapping.filter(
    (a) => Number(a.procedimento_id) === FEEGOW_PROCEDURES.ELETROESTIMULACAO ||
           String(a.procedimento_nome || '').toLowerCase().includes('eletro')
  ).length;

  const heccusStrictCount = shapeDetoxCount + correnteRussaCount;
  const totalEletroDevicesCount = shapeDetoxCount + correnteRussaCount + eletroCount;

  const blockedProcIds = [];

  // Ventosaterapia: maximo 1 kit
  if (ventosaCount >= 1) {
    blockedProcIds.push(FEEGOW_PROCEDURES.VENTOSATERAPIA);
  }

  // Shape Detox: exige manta + Heccus (max 2)
  if (shapeDetoxCount >= 2 || heccusStrictCount >= 2) {
    blockedProcIds.push(FEEGOW_PROCEDURES.SHAPE_DETOX);
  }

  // Corrente Russa: exige Heccus (max 2)
  if (heccusStrictCount >= 2) {
    blockedProcIds.push(FEEGOW_PROCEDURES.CORRENTE_RUSSA);
  }

  // Eletroestimulacao: max 3 aparelhos de eletro / Heccus
  if (totalEletroDevicesCount >= 3 || (heccusStrictCount >= 2 && eletroCount >= 1)) {
    blockedProcIds.push(FEEGOW_PROCEDURES.ELETROESTIMULACAO);
  }

  return blockedProcIds;
}
