import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  fetchAppointments, 
  fetchProfessionals, 
  updateAppointmentStatus,
  searchPatient,
  createPatient,
  createAppointment,
  fetchAvailableSchedule
} from '../../services/feegow'

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
  it('POSTs AgendamentoID, StatusID, and Obs', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await updateAppointmentStatus({ agendamento_id: 1, status_id: 2, obs: 'Evolução' })

    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)

    expect(options.method).toBe('POST')
    expect(body.AgendamentoID).toBe('1')
    expect(body.StatusID).toBe('2')
    expect(body.Obs).toBe('Evolução')
  })

  it('sends Obs as empty string when obs is falsy', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await updateAppointmentStatus({ agendamento_id: 1, status_id: 3 })

    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)

    expect(body).toHaveProperty('Obs')
    expect(body.Obs).toBe('')
  })
})

describe('searchPatient', () => {
  it('calls GET /patient/list with cpf and returns patient_id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ patient_id: 12345 }], success: true }),
    })
    const result = await searchPatient({ cpf: '11122233344', telefone: '21988888888' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/patient/list?limit=50&offset=0&cpf=11122233344'),
      expect.any(Object)
    )
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('telefone='), expect.any(Object))
    expect(result).toBe(12345)
  })

  it('calls GET /patient/list with phone if CPF is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ patient_id: 54321 }], success: true }),
    })
    const result = await searchPatient({ cpf: '', telefone: '21988888888' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/patient/list?limit=50&offset=0&telefone=21988888888'),
      expect.any(Object)
    )
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('cpf='), expect.any(Object))
    expect(result).toBe(54321)
  })

  it('returns null if no patient found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [], success: true }),
    })
    const result = await searchPatient({ telefone: '21988888888' })
    expect(result).toBeNull()
  })
})

describe('createPatient', () => {
  it('POSTs patient data and returns paciente_id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: { paciente_id: 6789 }, success: true }),
    })
    const result = await createPatient({
      nome_completo: 'Maria Souza',
      celular: '21977777777',
      origem_id: 20
    })
    
    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)
    
    expect(options.method).toBe('POST')
    expect(body.nome_completo).toBe('Maria Souza')
    expect(body.celular1).toBe('21977777777')
    expect(body.sem_cpf).toBe(true)
    expect(body.origem_id).toBe(20)
    expect(result).toBe(6789)
  })
})

describe('createAppointment', () => {
  it('POSTs correct payload to new-appoint (checking notas key)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: { agendamento_id: 99 }, success: true }),
    })
    await createAppointment({
      local_id: 1,
      paciente_id: 12345,
      procedimento_id: 54,
      data: '03-06-2026',
      horario: '14:30:00',
      notas: 'Agendamento online de teste com a Monica.'
    })

    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)

    expect(options.method).toBe('POST')
    expect(body.profissional_id).toBe(15)
    expect(body.especialidade_id).toBe(246)
    expect(body.local_id).toBe(1)
    expect(body.paciente_id).toBe(12345)
    expect(body.procedimento_id).toBe(54)
    expect(body.data).toBe('03-06-2026')
    expect(body.horario).toBe('14:30:00')
    expect(body.plano).toBe(0)
    expect(body.notas).toBe('Agendamento online de teste com a Monica.')
  })
})

describe('fetchAvailableSchedule', () => {
  it('calls available-schedule endpoint with correct query parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: {}, success: true }),
    })
    await fetchAvailableSchedule({ procedimento_id: 54, data_start: '03-06-2026', data_end: '10-06-2026' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/appoints/available-schedule?tipo=P&procedimento_id=54&profissional_id=15&data_start=03-06-2026&data_end=10-06-2026'),
      expect.any(Object)
    )
  })
})

