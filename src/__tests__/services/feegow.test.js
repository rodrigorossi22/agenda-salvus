import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAppointments, fetchProfessionals, updateAppointmentStatus } from '../../services/feegow'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => mockFetch.mockClear())

describe('fetchAppointments', () => {
  it('calls correct endpoint with date params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [] }),
    })
    await fetchAppointments('20-03-2026')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/appoints/search'),
      expect.objectContaining({ headers: expect.objectContaining({ 'x-access-token': expect.any(String) }) })
    )
  })

  it('returns array of appointments', async () => {
    const appt = { agendamento_id: 1, horario: '09:00:00', paciente_id: 5 }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ content: [appt] }) })
    const result = await fetchAppointments('20-03-2026')
    expect(result).toEqual([{ ...appt, paciente_nome: "Paciente #5" }])
  })
})

describe('fetchProfessionals', () => {
  it('returns array of professionals', async () => {
    const prof = { profissional_id: 10, nome: 'Dra. Ana Lima' }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ content: [prof] }) })
    const result = await fetchProfessionals()
    expect(result).toEqual([prof])
  })
})

describe('updateAppointmentStatus', () => {
  it('POSTs agendamento_id and status_id', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await updateAppointmentStatus({ agendamento_id: 1, status_id: 2, obs: 'Evolução' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/appoints/statusUpdate'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"agendamento_id":1'),
      })
    )
  })
})
