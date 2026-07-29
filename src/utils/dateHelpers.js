/**
 * Converte string de hora ("HH:mm" ou "HH:mm:ss") em minutos desde a meia-noite.
 * @param {string} timeStr 
 * @returns {number}
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * Normaliza string para comparacoes case-insensitive / sem acentos
 * @param {string} str 
 * @returns {string}
 */
export function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
