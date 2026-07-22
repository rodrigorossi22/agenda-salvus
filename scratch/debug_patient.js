import { searchPatient, fetchAppointments } from '../src/services/feegow.js'

async function debug() {
  try {
    const res = await searchPatient({ telefone: '11957789237' })
    if (!res) {
      console.log('Paciente não encontrado.')
      return
    }
    console.log('Patient Found:', res)

    // Vamos buscar os appointments ignorando a flag de cancelados nativa da API se pudermos,
    // mas por hora a fetchAppointments filtra. Vamos usar um raw request.
    const { request } = await import('../src/services/feegow.js');
    
    // Nao da pra exportar o raw request assim, farei copy paste do token e do baseUrl pra testar rapido.
  } catch (err) {
    console.error(err)
  }
}

// debug()
