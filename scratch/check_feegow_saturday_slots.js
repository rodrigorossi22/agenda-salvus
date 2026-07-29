import { fetchAvailableSchedule } from '../src/services/feegow.js';

async function checkSaturdays() {
  console.log("=== VERIFICANDO HORÁRIOS DA FEEGOW PARA OS SÁBADOS DE AGOSTO ===");
  const profs = ['15', '16', '5'];
  const procs = [338, 149, 347, 354, 345, 346, 335];

  for (const profId of profs) {
    for (const procId of procs) {
      try {
        const res = await fetchAvailableSchedule({
          procedimento_id: procId,
          profissional_id: profId,
          data_start: '01-08-2026',
          data_end: '31-08-2026'
        });
        
        const localMap = res?.profissional_id?.[profId]?.local_id || {};
        for (const localId of Object.keys(localMap)) {
          const dateMap = localMap[localId] || {};
          for (const dateKey of Object.keys(dateMap)) {
            if (dateKey.includes('2026-08-01') || dateKey.includes('2026-08-08') || dateKey.includes('2026-08-15') || dateKey.includes('2026-08-22')) {
              console.log(`Prof ${profId} | Proc ${procId} | Local ${localId} | Data ${dateKey}:`, dateMap[dateKey]);
            }
          }
        }
      } catch (err) {
        console.error(`Erro prof ${profId} proc ${procId}:`, err.message);
      }
    }
  }
}

checkSaturdays();
