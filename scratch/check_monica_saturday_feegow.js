import { fetchAvailableSchedule } from '../src/services/feegow.js';

async function testMonicaSaturdays() {
  console.log("=== BUSCANDO HORÁRIOS DA MÔNICA (ID 15) NA FEEGOW NOS SÁBADOS DE AGOSTO ===");
  const procs = [338, 149, 347, 354, 345, 346, 335];

  for (const procId of procs) {
    try {
      const res = await fetchAvailableSchedule({
        procedimento_id: procId,
        profissional_id: '15',
        data_start: '01-08-2026',
        data_end: '31-08-2026'
      });
      
      const localMap = res?.profissional_id?.['15']?.local_id || {};
      for (const localId of Object.keys(localMap)) {
        const dateMap = localMap[localId] || {};
        for (const dateKey of Object.keys(dateMap)) {
          if (dateKey.includes('2026-08-01') || dateKey.includes('2026-08-08') || dateKey.includes('2026-08-15') || dateKey.includes('2026-08-22') || dateKey.includes('2026-08-29')) {
            console.log(`✅ ENCONTRADO! ProcID: ${procId} | Data: ${dateKey} | Horários:`, dateMap[dateKey]);
          }
        }
      }
    } catch (err) {
      console.error(`Erro Proc ${procId}:`, err.message);
    }
  }
}

testMonicaSaturdays();
