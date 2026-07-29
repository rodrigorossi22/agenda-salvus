import { FEEGOW_PROCEDURES, INACTIVE_APPOINTMENT_STATUSES } from '../constants/feegow.js';
import { timeToMinutes } from '../utils/dateHelpers.js';

/**
 * Calcula os IDs de procedimentos bloqueados para um intervalo de horario (slot)
 * com base nos agendamentos existentes no mesmo dia e na disponibilidade fisica dos equipamentos.
 * 
 * @param {number} slotStart - Inicio do slot em minutos desde a meia-noite
 * @param {number} slotEnd - Fim do slot em minutos desde a meia-noite
 * @param {Array} appointmentsForDate - Agendamentos do dia na clinica
 * @param {Object} [options] - Opcoes adicionais
 * @param {boolean} [options.isSoloMode=false] - Se true, aplica regras de atendimento solo
 *   (max 2 aparelhos simultaneos + bloqueio de procedimentos manuais adjacentes)
 * @returns {Array<number>} IDs de procedimentos bloqueados por choque de equipamento
 */
export function getEquipmentOccupancy(slotStart, slotEnd, appointmentsForDate, options = {}) {
  const { isSoloMode = false } = options;

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
  const totalDeviceCount = shapeDetoxCount + correnteRussaCount + eletroCount;

  const blockedProcIds = [];

  if (isSoloMode) {
    // ===== MODO ATENDIMENTO SOLO (Ex: Sábado 01/08/2026) =====
    // Máximo de 2 aparelhos simultâneos no total (qualquer combinação)

    // Ventosaterapia: maximo 1 kit (igual ao modo normal)
    if (ventosaCount >= 1) {
      blockedProcIds.push(FEEGOW_PROCEDURES.VENTOSATERAPIA);
    }

    // Com 2+ aparelhos em uso, bloqueia TODOS os procedimentos com aparelhos
    if (totalDeviceCount >= 2) {
      if (!blockedProcIds.includes(FEEGOW_PROCEDURES.SHAPE_DETOX)) {
        blockedProcIds.push(FEEGOW_PROCEDURES.SHAPE_DETOX);
      }
      if (!blockedProcIds.includes(FEEGOW_PROCEDURES.CORRENTE_RUSSA)) {
        blockedProcIds.push(FEEGOW_PROCEDURES.CORRENTE_RUSSA);
      }
      if (!blockedProcIds.includes(FEEGOW_PROCEDURES.ELETROESTIMULACAO)) {
        blockedProcIds.push(FEEGOW_PROCEDURES.ELETROESTIMULACAO);
      }
    }

    // Procedimentos Manuais: bloqueio por adjacencia (30 min)
    // Ventosa, Massagem, Drenagem, Avaliação exigem atenção dedicada 1-para-1
    const handsOnProcIds = [
      FEEGOW_PROCEDURES.EVALUATION_ESTHETIC,
      FEEGOW_PROCEDURES.VENTOSATERAPIA,
      FEEGOW_PROCEDURES.MASSAGEM_MODELADORA,
      FEEGOW_PROCEDURES.DRENAGEM_LINFATICA,
    ];

    const activeAppointments = appointmentsForDate.filter(
      (a) => !INACTIVE_APPOINTMENT_STATUSES.includes(Number(a.status_id))
    );

    const hasAdjacentHandsOn = activeAppointments.some((a) => {
      const procId = Number(a.procedimento_id);
      const procName = String(a.procedimento_nome || '').toLowerCase();
      const isHandsOn = handsOnProcIds.includes(procId) ||
        procName.includes('ventosa') ||
        procName.includes('massagem') ||
        procName.includes('drenagem') ||
        procName.includes('avaliação') ||
        procName.includes('avaliacao');

      if (!isHandsOn) return false;

      const apptStart = timeToMinutes(a.horario);
      const diffMin = Math.abs(slotStart - apptStart);
      return diffMin <= 30;
    });

    if (hasAdjacentHandsOn) {
      handsOnProcIds.forEach((id) => {
        if (!blockedProcIds.includes(id)) {
          blockedProcIds.push(id);
        }
      });
    }
  } else {
    // ===== MODO NORMAL (dias com equipe completa) =====

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
    if (totalDeviceCount >= 3 || (heccusStrictCount >= 2 && eletroCount >= 1)) {
      blockedProcIds.push(FEEGOW_PROCEDURES.ELETROESTIMULACAO);
    }
  }

  return blockedProcIds;
}
