import { useState, useEffect } from 'react'
import { fetchProcedures } from '../services/feegow'

export function useProcedures() {
  const [procedureMap, setProcedureMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProcedures()
      .then((list) => {
        const map = {}
        list.forEach((p) => {
          map[p.procedimento_id] = p.nome
        })
        setProcedureMap(map)
      })
      .catch(() => setProcedureMap({}))
      .finally(() => setLoading(false))
  }, [])

  return { procedureMap, loading }
}
