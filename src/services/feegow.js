const BASE = '/api'

// In dev mode, the Vite proxy forwards /api/* to Feegow.
// In production (Vercel), the serverless function at api/[...slug].js handles the proxy.
// The token is injected server-side in production, so headers are only needed in dev.
const TOKEN = import.meta.env.VITE_FEEGOW_TOKEN ?? ''

function getHeaders() {
  const h = { 'Content-Type': 'application/json' }
  // Only send token from client in dev (in production, the serverless function adds it)
  if (TOKEN) {
    h['x-access-token'] = TOKEN
  }
  return h
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: getHeaders(), ...options })
  if (!res.ok) throw new Error(`Feegow API error: ${res.status}`)
  return res.json()
}

export async function fetchPatient(paciente_id) {
  const data = await request(`/patient/search?paciente_id=${paciente_id}`)
  return data.content ?? null
}

export async function fetchAppointments(dateStart, dateEnd = dateStart) {
  // date format: DD-MM-YYYY
  const params = new URLSearchParams({ data_start: dateStart, data_end: dateEnd })
  const data = await request(`/appoints/search?${params}`)
  const rawAppointments = data.content ?? data ?? []

  // Filter out canceled or deleted appointments (11: Desmarcado pelo paciente, 12: Cancelado pela clínica, etc)
  const appointments = rawAppointments.filter(
    (a) => ![11, 12, 13, 14, 21].includes(a.status_id)
  )

  // Enrich with patient names (parallel fetches per unique paciente_id)
  const uniqueIds = [...new Set(appointments.map((a) => a.paciente_id).filter(Boolean))]
  const patientMap = {}
  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const patient = await fetchPatient(id)
        if (patient?.nome) patientMap[id] = patient.nome
      } catch {
        // leave as fallback
      }
    })
  )

  return appointments.map((a) => ({
    ...a,
    paciente_nome: patientMap[a.paciente_id] ?? `Paciente #${a.paciente_id}`,
  }))
}

export async function fetchProfessionals() {
  const data = await request('/professional/list?ativo=1')
  return data.content ?? data ?? []
}

export async function fetchProcedures() {
  const data = await request('/procedures/list')
  return data.content ?? data ?? []
}

export async function updateAppointmentStatus({ agendamento_id, status_id, obs }) {
  return request('/appoints/statusUpdate', {
    method: 'POST',
    body: JSON.stringify({ AgendamentoID: agendamento_id, StatusID: String(status_id), ...(obs ? { Obs: obs } : {}) }),
  })
}
