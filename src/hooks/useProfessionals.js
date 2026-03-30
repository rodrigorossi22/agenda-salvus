import { useState, useEffect } from 'react';
import { fetchProfessionals } from '../services/feegow';

export function useProfessionals() {
    const [professionals, setProfessionals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function loadProfessionals() {
            try {
                setLoading(true);
                const data = await fetchProfessionals();
                if (isMounted) {
                    setProfessionals(data);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch professionals');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadProfessionals();

        return () => {
            isMounted = false;
        };
    }, []);

    return { professionals, loading, error };
}
