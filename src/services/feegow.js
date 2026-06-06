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
  
  if (!res.ok) {
    let errorMsg = `Erro na conexão HTTP: ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData && typeof errorData === 'object') {
        const detailParts = [];
        for (const [key, messages] of Object.entries(errorData)) {
          if (Array.isArray(messages)) {
            detailParts.push(`${key}: ${messages.join(', ')}`);
          } else if (typeof messages === 'string') {
            detailParts.push(`${key}: ${messages}`);
          }
        }
        if (detailParts.length > 0) {
          errorMsg = `Feegow diz: ${detailParts.join(' | ')}`;
        } else if (errorData.error || errorData.message) {
          errorMsg = `Feegow diz: ${errorData.error || errorData.message}`;
        }
      }
    } catch (_) {
      // Ignora erro de JSON e mantém o HTTP status original
    }
    throw new Error(errorMsg);
  }

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

export async function fetchAppointments(dateStart, dateEnd = dateStart, paciente_id = null) {
  const query = { data_start: dateStart, data_end: dateEnd }
  if (paciente_id) {
    query.paciente_id = String(paciente_id)
  }
  const params = new URLSearchParams(query)
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

export async function searchPatient({ cpf, telefone }) {
  const params = new URLSearchParams()
  params.set('limit', '50')
  params.set('offset', '0')
  const cleanCpf = cpf ? cpf.replace(/\D/g, '') : ''
  let cleanTelefone = telefone ? telefone.replace(/\D/g, '') : ''

  // Normaliza telefone caso inicie com +55 (12 ou 13 dígitos numéricos)
  if (cleanTelefone.startsWith('55') && (cleanTelefone.length === 12 || cleanTelefone.length === 13)) {
    cleanTelefone = cleanTelefone.substring(2)
  }

  if (cleanCpf.length > 0) {
    params.set('cpf', cleanCpf)
  } else if (cleanTelefone.length > 0) {
    params.set('telefone', cleanTelefone)
  } else {
    return null
  }

  const data = await request(`/patient/list?${params}`)
  const list = data.content || []
  if (list.length > 0 && list[0].patient_id) {
    return {
      patient_id: list[0].patient_id,
      nome: list[0].nome || ''
    }
  }
  return null
}

export async function createPatient({ nome_completo, celular, cpf, email, nascimento, origem_id = 20 }) {
  const payload = {
    nome_completo,
    celular1: celular.replace(/\D/g, ''),
    origem_id: Number(origem_id),
    email,
    nascimento
  }
  // Mantém o tratamento de CPF limpo e sem_cpf
  const cleanCpf = cpf ? cpf.replace(/\D/g, '') : ''
  if (cleanCpf.length > 0) {
    payload.cpf = cleanCpf
  } else {
    payload.sem_cpf = true
  }
  // Faz a chamada de request
  const data = await request('/patient/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.content?.paciente_id || null
}

export async function createAppointment({ local_id, paciente_id, procedimento_id, data, horario, notas, profissional_id = 15 }) {
  const payload = {
    local_id: Number(local_id),
    paciente_id: Number(paciente_id),
    profissional_id: Number(profissional_id),
    especialidade_id: 246,
    procedimento_id: Number(procedimento_id),
    data, // Formato dd-mm-YYYY
    horario, // Formato HH:MM:SS
    plano: 0,
    convenio_id: 0,
    valor: 0,
    notas: notas || 'Agendamento realizado via link online de pacientes.',
  }

  return request('/appoints/new-appoint', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchAvailableSchedule({ procedimento_id, data_start, data_end, profissional_id = '15' }) {
  const params = new URLSearchParams({
    tipo: 'P',
    procedimento_id: String(procedimento_id),
    profissional_id: String(profissional_id),
    data_start,
    data_end,
  })

  const data = await request(`/appoints/available-schedule?${params}`)
  return data.content || {}
}

