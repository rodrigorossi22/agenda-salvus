import { describe, it, expect } from 'vitest'

/**
 * Testes de Regressão e Validação de Regras de Negócio - OnlineBooking
 * 
 * Regra: Falso Negativo de Horários Compartilhados (Merge de profIds).
 * Quando múltiplos profissionais compartilham o mesmo horário (ex: "15,5"),
 * a restrição de um profissional (ex: Enfermagem ID 5 fora de 31/07) DEVE remover
 * apenas o ID restrito, mantendo o horário disponível para os demais (ex: Dra. Monica ID 15).
 */

// Simulação da função de filtragem de profissionais por horário (lógica das funções scarcitySlotsForDate e datesWithSlots do OnlineBooking.jsx)
function filterSlotProfIds(slotProfId, time, dateKey, dayOfWeek, slotStart, slotEnd) {
  let validProfIds = slotProfId.split(',')

  // 1. Terça, Quinta e Sexta para a Esteticista (ID 16)
  if (validProfIds.includes('16') && dayOfWeek !== 2 && dayOfWeek !== 4 && dayOfWeek !== 5) {
    validProfIds = validProfIds.filter(id => id !== '16')
  }

  // 2. Regra Especial Enfermagem (ID 5): Liberado EXCLUSIVAMENTE em 31/07/2026 nos horários específicos
  if (validProfIds.includes('5')) {
    const isAllowedFor5 = dateKey === '2026-07-31' && [
      '15:30:00', '15:30', '16:30:00', '16:30', '17:30:00', '17:30', '18:30:00', '18:30', '19:30:00', '19:30'
    ].includes(time)
    
    if (!isAllowedFor5) {
      validProfIds = validProfIds.filter(id => id !== '5')
    }
  }

  // 3. Bloqueio de Almoço da Monica Sousa (ID 15) entre 14:00 (840 min) e 15:00 (900 min)
  if (validProfIds.includes('15')) {
    const LUNCH_START = 14 * 60
    const LUNCH_END = 15 * 60
    if ((slotStart < LUNCH_START && slotEnd > LUNCH_START) || (slotStart >= LUNCH_START && slotStart < LUNCH_END)) {
      validProfIds = validProfIds.filter(id => id !== '15')
    }
  }

  if (validProfIds.length === 0) return null

  return validProfIds.join(',')
}

describe('OnlineBooking - Anti-Regressão de Falsos Negativos (validProfIds)', () => {
  it('deve manter o horário das 11:30 disponível para a Dra. Monica (ID 15) quando compartilhado com Enfermagem (ID 5) em 30/07/2026', () => {
    const slotProfId = '15,5'
    const time = '11:30:00'
    const dateKey = '2026-07-30' // Quinta-feira (não é 31/07/2026)
    const dayOfWeek = 4
    const slotStart = 11 * 60 + 30 // 690 min
    const slotEnd = slotStart + 60   // 750 min

    const result = filterSlotProfIds(slotProfId, time, dateKey, dayOfWeek, slotStart, slotEnd)

    // O resultado deve remover apenas o ID 5 e preservar o ID 15
    expect(result).toBe('15')
  })

  it('deve descartar o horário quando APENAS a Enfermagem (ID 5) estiver alocada fora da data permitida (31/07/2026)', () => {
    const slotProfId = '5'
    const time = '11:30:00'
    const dateKey = '2026-07-30'
    const dayOfWeek = 4
    const slotStart = 690
    const slotEnd = 750

    const result = filterSlotProfIds(slotProfId, time, dateKey, dayOfWeek, slotStart, slotEnd)

    // Deve retornar null (horário descartado) pois o array validProfIds fica totalmente vazio
    expect(result).toBeNull()
  })

  it('deve permitir a Enfermagem (ID 5) no dia 31/07/2026 no horário permitido (15:30)', () => {
    const slotProfId = '5'
    const time = '15:30:00'
    const dateKey = '2026-07-31'
    const dayOfWeek = 5 // Sexta-feira
    const slotStart = 15 * 60 + 30
    const slotEnd = slotStart + 60

    const result = filterSlotProfIds(slotProfId, time, dateKey, dayOfWeek, slotStart, slotEnd)

    expect(result).toBe('5')
  })

  it('deve filtrar o ID 15 durante o almoço (14:00 às 15:00) mas manter a Esteticista (ID 16) se compartilharem o horário', () => {
    const slotProfId = '15,16'
    const time = '14:30:00'
    const dateKey = '2026-07-30' // Quinta-feira (dia permitido para ID 16)
    const dayOfWeek = 4
    const slotStart = 14 * 60 + 30 // 870 min (dentro do almoço)
    const slotEnd = slotStart + 60

    const result = filterSlotProfIds(slotProfId, time, dateKey, dayOfWeek, slotStart, slotEnd)

    // O ID 15 é removido pelo almoço, mas a Esteticista ID 16 permanece
    expect(result).toBe('16')
  })
})
