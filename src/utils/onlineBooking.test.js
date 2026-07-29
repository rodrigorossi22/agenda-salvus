import { describe, it, expect } from 'vitest';
import { timeToMinutes } from './dateHelpers.js';
import { getEquipmentOccupancy } from '../services/equipmentRules.js';
import { FEEGOW_PROCEDURES } from '../constants/feegow.js';

describe('timeToMinutes', () => {
  it('converte "08:30" -> 510', () => expect(timeToMinutes('08:30')).toBe(510));
  it('converte "14:00" -> 840', () => expect(timeToMinutes('14:00')).toBe(840));
  it('converte "20:30" -> 1230', () => expect(timeToMinutes('20:30')).toBe(1230));
  it('retorna 0 para string vazia', () => expect(timeToMinutes('')).toBe(0));
});

describe('getEquipmentOccupancy', () => {
  const start = 600, end = 660; // 10:00–11:00

  it('sem agendamentos -> sem bloqueios', () => {
    expect(getEquipmentOccupancy(start, end, [])).toEqual([]);
  });

  it('ignora cancelados (status 11, 12, 14)', () => {
    const appts = [{ status_id: 11, horario: '10:00', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.VENTOSATERAPIA }];
    expect(getEquipmentOccupancy(start, end, appts)).toEqual([]);
  });

  it('bloqueia Ventosa (346) com 1 em uso', () => {
    const appts = [{ status_id: 1, horario: '10:15', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.VENTOSATERAPIA }];
    expect(getEquipmentOccupancy(start, end, appts)).toContain(FEEGOW_PROCEDURES.VENTOSATERAPIA);
  });

  it('bloqueia Shape Detox (338) + Corrente Russa (354) com 2 Heccus em uso', () => {
    const appts = [
      { status_id: 1, horario: '09:30', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.SHAPE_DETOX },
      { status_id: 1, horario: '10:30', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.CORRENTE_RUSSA },
    ];
    const blocked = getEquipmentOccupancy(start, end, appts);
    expect(blocked).toContain(FEEGOW_PROCEDURES.SHAPE_DETOX);
    expect(blocked).toContain(FEEGOW_PROCEDURES.CORRENTE_RUSSA);
  });

  it('bloqueia Eletro (347) com 3+ dispositivos em uso', () => {
    const appts = [
      { status_id: 1, horario: '10:00', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.SHAPE_DETOX },
      { status_id: 1, horario: '10:00', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.CORRENTE_RUSSA },
      { status_id: 1, horario: '10:00', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.ELETROESTIMULACAO },
    ];
    expect(getEquipmentOccupancy(start, end, appts)).toContain(FEEGOW_PROCEDURES.ELETROESTIMULACAO);
  });
});
