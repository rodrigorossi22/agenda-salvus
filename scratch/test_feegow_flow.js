const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJmZWVnb3ciLCJhdWQiOiJwdWJsaWNhcGkiLCJpYXQiOjE3NzgxMTMwNDIsImxpY2Vuc2VJRCI6NDIyOTZ9.Xo-VHQhEtAntr4ORlEtVa6zgSX4gbYNQ8neI-0Ksh4w';
const BASE_URL = 'https://api.feegow.com/v1/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-access-token': TOKEN
  };

  const res = await fetch(url, { headers, ...options });
  console.log(`[HTTP] ${options.method || 'GET'} ${path} - Status: ${res.status}`);
  
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
    console.log(`[Response JSON]:`, JSON.stringify(data, null, 2));
  } catch (_) {
    console.log(`[Response Raw]: ${text.substring(0, 500)}`);
    throw new Error(`Non-JSON response (HTTP ${res.status})`);
  }

  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}: ${text}`);
  }

  if (data && data.success === false) {
    console.log('[Feegow Error Detail]:', JSON.stringify(data, null, 2));
    throw new Error(data.error || data.message || 'Feegow Business Error');
  }

  return data;
}

async function run() {
  const targetCpf = '04535877474';
  const patientData = {
    nome_completo: 'Patricia Cordeiro Mota',
    celular1: '11994780808',
    cpf: targetCpf,
    email: 'patmota1@hotmail.com',
    nascimento: '1984-11-23',
    origem_id: 20
  };

  try {
    console.log('--- PASSO 1: Buscar paciente por CPF ---');
    const searchRes = await request(`/patient/list?cpf=${targetCpf}&limit=50&offset=0`);
    const list = searchRes.content || [];
    console.log(`Busca retornou ${list.length} registros.`);
    
    let patientId;
    if (list.length > 0 && list[0].patient_id) {
      patientId = list[0].patient_id;
      console.log(`Paciente já existe. ID: ${patientId}, Nome: ${list[0].nome}`);
    } else {
      console.log('Paciente não encontrado. Criando novo...');
      console.log('--- PASSO 2: Criar novo paciente ---');
      const createRes = await request('/patient/create', {
        method: 'POST',
        body: JSON.stringify(patientData)
      });
      patientId = createRes.content?.paciente_id;
      console.log(`Paciente criado com sucesso! ID: ${patientId}`);
    }

    // Para evitar poluir a agenda de produção com agendamento de teste real,
    // vamos apenas simular a verificação de disponibilidade de horários.
    console.log('--- PASSO 3: Consultar agenda de testes (Deangelo - ID 1) ---');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0].split('-').reverse().join('-'); // DD-MM-YYYY
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 7);
    const futureDateStr = futureDate.toISOString().split('T')[0].split('-').reverse().join('-');

    const scheduleRes = await request(`/appoints/available-schedule?tipo=P&procedimento_id=338&profissional_id=1&data_start=${todayStr}&data_end=${futureDateStr}`);
    console.log('Agenda de teste disponível carregada com sucesso.');
    
  } catch (err) {
    console.error('Ocorreu um erro no diagnóstico:', err.message);
  }
}

run();
