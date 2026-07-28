import React, { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function MyAppointmentsStage({
  phone,
  onChangePhone,
  searchingPatient,
  foundPatientName,
  appointments,
  loadingAppointments,
  onSearchPatient,
  onCancelAppointment,
  onRescheduleAppointment,
  onNewBooking,
  onBack
}) {
  const [cancelingId, setCancelingId] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(null) // appt object to confirm

  const handleConfirmCancel = async () => {
    if (!showCancelModal) return
    setCancelingId(showCancelModal.agendamento_id)
    try {
      await onCancelAppointment(showCancelModal)
    } finally {
      setCancelingId(null)
      setShowCancelModal(null)
    }
  }

  return (
    <div className="w-full max-w-lg px-4 py-8">
      {/* Botão Voltar */}
      <button 
        onClick={onBack}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#c5a059]/40 text-[#2e2a25] hover:text-[#8c6d31] hover:border-[#c5a059] hover:bg-[#faf8f5] shadow-xs hover:shadow-md transition-all font-medium text-sm mb-6 cursor-pointer group"
      >
        <svg className="w-4 h-4 text-[#c5a059] group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Voltar</span>
      </button>

      <header className="mb-8 border-b border-[#e6e2dc] pb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Área do Paciente</span>
        <h2 className="text-2xl font-serif mt-1 text-[#2e2a25]">Meus Agendamentos</h2>
        <p className="text-xs text-[#7a7065] mt-1">
          Consulte seus horários agendados, cancele ou solicite remarcações de forma simples.
        </p>
      </header>

      {/* Formulário de Identificação se não pesquisado */}
      {!foundPatientName && (
        <div className="bg-white border border-[#e6e2dc] p-6 rounded-2xl shadow-sm mb-8 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[#7a7065]">Informe seu Celular / WhatsApp</label>
          <input 
            type="tel" 
            value={phone}
            onChange={onChangePhone}
            placeholder="(DD) 99999-9999"
            disabled={searchingPatient}
            className="w-full bg-white border border-[#e6e2dc] disabled:bg-[#f7f6f3] rounded-lg px-4 py-3 text-[#2e2a25] placeholder-[#a29382] focus:outline-none focus:border-[#c5a059] transition-colors"
          />
          <button 
            type="button"
            onClick={onSearchPatient}
            disabled={searchingPatient || !phone}
            className="w-full bg-[#c5a059] hover:bg-[#b08e4f] disabled:bg-[#d8c5a2] text-white font-bold py-3.5 rounded-lg uppercase tracking-widest text-xs transition-colors cursor-pointer shadow-md"
          >
            {searchingPatient ? 'Buscando Agendamentos...' : 'Buscar Meus Agendamentos'}
          </button>
        </div>
      )}

      {/* Exibição dos Agendamentos do Paciente Identificado */}
      {foundPatientName && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#faf9f6] border border-[#e6e2dc] flex justify-between items-center">
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#c5a059] tracking-wider">Paciente Identificado</span>
              <h3 className="text-base font-serif font-bold text-[#2e2a25]">{foundPatientName}</h3>
            </div>
            <button
              onClick={onNewBooking}
              className="text-xs font-semibold text-[#c5a059] border border-[#c5a059] hover:bg-[#c5a059]/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              + Novo Agendamento
            </button>
          </div>

          {loadingAppointments ? (
            <div className="py-12 text-center text-xs text-[#7a7065] animate-pulse">
              Consultando seus agendamentos ativos na Feegow...
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-10 px-6 bg-white border border-[#e6e2dc] rounded-2xl text-center shadow-xs">
              <span className="text-3xl mb-2 block">🗓️</span>
              <h4 className="text-base font-serif font-semibold text-[#2e2a25] mb-1">Nenhum agendamento futuro encontrado</h4>
              <p className="text-xs text-[#7a7065] mb-6">
                Você não possui horários confirmados para os próximos dias. Deseja agendar um novo tratamento?
              </p>
              <button
                onClick={onNewBooking}
                className="bg-[#c5a059] hover:bg-[#b08e4f] text-white font-bold py-3 px-6 rounded-lg uppercase tracking-widest text-xs transition-colors cursor-pointer shadow-md"
              >
                Agendar Novo Tratamento ⚡
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-[#7a7065]">
                Seus Próximos Atendimentos ({appointments.length})
              </h4>

              {appointments.map((appt) => {
                let parsedDate = null;
                try {
                  const [d, m, y] = appt.data.split('-').map(Number)
                  const [hh, mm] = appt.horario.split(':').map(Number)
                  parsedDate = new Date(y, m - 1, d, hh, mm)
                } catch (e) {
                  parsedDate = new Date()
                }

                const now = new Date()
                const hoursDifference = (parsedDate.getTime() - now.getTime()) / (1000 * 60 * 60)
                const isLessThan24h = hoursDifference < 24

                return (
                  <div 
                    key={appt.agendamento_id}
                    className="bg-white border border-[#e6e2dc] rounded-2xl p-5 shadow-xs hover:border-[#c5a059]/60 transition-all space-y-4"
                  >
                    <div className="flex justify-between items-start border-b border-[#f0ede6] pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#c5a059] bg-[#c5a059]/10 px-2 py-0.5 rounded">
                          {appt.procedimento_nome || appt.procedimento || 'Tratamento Salvus'}
                        </span>
                        <h4 className="text-base font-serif font-bold text-[#2e2a25] mt-1">
                          {format(parsedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </h4>
                        <p className="text-xs text-[#7a7065] font-medium flex items-center gap-1 mt-0.5">
                          ⏰ <strong>{appt.horario.substring(0, 5)}h</strong> ({appt.duracao || 60} min)
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-[#27ae60] bg-[#27ae60]/10 border border-[#27ae60]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Confirmado
                      </span>
                    </div>

                    <div className="text-[11px] text-[#7a7065] space-y-1">
                      <p>📍 <strong>Local:</strong> Av. Bernardino de Campos, 327 - Sala 13, Paraíso</p>
                    </div>

                    {isLessThan24h && (
                      <div className="p-2.5 bg-[#fff9f0] border border-[#f5e6d3] rounded-lg text-[11px] text-[#b8860b] leading-tight">
                        ⚠️ <strong>Aviso:</strong> Falta menos de 24h para este atendimento. O cancelamento agora bloqueará marcações na semana corrente.
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => onRescheduleAppointment(appt)}
                        className="flex-1 border border-[#c5a059] text-[#c5a059] hover:bg-[#c5a059]/10 font-semibold py-2.5 rounded-lg uppercase tracking-wider text-[10px] transition-colors text-center cursor-pointer"
                      >
                        Remarcar
                      </button>
                      <button
                        onClick={() => setShowCancelModal(appt)}
                        disabled={cancelingId === appt.agendamento_id}
                        className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 font-semibold py-2.5 rounded-lg uppercase tracking-wider text-[10px] transition-colors text-center cursor-pointer disabled:opacity-50"
                      >
                        {cancelingId === appt.agendamento_id ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmação de Cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-[#e6e2dc]">
            <div className="text-center">
              <span className="text-3xl block mb-2">⚠️</span>
              <h3 className="text-lg font-serif font-bold text-[#2e2a25]">Cancelar Agendamento?</h3>
              <p className="text-xs text-[#7a7065] mt-2 leading-relaxed">
                Tem certeza que deseja cancelar seu horário de <strong>{showCancelModal.data} às {showCancelModal.horario.substring(0, 5)}h</strong>?
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleConfirmCancel}
                disabled={cancelingId === showCancelModal.agendamento_id}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-xs transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {cancelingId === showCancelModal.agendamento_id ? 'Cancelando na Feegow...' : 'Sim, Cancelar Vaga'}
              </button>
              <button
                onClick={() => setShowCancelModal(null)}
                disabled={!!cancelingId}
                className="w-full border border-[#e6e2dc] text-[#7a7065] hover:bg-[#faf9f6] font-semibold py-3 rounded-lg uppercase tracking-widest text-xs transition-colors cursor-pointer"
              >
                Manter Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
