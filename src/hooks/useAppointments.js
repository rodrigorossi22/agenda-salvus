import { useState, useEffect } from 'react';
import { fetchAppointments } from '../services/feegow';

export function useAppointments(dateStart, dateEnd = dateStart) {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function loadAppointments() {
            if (!dateStart) return;

            try {
                setLoading(true);
                const data = await fetchAppointments(dateStart, dateEnd);
                if (isMounted) {
                    setAppointments(data);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadAppointments();

        return () => {
            isMounted = false;
        };
    }, [dateStart, dateEnd]);

    // Função para forçar o recarregamento (ex: após salvar evolução)
    const refetch = async () => {
        if (!dateStart) return;
        try {
            setLoading(true);
            const data = await fetchAppointments(dateStart, dateEnd);
            setAppointments(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
        } finally {
            setLoading(false);
        }
    };

    return { appointments, loading, error, refetch };
}
