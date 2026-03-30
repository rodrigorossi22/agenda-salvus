import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { useAppointments } from './hooks/useAppointments'
import { useProfessionals } from './hooks/useProfessionals'
import { useProcedures } from './hooks/useProcedures'
import { PatientList } from './components/PatientList/PatientList'
import { EvolutionModal } from './components/EvolutionModal/EvolutionModal'
import Calendar from './components/Sidebar/Calendar'
import salvusLogo from './assets/logo_transparent.png'
import './index.css'

function toFeegowDate(date) {
  return format(date, 'dd-MM-yyyy')
}

function App() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const dateStr = toFeegowDate(selectedDate)

  const { appointments, loading, error, refetch } = useAppointments(dateStr)
  const { professionals } = useProfessionals()
  const { procedureMap } = useProcedures()

  const [professionalFilter, setProfessionalFilter] = useState(null)
  const [selectedAppt, setSelectedAppt] = useState(null)

  const visibleAppointments = professionalFilter
    ? appointments.filter((a) => String(a.profissional_id) === String(professionalFilter))
    : appointments

  const profMap = useMemo(() => {
    const map = {}
    if (Array.isArray(professionals)) {
      professionals.forEach((p) => {
        map[p.profissional_id] = p.nome
      })
    }
    return map
  }, [professionals])

  const enriched = useMemo(() => {
    return appointments.map((a) => ({
      ...a,
      paciente_nome: a.paciente_nome || `Paciente #${a.paciente_id}`,
      profissional_nome: profMap[a.profissional_id] || `Prof #${a.profissional_id}`,
      procedimento_nome:
        procedureMap[a.procedimento_id] || a.procedimento_nome || 'Consulta',
    }))
  }, [appointments, profMap, procedureMap])

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-[#333] bg-[#111]">
        {/* Logo */}
        <div className="flex items-center justify-center py-4 border-b border-[#333]">
          <img src={salvusLogo} alt="Clínica Salvus" className="h-28 object-contain" />
        </div>

        {/* Calendar */}
        <div className="border-b border-[#333]">
          <Calendar selectedDate={selectedDate} onSelect={setSelectedDate} />
        </div>

        {/* Professional filter */}
        <div className="flex-1 overflow-y-auto p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Profissional
          </label>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setProfessionalFilter(null)}
              className={`rounded px-3 py-2 text-left text-sm font-medium transition-colors ${
                !professionalFilter
                  ? 'bg-[#c5a059] text-black'
                  : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
              }`}
            >
              Todos
            </button>
            {Array.isArray(professionals) &&
              professionals.map((prof) => (
                <button
                  key={prof.profissional_id}
                  onClick={() => setProfessionalFilter(prof.profissional_id)}
                  className={`rounded px-3 py-2 text-left text-sm font-medium transition-colors ${
                    String(professionalFilter) === String(prof.profissional_id)
                      ? 'bg-[#c5a059] text-black'
                      : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  {prof.nome}
                </button>
              ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#333] bg-[#0a0a0a]/80 px-8 py-4 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-bold">Agenda do Dia</h1>
            <p className="text-sm text-gray-500">{format(selectedDate, 'dd/MM/yyyy')}</p>
          </div>
          <div className="rounded-full bg-[#c5a059]/10 px-4 py-1 text-sm font-bold text-[#c5a059]">
            {visibleAppointments.length} agendamento{visibleAppointments.length !== 1 ? 's' : ''}
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c5a059] border-t-transparent mr-3" />
              Carregando agendamentos...
            </div>
          )}

          {error && (
            <div className="rounded border border-red-500/50 bg-red-500/10 p-4 text-red-400">
              <p className="font-semibold">Erro ao carregar agendamentos</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <PatientList
              appointments={enriched}
              professionalFilter={professionalFilter}
              onCardClick={setSelectedAppt}
            />
          )}
        </div>
      </main>

      {/* Evolution Modal */}
      {selectedAppt && (
        <EvolutionModal
          appointment={selectedAppt}
          procedureMap={procedureMap}
          onClose={() => setSelectedAppt(null)}
          onSuccess={() => {
            refetch()
            setSelectedAppt(null)
          }}
        />
      )}
    </div>
  )
}

export default App
