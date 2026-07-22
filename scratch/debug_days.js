const https = require('https');

const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJmZWVnb3ciLCJhdWQiOiJwdWJsaWNhcGkiLCJpYXQiOjE3NzgxMTMwNDIsImxpY2Vuc2VJRCI6NDIyOTZ9.Xo-VHQhEtAntr4ORlEtVa6zgSX4gbYNQ8neI-0Ksh4w';
const BASE_URL = 'api.feegow.com';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: '/v1/api' + path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': TOKEN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    req.end();
  });
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${d}-${m}-${y}`;
}

async function run() {
  try {
    const today = new Date();
    // Check next 30 days
    for (let i = 0; i < 30; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      const dateKey = formatDateKey(targetDate);
      const dateStr = formatDateStr(targetDate);
      const dayOfWeek = targetDate.getDay();
      const isRestrictedDay = (dayOfWeek === 2 || dayOfWeek === 4);

      const apptsRes = await makeRequest(`/appoints/search?data_start=${dateStr}&data_end=${dateStr}`);
      const appts = apptsRes.content || apptsRes || [];
      const monicaAppts = appts.filter(a => String(a.profissional_id) === '15' && ![11, 12, 13, 14, 21].includes(a.status_id));

      const scheduleRes = await makeRequest(`/appoints/available-schedule?tipo=P&procedimento_id=338&profissional_id=15&data_start=${dateStr}&data_end=${dateStr}`);
      const slots = scheduleRes.content?.profissional_id?.['15']?.local_id?.['2']?.[dateKey] || [];

      if (slots.length === 0) {
        continue;
      }

      console.log(`\n============================================================`);
      console.log(`DATE: ${dateStr} (${targetDate.toLocaleDateString('pt-BR', { weekday: 'long' })}) - Restricted: ${isRestrictedDay}`);
      console.log(`Monica Active Appts: ${monicaAppts.length}`);
      console.log(`Total slots returned: ${slots.length}`);
      console.log(`Raw Slots after 18h:`, slots.filter(s => s >= '18:00:00'));

      // Run collision & snapping
      const durationMinutes = 60;
      const validSlots = slots.filter(time => {
        const slotStart = timeToMinutes(time);
        const slotEnd = slotStart + durationMinutes;

        const CLINIC_END_TIME = 20 * 60 + 30; // 20:30
        if (slotEnd > CLINIC_END_TIME) return false;

        const hasCollision = monicaAppts.some(appt => {
          const apptStart = timeToMinutes(appt.horario);
          const apptDuration = Number(appt.duracao) || 60;
          const apptEnd = apptStart + apptDuration;
          return slotStart < apptEnd && slotEnd > apptStart;
        });

        return !hasCollision;
      });

      const snappedSlots = [];
      let nextAvailableTime = 0;
      validSlots.forEach(time => {
        const slotStart = timeToMinutes(time);
        if (slotStart >= nextAvailableTime) {
          snappedSlots.push(time);
          nextAvailableTime = slotStart + durationMinutes;
        }
      });

      // Split into morning, afternoon, evening
      const morning = [];
      const afternoon = [];
      const evening = [];

      const eveningAppointmentsCount = monicaAppts.filter(appt => {
        return timeToMinutes(appt.horario) >= timeToMinutes('18:00:00');
      }).length;

      snappedSlots.forEach(time => {
        if (time < '12:00:00') {
          morning.push(time);
        } else if (time >= '12:00:00' && time < '18:00:00') {
          afternoon.push(time);
        } else {
          if (isRestrictedDay) {
            if (eveningAppointmentsCount >= 1) {
              // Blocked
            } else if (evening.length < 1) {
              evening.push(time);
            }
          } else {
            evening.push(time);
          }
        }
      });

      console.log(`Morning:`, morning.slice(0, 3));
      console.log(`Afternoon:`, afternoon.slice(0, 3));
      console.log(`Evening:`, evening.slice(0, 3));
    }
  } catch (err) {
    console.error(err);
  }
}

run();
