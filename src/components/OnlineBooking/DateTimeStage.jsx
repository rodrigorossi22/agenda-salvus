import React, { useRef } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function DateTimeStage({
  selectedProcedure,
  selectedDate,
  loadingSlots,
  availableSlots,
  isTestMode,
  setIsTestMode,
  activeProfessionalId,
  errorMessage,
  loadSlots,
  scarcitySlotsForDate,
  datesWithSlots,
  weekdaysWithSelected,
  onSelectDate,
  onSelectTime,
  onBack,
  handleCalendarDateSelect,
  onOpenWaitlistModal
}) {
  const dateInputRef = useRef(null)

  const handleCalendarButtonClick = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker()
      } catch {
        dateInputRef.current.click()
      }
    }
  }

  const hasSlots = Object.keys(availableSlots).length > 0

  return (
    <div className="w-full max-w-3xl px-4">
      <button 
        onClick={onBack}
        className="flex items-center text-sm text-[#7a7065] hover:text-[#c5a059] mb-6 transition-colors cursor-pointer"
      >
        ← Voltar
      </button>

      <header className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Agendamento Online</span>
        <h2 className="text-4xl font-serif mt-2 text-[#2e2a25]">{selectedProcedure?.name || 'Agenda Recovery e Bem-estar'}</h2>
      </header>

      {/* Test Mode Notification Banners */}
      {(!isTestMode && !hasSlots && !loadingSlots && selectedProcedure) && (
        <div className="mb-6 p-4 rounded-lg bg-[#faf0e6] border border-[#e6d0ba] text-[#8c6d53] text-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <p className="font-semibold">⚠️ Sem horários cadastrados</p>
            <p className="text-xs mt-1 text-[#9e826c]">
              Não foram encontrados horários ativos na Feegow para este procedimento. 
              Para testar o fluxo de agendamento localmente, clique no botão ao lado para carregar a agenda de teste (Dr. Deangelo ID 1).
            </p>
          </div>
          <button
            onClick={() => {
              setIsTestMode(true)
            }}
            className="bg-[#c5a059] hover:bg-[#b08e4f] text-white text-xs font-semibold px-4 py-2 rounded transition-colors whitespace-nowrap shadow-sm cursor-pointer"
          >
            Usar Agenda de Teste
          </button>
        </div>
      )}

      {isTestMode && activeProfessionalId === '1' && (
        <div className="mb-6 p-3 rounded-lg bg-[#ebf3e3] border border-[#c6dcae] text-[#5c7a40] text-xs flex justify-between items-center shadow-sm">
          <span>
            🛠️ <strong>Modo de Teste Ativo:</strong> Carregando horários do Dr. Deangelo (ID 1). O agendamento final será registrado nesta agenda.
          </span>
          <button 
            onClick={() => {
              setIsTestMode(false)
            }}
            className="text-[#5c7a40] hover:underline font-bold ml-2 whitespace-nowrap cursor-pointer"
          >
            Restaurar Agenda
          </button>
        </div>
      )}

      {/* Connection Error Banner with Try Again Button */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between items-center leading-relaxed">
          <span>{errorMessage}</span>
          <button 
            onClick={loadSlots}
            className="bg-[#c5a059] text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-[#b08e4f] transition-colors cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Seletor de Datas (Sempre Visível para dar Autonomia ao Paciente) */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#7a7065]">1. Escolha o Dia</h3>
          <button
            onClick={onOpenWaitlistModal}
            className="text-xs text-[#c5a059] font-semibold hover:underline cursor-pointer flex items-center gap-1"
          >
            Fila de Espera ⚡
          </button>
        </div>
        <div className="flex gap-2 items-center overflow-x-auto pb-3 scrollbar-thin">
          {weekdaysWithSelected.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const isSelected = dateStr === format(selectedDate, 'yyyy-MM-dd')
            const hasSlotsOnDay = datesWithSlots.some(d => format(d, 'yyyy-MM-dd') === dateStr)

            return (
              <button
                key={idx}
                onClick={() => onSelectDate(day)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-lg border transition-all duration-200 cursor-pointer relative ${
                  isSelected 
                    ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' 
                    : hasSlotsOnDay 
                      ? 'border-[#e6e2dc] bg-white text-[#7a7065] hover:border-[#a29382] hover:text-[#2e2a25]'
                      : 'border-[#ede9e3] bg-[#faf9f6] text-[#b0a597] hover:border-[#c5a059]'
                }`}
              >
                <span className="text-[10px] uppercase font-medium">{format(day, 'eee', { locale: ptBR })}</span>
                <span className="text-xl font-bold mt-0.5">{format(day, 'd')}</span>
                <span className="text-[9px] uppercase">{format(day, 'MMM', { locale: ptBR })}</span>
                
                {!hasSlotsOnDay && (
                  <span className="text-[8px] font-semibold text-[#c5a059] mt-0.5 uppercase tracking-tighter">
                    Lotado
                  </span>
                )}
              </button>
            )
          })}

          {/* Calendário Selector Button */}
          <div 
            onClick={handleCalendarButtonClick}
            className="relative flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-lg border border-[#e6e2dc] bg-white text-[#7a7065] hover:border-[#c5a059] hover:text-[#c5a059] hover:bg-[#c5a059]/5 transition-all duration-200 cursor-pointer overflow-hidden group"
          >
            <svg className="w-5 h-5 mb-1 text-[#7a7065] group-hover:text-[#c5a059] transition-colors pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[9px] font-semibold tracking-wider text-center pointer-events-none">Outro Dia</span>
            <input 
              ref={dateInputRef}
              type="date"
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const chosenDate = new Date(year, month - 1, day);
                  handleCalendarDateSelect(chosenDate);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
          </div>
        </div>
      </div>

      {/* Seção 2: Horários Disponíveis ou Card de Vaga Esgotada na Data */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#7a7065] mb-4">2. Horários Disponíveis</h3>

        {loadingSlots ? (
          <div className="flex justify-center items-center py-12 text-[#7a7065]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c5a059] border-t-transparent mr-2" />
            Consultando agenda da Feegow...
          </div>
        ) : (scarcitySlotsForDate.morning.length === 0 && scarcitySlotsForDate.afternoon.length === 0 && scarcitySlotsForDate.evening.length === 0) ? (
          /* Card para Data sem Horários Libres */
          <div className="my-6 py-8 px-6 bg-[#faf9f6] border border-[#e6e2dc] rounded-2xl text-center max-w-xl mx-auto shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Indisponibilidade</span>
            <h3 className="text-xl font-serif text-[#2e2a25] mt-1 mb-2">Sem vagas para {format(selectedDate, "eeee, d 'de' MMMM", { locale: ptBR })}</h3>
            <p className="text-xs text-[#7a7065] mb-6 leading-relaxed">
              Todos os horários online para esta data já foram preenchidos. Você pode entrar na Fila de Espera deste dia ou avançar para a próxima data com horários livres!
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button 
                onClick={onOpenWaitlistModal}
                className="inline-flex items-center justify-center bg-[#c5a059] hover:bg-[#b08e4f] text-white font-bold py-3 px-6 rounded-lg uppercase tracking-widest text-xs transition-colors shadow-md text-center cursor-pointer w-full sm:w-auto"
              >
                Fila de Espera neste Dia ⚡
              </button>

              {datesWithSlots.length > 0 && (
                <button
                  onClick={() => {
                    const nextDate = datesWithSlots.find(d => d.getTime() > selectedDate.getTime()) || datesWithSlots[0]
                    if (nextDate) onSelectDate(nextDate)
                  }}
                  className="inline-flex items-center justify-center border border-[#c5a059] text-[#c5a059] hover:bg-[#c5a059]/10 font-semibold py-3 px-6 rounded-lg uppercase tracking-widest text-xs transition-colors text-center cursor-pointer w-full sm:w-auto"
                >
                  Próxima Data Disponível →
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Morning section */}
            <div>
              <h4 className="text-sm font-medium text-[#7a7065] mb-3 border-b border-[#e6e2dc] pb-1">Manhã</h4>
              {scarcitySlotsForDate.morning.length === 0 ? (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#faf9f6] border border-[#e6e2dc] p-3.5 rounded-xl gap-3">
                  <p className="text-xs text-[#7a7065] italic">Sem horários livres no turno da manhã.</p>
                  <button
                    onClick={() => onOpenWaitlistModal('manha')}
                    className="bg-[#c5a059] hover:bg-[#b08e4f] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    Entrar na Fila (Manhã) ⚡
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {scarcitySlotsForDate.morning.map(time => (
                    <button
                      key={time}
                      onClick={() => onSelectTime(time, scarcitySlotsForDate.slotLocals?.[time] || scarcitySlotsForDate.localId)}
                      className="bg-white hover:bg-[#c5a059] border border-[#e6e2dc] hover:border-[#c5a059] text-[#2e2a25] hover:text-white font-medium py-3 rounded-lg text-sm text-center transition-all duration-200 shadow-sm cursor-pointer"
                    >
                      {time.substring(0, 5)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Afternoon section */}
            <div>
              <h4 className="text-sm font-medium text-[#7a7065] mb-3 border-b border-[#e6e2dc] pb-1">Tarde</h4>
              {scarcitySlotsForDate.afternoon.length === 0 ? (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#faf9f6] border border-[#e6e2dc] p-3.5 rounded-xl gap-3">
                  <p className="text-xs text-[#7a7065] italic">Sem horários livres no turno da tarde.</p>
                  <button
                    onClick={() => onOpenWaitlistModal('tarde')}
                    className="bg-[#c5a059] hover:bg-[#b08e4f] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    Entrar na Fila (Tarde) ⚡
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {scarcitySlotsForDate.afternoon.map(time => (
                    <button
                      key={time}
                      onClick={() => onSelectTime(time, scarcitySlotsForDate.slotLocals?.[time] || scarcitySlotsForDate.localId)}
                      className="bg-white hover:bg-[#c5a059] border border-[#e6e2dc] hover:border-[#c5a059] text-[#2e2a25] hover:text-white font-medium py-3 rounded-lg text-sm text-center transition-all duration-200 shadow-sm cursor-pointer"
                    >
                      {time.substring(0, 5)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Evening section */}
            <div>
              <h4 className="text-sm font-medium text-[#7a7065] mb-3 border-b border-[#e6e2dc] pb-1">Noite</h4>
              {scarcitySlotsForDate.evening.length === 0 ? (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#faf9f6] border border-[#e6e2dc] p-3.5 rounded-xl gap-3">
                  <p className="text-xs text-[#7a7065] italic">Sem horários livres no turno da noite.</p>
                  <button
                    onClick={() => onOpenWaitlistModal('noite')}
                    className="bg-[#c5a059] hover:bg-[#b08e4f] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    Entrar na Fila (Noite) ⚡
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {scarcitySlotsForDate.evening.map(time => (
                    <button
                      key={time}
                      onClick={() => onSelectTime(time, scarcitySlotsForDate.slotLocals?.[time] || scarcitySlotsForDate.localId)}
                      className="bg-white hover:bg-[#c5a059] border border-[#e6e2dc] hover:border-[#c5a059] text-[#2e2a25] hover:text-white font-medium py-3 rounded-lg text-sm text-center transition-all duration-200 shadow-sm cursor-pointer"
                    >
                      {time.substring(0, 5)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
