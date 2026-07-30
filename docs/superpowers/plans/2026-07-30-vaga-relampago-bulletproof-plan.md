# Plan: Bulletproof Waitlist & Flash Vacancy n8n Workflow Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a bulletproof n8n workflow for `Salvus - Monitor Fila de Espera` that verifies Feegow patient monthly check-in quotas (blocking patients with 2 attended sessions), enforces 60-min slot collision and Monica's 14h-15h lunch lock, and enables automatic cancellation of the farthest future appointment upon accepting a flash slot.

**Architecture:** Update `FormatMessage` code node in n8n workflow `7dmgCpBSpOsdhrv3` to perform pre-flight patient checks via Feegow API, and update `/agendamento-online-confirmacao` webhook workflow `71hS1zjwEnjyIQty` to perform auto-swapping of farthest appointments.

**Tech Stack:** n8n Workflows, Feegow REST API, PostgreSQL, Node.js HTTP Requests.

---

### Task 1: Update `FormatMessage` Node Code in Workflow `7dmgCpBSpOsdhrv3`

**Files:**
- Modify: n8n workflow `7dmgCpBSpOsdhrv3` (`Salvus - Monitor Fila de Espera (Vaga Relâmpago)`)

- [ ] **Step 1: Write updated JS code for FormatMessage with Pre-Flight Patient Check & Slot Collision Protection**

```javascript
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJmZWVnb3ciLCJhdWQiOiJwdWJsaWNhcGkiLCJpYXQiOjE3NzgxMTMwNDIsImxpY2Vuc2VJRCI6NDIyOTZ9.Xo-VHQhEtAntr4ORlEtVa6zgSX4gbYNQ8neI-0Ksh4w';

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

const items = $input.all();
if (!items || items.length === 0) return [];

const results = [];
const processedDatesTurnos = new Set();

for (const item of items) {
  const data = item.json;
  let rawDateStr = '';
  
  if (data.data_desejada) {
    if (typeof data.data_desejada === 'string') {
      rawDateStr = data.data_desejada.substring(0, 10);
    } else if (data.data_desejada instanceof Date) {
      rawDateStr = data.data_desejada.toISOString().substring(0, 10);
    } else {
      rawDateStr = String(data.data_desejada).substring(0, 10);
    }
  }

  if (!rawDateStr || !rawDateStr.includes('-')) continue;

  const [year, month, day] = rawDateStr.split('-');
  const feegowDateStr = `${day}-${month}-${year}`;
  const urlDateStr = `${day}-${month}-${year}`;
  const displayDateStr = `${day}/${month}/${year}`;
  const turno = String(data.turno || 'qualquer').toLowerCase();

  const dedupeKey = `${feegowDateStr}_${turno}`;
  if (processedDatesTurnos.has(dedupeKey)) continue;

  let cleanPhone = String(data.telefone || '').replace(/\D/g, '');
  if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;

  // -------------------------------------------------------------
  // PRE-FLIGHT CHECK 1: VERIFICAR HISTÓRICO DO PACIENTE NO FEEGOW
  // -------------------------------------------------------------
  try {
    const searchRes = await $helpers.httpRequest({
      method: 'GET',
      url: `https://api.feegow.com/v1/api/patients/search?telefone=${cleanPhone.replace(/^55/, '')}`,
      headers: { 'Content-Type': 'application/json', 'x-access-token': TOKEN },
      json: true
    });

    const patientId = searchRes?.content?.[0]?.id || searchRes?.content?.patient_id;

    if (patientId) {
      const monthStart = `01-${month}-${year}`;
      const monthEnd = `31-${month}-${year}`;
      
      const apptsRes = await $helpers.httpRequest({
        method: 'GET',
        url: `https://api.feegow.com/v1/api/appoints/list?paciente_id=${patientId}&data_start=${monthStart}&data_end=${monthEnd}`,
        headers: { 'Content-Type': 'application/json', 'x-access-token': TOKEN },
        json: true
      });

      const patientAppts = apptsRes?.content || [];

      // 1a. Conta atendimentos REALIZADOS (status_id = 3 / Concluído)
      const attendedCount = patientAppts.filter(a => Number(a.status_id) === 3).length;
      if (attendedCount >= 2) {
        console.log(`Paciente ${data.nome} já realizou 2 atendimentos em ${month}/${year}. Disparo bloqueado.`);
        continue; // BLOQUEIA DISPARO!
      }

      // 1b. Checa limite semanal (máximo 1 agendamento na mesma semana da vaga)
      const targetDateObj = new Date(Number(year), Number(month) - 1, Number(day));
      const targetDayOfWeek = targetDateObj.getDay();
      const mondayOffset = (targetDayOfWeek + 6) % 7;
      const weekStartObj = new Date(targetDateObj);
      weekStartObj.setDate(targetDateObj.getDate() - mondayOffset);
      const weekEndObj = new Date(weekStartObj);
      weekEndObj.setDate(weekStartObj.getDate() + 6);

      const hasApptThisWeek = patientAppts.some(a => {
        if ([11, 12, 14].includes(Number(a.status_id))) return false;
        if (!a.data || typeof a.data !== 'string' || !a.data.includes('-')) return false;
        const [ad, am, ay] = a.data.split('-').map(Number);
        const aDate = new Date(ay, am - 1, ad);
        return aDate >= weekStartObj && aDate <= weekEndObj;
      });

      if (hasApptThisWeek) {
        console.log(`Paciente ${data.nome} já possui agendamento na mesma semana de ${displayDateStr}. Disparo bloqueado.`);
        continue; // BLOQUEIA DISPARO!
      }
    }
  } catch (err) {
    console.warn(`Aviso ao consultar histórico Feegow do paciente ${data.nome}:`, err);
  }

  // -------------------------------------------------------------
  // PRE-FLIGHT CHECK 2: CONSULTA VAGAS REALMENTE LIVRES NO FEEGOW
  // -------------------------------------------------------------
  let openSlots = [];
  let existingAppts = [];

  try {
    const listRes = await $helpers.httpRequest({
      method: 'GET',
      url: `https://api.feegow.com/v1/api/appoints/list?data_start=${feegowDateStr}&data_end=${feegowDateStr}`,
      headers: { 'Content-Type': 'application/json', 'x-access-token': TOKEN },
      json: true
    });
    existingAppts = listRes?.content || [];
  } catch (e) {
    console.error('Erro ao buscar lista de consultas do dia:', e);
  }

  for (const profId of [16, 15]) {
    for (const procId of [338, 339]) {
      try {
        const url = `https://api.feegow.com/v1/api/appoints/available-schedule?tipo=P&procedimento_id=${procId}&profissional_id=${profId}&data_start=${feegowDateStr}&data_end=${feegowDateStr}`;
        const response = await $helpers.httpRequest({
          method: 'GET',
          url: url,
          headers: { 'Content-Type': 'application/json', 'x-access-token': TOKEN },
          json: true
        });

        const localMap = response?.content?.profissional_id?.[String(profId)]?.local_id || {};
        for (const localId of Object.keys(localMap)) {
          const times = localMap[localId]?.[`${year}-${month}-${day}`] || [];
          times.forEach(t => openSlots.push({ time: t, profId: String(profId) }));
        }
      } catch (err) {
        console.error(`Erro ao consultar Feegow (prof ${profId}):`, err);
      }
    }
  }

  if (openSlots.length === 0) continue;

  // Filtragem estrita dos slots válidos aplicando travas do OnlineBooking.jsx
  const validSlots = openSlots.filter(s => {
    const time = s.time;
    const profId = s.profId;
    const slotStart = timeToMinutes(time);
    const slotEnd = slotStart + 60; // 60 min

    // Expediente máx 20:30h
    if (slotEnd > (20 * 60 + 31)) return false;

    // Trava de Almoço Dra. Mônica (15): 14:00 às 15:00
    if (profId === '15') {
      const LUNCH_START = 14 * 60; // 14:00
      const LUNCH_END = 15 * 60;   // 15:00
      if ((slotStart < LUNCH_START && slotEnd > LUNCH_START) || (slotStart >= LUNCH_START && slotStart < LUNCH_END)) {
        return false;
      }
    }

    // Colisão de 60 minutos com pacientes agendados no dia
    const hasCollision = existingAppts.some(appt => {
      if (String(appt.profissional_id) !== profId) return false;
      if ([11, 12, 14].includes(Number(appt.status_id))) return false;
      const apptStart = timeToMinutes(appt.horario);
      const apptDur = Number(appt.duracao) || 60;
      const apptEnd = apptStart + apptDur;
      return slotStart < apptEnd && slotEnd > apptStart;
    });

    if (hasCollision) return false;

    return true;
  });

  if (validSlots.length === 0) continue;

  const timesSorted = validSlots.map(s => s.time).sort();

  const matchingSlot = timesSorted.find(timeStr => {
    const hour = parseInt(timeStr.substring(0, 2), 10);
    if (turno === 'manha') return hour >= 8 && hour < 12;
    if (turno === 'tarde') return hour >= 12 && hour < 18;
    if (turno === 'noite') return hour >= 18 && hour <= 21;
    return hour >= 8 && hour <= 21;
  });

  if (!matchingSlot) continue;

  const slotTimeShort = matchingSlot.substring(0, 5);
  const firstName = String(data.nome || '').trim().split(' ')[0] || 'Cliente';

  const messageText = `Olá, ${firstName}!\n\n⚡ *Vaga Relâmpago Aberta!*\n\nVagou um horário na agenda da Clínica Salvus!\n\n🗓️ Data: *${displayDateStr}*\n⏰ Horário: *${slotTimeShort}h*\n📍 Endereço: Av. Bernardino de Campos, 327 - Sala 13, Paraíso\n\nComo temos outros pacientes na lista de espera, este horário será garantido para o primeiro que confirmar.\n\n👉 Para escolher o seu procedimento Gympass e garantir sua vaga agora, clique no link abaixo:\nhttps://agenda-salvus.vercel.app/agendamento_online?date=${urlDateStr}&time=${slotTimeShort}\n\nClínica Salvus | Medicina, Performance & Estética`;

  results.push({
    json: {
      id: data.id,
      number: cleanPhone,
      text: messageText,
      vaga_horario: slotTimeShort
    }
  });

  processedDatesTurnos.add(dedupeKey);
}

return results;
```

- [ ] **Step 2: Update n8n workflow 7dmgCpBSpOsdhrv3**

Call `n8n_update_full_workflow` with the updated JSON structure.

---

### Task 2: Update Confirmations Webhook (`71hS1zjwEnjyIQty`) to Auto-Cancel Farthest Appointment

**Files:**
- Modify: n8n workflow `71hS1zjwEnjyIQty` (`Salvus - Notificação Agendamento Online`)

- [ ] **Step 1: Add Auto-Swap Logic Node in 71hS1zjwEnjyIQty**

When a patient confirms a booking:
1. Fetch patient's active appointments for the month.
2. If total active future appointments > 2:
   - Identify the appointment with the latest date/time in the month.
   - Cancel it via Feegow API `POST /appoints/status-update` (`status_id = 11`).

- [ ] **Step 2: Update n8n workflow 71hS1zjwEnjyIQty**

Call `n8n_update_full_workflow` with the updated JSON structure.
