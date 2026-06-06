const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJmZWVnb3ciLCJhdWQiOiJwdWJsaWNhcGkiLCJpYXQiOjE3NzgxMTMwNDIsImxpY2Vuc2VJRCI6NDIyOTZ9.Xo-VHQhEtAntr4ORlEtVa6zgSX4gbYNQ8neI-0Ksh4w';
const BASE_URL = 'https://api.feegow.com/v1/api';

async function request(path) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-access-token': TOKEN
  };

  const res = await fetch(url, { headers });
  console.log(`[HTTP] GET ${path} - Status: ${res.status}`);
  return res.json();
}

async function run() {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + 45); // Buscar próximos 45 dias

  const todayStr = today.toISOString().split('T')[0].split('-').reverse().join('-');
  const futureStr = future.toISOString().split('T')[0].split('-').reverse().join('-');

  console.log(`Buscando agenda de Raquel Nina (ID 16) para Head Spa (ID 348) de ${todayStr} até ${futureStr}...`);
  
  try {
    const data = await request(`/appoints/available-schedule?tipo=P&procedimento_id=348&profissional_id=16&data_start=${todayStr}&data_end=${futureStr}`);
    
    const content = data.content || {};
    // Estrutura esperada: content.profissional_id['16'].local_id['localId'][dateKey] = [slots]
    const profData = content.profissional_id?.['16'] || {};
    const localIdMap = profData.local_id || {};
    
    const locals = Object.keys(localIdMap);
    console.log(`Locais encontrados na agenda:`, locals);
    
    if (locals.length === 0) {
      console.log('Nenhum local ativo ou horários retornados para Raquel Nina no período.');
      console.log('Resposta bruta do Feegow:', JSON.stringify(content, null, 2));
      return;
    }

    let totalSlots = 0;
    for (const localId of locals) {
      const datesMap = localIdMap[localId] || {};
      const dates = Object.keys(datesMap);
      console.log(`\nLocal ID: ${localId} - Datas com horários disponíveis (${dates.length} dias):`);
      
      for (const date of dates) {
        const slots = datesMap[date] || [];
        totalSlots += slots.length;
        console.log(` - Data ${date}: ${slots.length} slots ->`, slots);
      }
    }
    
    console.log(`\nTotal de slots brutos encontrados: ${totalSlots}`);
  } catch (err) {
    console.error('Erro ao consultar agenda de Raquel:', err.message);
  }
}

run();
