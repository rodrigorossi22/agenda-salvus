import { useState, useCallback } from 'react';
import { searchPatient } from '../services/feegow.js';

export function usePatientSearch(patientLimits) {
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [foundPatientName, setFoundPatientName] = useState('');
  const [foundPatientId, setFoundPatientId] = useState(null);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);

  const handlePhoneChange = useCallback((valOrEvent) => {
    const value = (valOrEvent && typeof valOrEvent === 'object' && valOrEvent.target)
      ? valOrEvent.target.value
      : valOrEvent;
    setPhone(value);
    if (foundPatientId) {
      setFoundPatientId(null);
      setFoundPatientName('');
      setSearchFailed(false);
    }
  }, [foundPatientId]);

  const handleSearchPatient = useCallback(async () => {
    if (!phone && !cpf) return null;
    setSearchingPatient(true);
    setSearchFailed(false);
    try {
      const result = await searchPatient({ cpf, telefone: phone });
      if (result && result.patient_id) {
        setFoundPatientId(result.patient_id);
        setFoundPatientName(result.nome || '');

        if (patientLimits) {
          patientLimits.loadPatientAppointmentsHistory(result.patient_id);
          patientLimits.loadPatientActiveAppointments(result.patient_id);
        }
        return result;
      } else {
        setSearchFailed(true);
        return null;
      }
    } catch (err) {
      console.error('Erro ao buscar paciente:', err);
      setSearchFailed(true);
      return null;
    } finally {
      setSearchingPatient(false);
    }
  }, [cpf, phone, patientLimits]);

  return {
    phone,
    setPhone,
    cpf,
    setCpf,
    foundPatientName,
    foundPatientId,
    searchingPatient,
    searchFailed,
    handlePhoneChange,
    handleSearchPatient,
    setFoundPatientId,
    setFoundPatientName,
  };
}
