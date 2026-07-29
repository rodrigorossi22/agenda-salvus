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

describe('getEquipmentOccupancy – Modo Normal (equipe completa)', () => {
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

  it('permite 3 aparelhos no modo normal (1 Shape + 1 Corrente + 1 Eletro nao bloqueia Shape nem Corrente)', () => {
    const appts = [
      { status_id: 1, horario: '10:00', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.SHAPE_DETOX },
      { status_id: 1, horario: '10:00', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.ELETROESTIMULACAO },
    ];
    const blocked = getEquipmentOccupancy(start, end, appts);
    // 2 aparelhos (1 Heccus + 1 Eletro) - nao atinge limite de 3
    expect(blocked).not.toContain(FEEGOW_PROCEDURES.CORRENTE_RUSSA);
  });
});

describe('getEquipmentOccupancy – Modo Solo (Sábado / Mônica sozinha)', () => {
  const soloOpts = { isSoloMode: true };

  it('sem agendamentos -> sem bloqueios no modo solo', () => {
    expect(getEquipmentOccupancy(750, 810, [], soloOpts)).toEqual([]); // 12:30-13:30
  });

  it('permite 1 aparelho de cada tipo (1 Shape + 1 Eletro = 2 total, bloqueia 3o)', () => {
    const appts = [
      { status_id: 1, horario: '12:30', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.SHAPE_DETOX },
      { status_id: 1, horario: '12:30', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.ELETROESTIMULACAO },
    ];
    const blocked = getEquipmentOccupancy(750, 810, appts, soloOpts);
    // Com 2 aparelhos, bloqueia TODOS os aparelhos
    expect(blocked).toContain(FEEGOW_PROCEDURES.SHAPE_DETOX);
    expect(blocked).toContain(FEEGOW_PROCEDURES.CORRENTE_RUSSA);
    expect(blocked).toContain(FEEGOW_PROCEDURES.ELETROESTIMULACAO);
  });

  it('permite 2x Shape Detox simultaneos', () => {
    const appts = [
      { status_id: 1, horario: '12:30', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.SHAPE_DETOX },
    ];
    const blocked = getEquipmentOccupancy(750, 810, appts, soloOpts);
    // Apenas 1 aparelho, segundo Shape ainda é permitido
    expect(blocked).not.toContain(FEEGOW_PROCEDURES.SHAPE_DETOX);
  });

  it('com 1 Shape, permite 1 Corrente Russa (1+1=2 ok)', () => {
    const appts = [
      { status_id: 1, horario: '13:00', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.SHAPE_DETOX },
    ];
    const blocked = getEquipmentOccupancy(780, 840, appts, soloOpts);
    expect(blocked).not.toContain(FEEGOW_PROCEDURES.CORRENTE_RUSSA);
    expect(blocked).not.toContain(FEEGOW_PROCEDURES.ELETROESTIMULACAO);
  });

  it('bloqueia procedimentos manuais adjacentes (<= 30 min) no modo solo', () => {
    const appts = [
      { status_id: 1, horario: '12:30', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.VENTOSATERAPIA, procedimento_nome: 'Ventosaterapia' },
    ];
    // Slot às 13:00 (30 min de diferença do inicio da Ventosa às 12:30)
    const blocked = getEquipmentOccupancy(780, 840, appts, soloOpts);
    expect(blocked).toContain(FEEGOW_PROCEDURES.VENTOSATERAPIA);
    expect(blocked).toContain(FEEGOW_PROCEDURES.MASSAGEM_MODELADORA);
    expect(blocked).toContain(FEEGOW_PROCEDURES.DRENAGEM_LINFATICA);
    expect(blocked).toContain(FEEGOW_PROCEDURES.EVALUATION_ESTHETIC);
    // Aparelhos continuam permitidos!
    expect(blocked).not.toContain(FEEGOW_PROCEDURES.SHAPE_DETOX);
    expect(blocked).not.toContain(FEEGOW_PROCEDURES.CORRENTE_RUSSA);
  });

  it('NÃO bloqueia procedimentos manuais com > 30 min de diferença no modo solo', () => {
    const appts = [
      { status_id: 1, horario: '12:30', duracao: 60, procedimento_id: FEEGOW_PROCEDURES.VENTOSATERAPIA, procedimento_nome: 'Ventosaterapia' },
    ];
    // Slot às 14:00 (90 min de diferença, > 30)
    const blocked = getEquipmentOccupancy(840, 900, appts, soloOpts);
    // Ventosa ja bloqueada por kit=1, mas massagem/drenagem devem estar livres
    expect(blocked).not.toContain(FEEGOW_PROCEDURES.MASSAGEM_MODELADORA);
    expect(blocked).not.toContain(FEEGOW_PROCEDURES.DRENAGEM_LINFATICA);
  });
});
