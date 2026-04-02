const BASE = '/api'

const TOKEN = import.meta.env.VITE_FEEGOW_TOKEN ?? ''

function getHeaders() {
  const h = { 'Content-Type': 'application/json' }
  if (TOKEN) {
    h['x-access-token'] = TOKEN
  }
  return h
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: getHeaders(), ...options })
  if (!res.ok) throw new Error(`Erro na conexão HTTP: ${res.status}`)

  const data = await res.json()

  // Deteta o erro silencioso da Feegow
  if (data && data.success === false) {
    const errorMessage = data.error || data.message || data.content?.msg || 'Rejeitado por regra de negócio da Feegow';
    throw new Error(`Feegow diz: ${errorMessage}`);
  }

  return data
}

export async function fetchPatient(paciente_id) {
  const data = await request(`/patient/search?paciente_id=${paciente_id}`)
  return data.content ?? null
}

export async function fetchAppointments(dateStart, dateEnd = dateStart) {
  const params = new URLSearchParams({ data_start: dateStart, data_end: dateEnd })
  const data = await request(`/appoints/search?${params}`)
  const rawAppointments = data.content ?? data ?? []

  const appointments = rawAppointments.filter(
    (a) => ![11, 12, 13, 14, 21].includes(a.status_id)
  )

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
  const payload = {
    AgendamentoID: String(agendamento_id),
    StatusID: String(status_id),
    Obs: obs || '',
  }
  console.log('[Feegow] Sending statusUpdate payload:', payload)
  return request('/appoints/statusUpdate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Creates a Medical Report (Laudo) attached to an appointment.
 * @param {Object} data
 * @param {number|string} data.agendamento_id 
 * @param {string} data.laudo_base64 
 */
export async function createMedicalReport({ agendamento_id, laudo_base64 }) {
  const payload = {
    agendamento_id: Number(agendamento_id),
    laudo_base64
  };

  console.log(`[Feegow] Uploading PDF Laudo for appointment ${agendamento_id}...`);
  return request('/medical-reports/create', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
