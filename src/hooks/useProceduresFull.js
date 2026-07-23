import { useState, useEffect, useCallback } from 'react'
import { fetchProcedures } from '../services/feegow'

export function useProceduresFull() {
  const [procedures, setProcedures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadProcedures = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchProcedures()
      setProcedures(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('[useProceduresFull] Error fetching procedures:', err)
      setError(err.message || 'Erro ao carregar procedimentos da Feegow')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProcedures()
  }, [loadProcedures])

  return { procedures, loading, error, refetch: loadProcedures }
}
