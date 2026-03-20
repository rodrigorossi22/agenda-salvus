const BASE = '/api'
const TOKEN = import.meta.env.VITE_FEEGOW_TOKEN ?? ''

const headers = {
  'x-access-token': TOKEN,
  'Content-Type': 'application/json',
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { headers, ...options })
  if (!res.ok) throw new Error(`Feegow API error: ${res.status}`)
  return res.json()
}

export async function fetchAppointments(date) {
  // date format: DD-MM-YYYY
  const params = new URLSearchParams({ data_start: date, data_end: date })
  const data = await request(`/appoints/search?${params}`)
  return data.content ?? data ?? []
}

export async function fetchProfessionals() {
  const data = await request('/professional/list?ativo=1')
  return data.content ?? data ?? []
}

export async function updateAppointmentStatus({ agendamento_id, status_id, obs }) {
  return request('/appoints/statusUpdate', {
    method: 'POST',
    body: JSON.stringify({ agendamento_id, status_id, ...(obs ? { obs } : {}) }),
  })
}
