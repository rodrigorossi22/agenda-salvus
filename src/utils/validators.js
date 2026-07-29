import { z } from 'zod';

export function isValidCPF(cpfStr) {
  if (!cpfStr) return false;
  const cleanCPF = String(cpfStr).replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleanCPF.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9), 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleanCPF.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10), 10)) return false;
  return true;
}

export function isValidBRPhone(phoneStr) {
  if (!phoneStr) return false;
  let target = String(phoneStr).replace(/\D/g, '');
  if (target.startsWith('55') && (target.length === 12 || target.length === 13)) target = target.substring(2);
  if (target.length !== 10 && target.length !== 11) return false;
  const ddd = parseInt(target.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (target.length === 11 && target.charAt(2) !== '9') return false;
  return true;
}

export function isValidBRFullName(nameStr) {
  if (!nameStr) return false;
  const parts = String(nameStr).trim().split(/\s+/);
  return parts.length >= 2 && parts.every(p => p.length >= 2);
}

export function isValidBRBirthDate(dateStr) {
  if (!dateStr) return false;
  let day, month, year;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/').map(Number);
    day = d; month = m; year = y;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    day = d; month = m; year = y;
  } else return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dateObj = new Date(year, month - 1, day);
  if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) return false;
  const now = new Date();
  if (dateObj > now || now.getFullYear() - year > 120) return false;
  return true;
}

export const cpfSchema = z.string().transform(v => v.replace(/\D/g, '')).refine(isValidCPF, { message: 'CPF inválido.' });
export const phoneSchema = z.string().transform(v => v.replace(/\D/g, '')).refine(isValidBRPhone, { message: 'Celular inválido.' });
export const fullNameSchema = z.string().trim().refine(isValidBRFullName, { message: 'Informe nome e sobrenome.' });
export const birthDateSchema = z.string().trim().refine(isValidBRBirthDate, { message: 'Data de nascimento inválida.' });
export const emailSchema = z.string().trim().toLowerCase().email({ message: 'E-mail em formato inválido.' });

export const patientFormSchema = z.object({
  name: fullNameSchema,
  cpf: cpfSchema,
  birthDate: birthDateSchema,
  email: emailSchema,
  phone: phoneSchema,
});
