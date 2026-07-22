import React from 'react'

const PROCEDURES = [
  {
    id: 'ventosaterapia',
    name: 'Ventosaterapia',
    description: 'Sucção contra dor e inflamação.',
    category: 'Recuperação',
    feegowId: 346,
    professionalIds: ['16', '15'], // Esteticista first, then Monica
    displayDuration: '50'
  },
  {
    id: 'eletroestimulacao',
    name: 'Eletroestimulação',
    description: 'Estímulos para regeneração muscular.',
    category: 'Recuperação',
    feegowId: 347,
    professionalIds: ['16', '15'],
    displayDuration: '50'
  },
  {
    id: 'corrente-russa',
    name: 'Corrente Russa',
    description: 'Estímulos focados no alívio de dores agudas',
    category: 'Recuperação',
    feegowId: 354,
    professionalIds: ['16', '15'],
    displayDuration: '50'
  },
  {
    id: 'shape-detox',
    name: 'Shape Detox',
    description: 'A evolução da Drenagem Linfática. Protocolo profundo focado em eliminar toxinas, inchaço e retenção de líquidos.',
    category: 'Desintoxicação',
    feegowId: 338,
    professionalIds: ['16', '15'],
    displayDuration: '60'
  },
  {
    id: 'drenagem',
    name: 'Drenagem',
    description: 'Drenagem clássica para ativação do sistema linfático, eliminação de líquidos e toxinas.',
    category: 'Desintoxicação',
    feegowId: 339,
    professionalIds: ['16'], // Apenas Esteticista
    displayDuration: '50'
  },
  {
    id: 'massagem-facial',
    name: 'Massagem Facial',
    description: 'Alívio de tensões e relaxamento profundo.',
    category: 'Reset Mental',
    feegowId: 355,
    professionalIds: ['16', '15'],
    displayDuration: '50'
  },
  {
    id: 'massagem',
    name: 'Massagem Relaxante',
    description: 'Massagem corporal relaxante para alívio de tensões e relaxamento profundo.',
    category: 'Reset Mental',
    feegowId: 349,
    professionalIds: ['16'], // Apenas Esteticista
    displayDuration: '50'
  }
]

export default function ProcedureStage({ onSelectProcedure, onBack, allowedProfIds = null, blockedProcedureIds = null, subtitle = null }) {
  const categories = ['Recuperação', 'Desintoxicação', 'Reset Mental']

  const activeProcedures = React.useMemo(() => {
    let list = PROCEDURES
    if (allowedProfIds && allowedProfIds.length > 0) {
      list = list.filter(p => p.professionalIds.some(profId => allowedProfIds.includes(profId)))
    }
    if (blockedProcedureIds && blockedProcedureIds.length > 0) {
      list = list.filter(p => !blockedProcedureIds.includes(p.feegowId))
    }
    return list
  }, [allowedProfIds, blockedProcedureIds])

  return (
    <div className="w-full max-w-6xl px-4">
      <button 
        onClick={onBack}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#c5a059]/40 text-[#2e2a25] hover:text-[#8c6d31] hover:border-[#c5a059] hover:bg-[#faf8f5] shadow-xs hover:shadow-md transition-all font-medium text-sm mb-6 cursor-pointer group"
      >
        <svg className="w-4 h-4 text-[#c5a059] group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Voltar</span>
      </button>

      <header className="mb-12 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Agendamento Online</span>
        <h2 className="text-4xl font-serif mt-2 text-[#2e2a25]">Escolha o seu Atendimento</h2>
        <p className="text-sm text-[#7a7065] mt-2">
          {subtitle || 'Selecione uma categoria e o procedimento desejado para continuar'}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {categories.map((category) => {
          const categoryProcs = activeProcedures.filter((p) => p.category === category)
          if (categoryProcs.length === 0) return null

          return (
            <div 
              key={category} 
              className="bg-white border border-[#e6e2dc] rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div>
                <div className="border-b border-[#e6e2dc] pb-4 mb-6">
                  <h3 className="text-xl font-serif text-[#2e2a25] font-medium">{category}</h3>
                  <p className="text-[10px] text-[#a29382] tracking-wider uppercase mt-1">
                    {category === 'Recuperação' && 'Alívio & Regeneração'}
                    {category === 'Desintoxicação' && 'Purificação & Forma'}
                    {category === 'Reset Mental' && 'Equilíbrio & Relaxamento'}
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  {categoryProcs.map((proc) => (
                    <button
                      key={proc.id}
                      onClick={() => onSelectProcedure(proc)}
                      className="w-full text-left bg-[#fdfbf7] hover:bg-[#c5a059]/5 border border-[#e6e2dc] hover:border-[#c5a059] rounded-xl p-4 transition-all duration-300 group cursor-pointer flex flex-col justify-between shadow-sm"
                    >
                      <div className="flex gap-4 items-start w-full">
                        {/* Ilustração Colorida Premium inspirada no folder do paciente */}
                        <div className="w-16 h-16 flex-shrink-0 bg-white border border-[#e6e2dc] group-hover:border-[#c5a059]/30 rounded-xl flex items-center justify-center p-1 shadow-sm transition-colors">
                          {proc.id === 'ventosaterapia' && (
                            <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2 38h44v4H2v-4z" fill="#F5F4F0" stroke="#E6E2DC" strokeWidth="0.8" />
                              <path d="M4 32c4-2 12-4 20-4s18 2 22 4v6H4v-6z" fill="#F5D6C6" stroke="#E0B29B" strokeWidth="0.8" />
                              <circle cx="15" cy="26" r="3.5" fill="#EF5350" fillOpacity="0.4" />
                              <path d="M11 25c0-3.3 1.8-6 4-6s4 2.7 4 6h-8z" fill="#81D4FA" fillOpacity="0.5" stroke="#0288D1" strokeWidth="0.8" />
                              <rect x="14.5" y="16" width="1" height="3" rx="0.5" fill="#C4A47C" />
                              <circle cx="24" cy="25" r="3.5" fill="#EF5350" fillOpacity="0.4" />
                              <path d="M20 24c0-3.3 1.8-6 4-6s4 2.7 4 6h-8z" fill="#81D4FA" fillOpacity="0.5" stroke="#0288D1" strokeWidth="0.8" />
                              <rect x="23.5" y="15" width="1" height="3" rx="0.5" fill="#C4A47C" />
                              <circle cx="33" cy="26" r="3.5" fill="#EF5350" fillOpacity="0.4" />
                              <path d="M29 25c0-3.3 1.8-6 4-6s4 2.7 4 6h-8z" fill="#81D4FA" fillOpacity="0.5" stroke="#0288D1" strokeWidth="0.8" />
                              <rect x="32.5" y="16" width="1" height="3" rx="0.5" fill="#C4A47C" />
                            </svg>
                          )}
                          {proc.id === 'eletroestimulacao' && (
                            <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M24 4c-5 8-8 16-8 20s3 12 8 20c5-8 8-16 8-20S29 12 24 4z" fill="#E57373" stroke="#C62828" strokeWidth="0.8" />
                              <path d="M24 4v40M21 8c-2.5 5-3.5 11-3.5 16s1 11 3.5 16M27 8c2.5 5 3.5 11 3.5 16s-1 11-3.5 16" stroke="#FF8A80" strokeWidth="0.8" />
                              <rect x="20" y="16" width="8" height="5" rx="1" fill="#ECEFF1" stroke="#90A4AE" strokeWidth="0.8" />
                              <circle cx="24" cy="18.5" r="1.5" fill="#37474F" />
                              <rect x="20" y="28" width="8" height="5" rx="1" fill="#ECEFF1" stroke="#90A4AE" strokeWidth="0.8" />
                              <circle cx="24" cy="30.5" r="1.5" fill="#37474F" />
                              <path d="M24 18.5c-4 2-4 10 0 12" stroke="#78909C" strokeWidth="0.6" fill="none" />
                              <path d="M12 18l2.5 2-2.5 2 2.5 2-2.5 2M36 18l-2.5 2 2.5 2-2.5 2 2.5 2" stroke="#29B6F6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              <path d="M10 24l2 1.5-2 1.5 2 1.5M38 24l-2 1.5 2 1.5-2 1.5" stroke="#00E5FF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          )}
                          {proc.id === 'corrente-russa' && (
                            <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M16 28l4-8h8l-2 4h4l-6 10v-6h-8z" fill="#C4A47C" opacity="0.8"/>
                              <circle cx="24" cy="24" r="20" stroke="#E6E2DC" strokeWidth="1.5" fill="none" />
                            </svg>
                          )}
                          {proc.id === 'shape-detox' && (
                            <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17 6c1.5 4 1 12 0 24s1.5 12 3.5 12c1 0 2-1 3-6h1c1 5 2 6 3 6c2 0 3.5-12 3.5-12s-1.5-20 0-24c-2 0-3 3-7 3s-5-3-7-3z" fill="#F5D6C6" stroke="#E0B29B" strokeWidth="0.8" />
                              <path d="M17.5 16c3.5 1 6.5 1 13 0v3c-3 3.5-5 4-6.5 4s-3.5-.5-6.5-4v-3z" fill="#FFFFFF" stroke="#E6E2DC" strokeWidth="0.8" />
                              <path d="M18.5 22.5c2.5.5 5.5.5 8 0M19 25.5c2.5.5 5.5.5 8.0 0M20 28.5c2 .5 4 .5 6 0M20.5 31.5c1.5.3 3 .3 4.5 0" stroke="#C4A47C" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                              <circle cx="35" cy="13" r="6" fill="#4CAF50" stroke="#388E3C" strokeWidth="0.8" />
                              <path d="M33.5 14.5c1-1.5 2.5-1.5 2.5-1.5s0 1.5-1.5 2.5c-.8.8-1 .8-1 .8s0-.3.5-1.3z" fill="#FFFFFF" />
                              <path d="M36.5 12.5c-.5-1-1.5-1-1.5-1s0 1.2 1 1.5c.6.2.7.2.7.2s-.1-.2-.2-.7z" fill="#FFFFFF" />
                            </svg>
                          )}
                          {proc.id === 'drenagem' && (
                            <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="24" cy="24" r="20" stroke="#E6E2DC" strokeWidth="1.2" fill="none" />
                              <path d="M14 20c4-3 10-3 20 0M14 28c4-3 10-3 20 0" stroke="#C4A47C" strokeWidth="1.2" strokeLinecap="round"/>
                            </svg>
                          )}
                          {proc.id === 'massagem-facial' && (
                            <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="24" cy="24" r="14" fill="#F5D6C6" stroke="#E0B29B" strokeWidth="1"/>
                              <path d="M18 22c1-1 3-1 4 0M26 22c1-1 3-1 4 0" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round"/>
                              <path d="M22 30c1 1 3 1 4 0" stroke="#C4A47C" strokeWidth="1.5" strokeLinecap="round"/>
                              <path d="M10 18c2-4 6-6 8-4M38 18c-2-4-6-6-8-4" stroke="#E6E2DC" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          )}
                           {proc.id === 'massagem' && (
                             <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                               <circle cx="24" cy="24" r="20" stroke="#E6E2DC" strokeWidth="0.8" fill="none" />
                               <path d="M4 34c4-2 12-4 20-4s18 2 22 4v6H4v-6z" fill="#F5D6C6" stroke="#E0B29B" strokeWidth="0.8" />
                               <path d="M14 22c2-2 6-4 10-4s8 2 10 4" stroke="#C4A47C" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 2" />
                               <path d="M24 17c-2 0-3.5 3-3.5 4.5 0 1.5 1.5 2 3.5 2s3.5-.5 3.5-2c0-1.5-1.5-4.5-3.5-4.5z" fill="#E6CFA3" fillOpacity="0.6" stroke="#C4A47C" strokeWidth="0.8" />
                               <path d="M21 21.5c-1.5-.7-3 0-3 1.5 0 1 .8 1.5 3 .7" fill="#E6CFA3" fillOpacity="0.4" stroke="#C4A47C" strokeWidth="0.8" />
                               <path d="M27 21.5c1.5-.7 3 0 3 1.5 0 1-.8 1.5-3 .7" fill="#E6CFA3" fillOpacity="0.4" stroke="#C4A47C" strokeWidth="0.8" />
                             </svg>
                           )}
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-semibold text-sm text-[#2e2a25] group-hover:text-[#c5a059] transition-colors">
                              {proc.name}
                            </h4>
                            <span className="text-[10px] bg-white border border-[#e6e2dc] text-[#7a7065] px-2 py-0.5 rounded-full whitespace-nowrap">
                              {proc.displayDuration} min
                            </span>
                          </div>
                          <p className="text-xs text-[#7a7065] mt-1.5 leading-relaxed">
                            {proc.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end w-full mt-4 pt-2.5 border-t border-[#f2efeb] text-[10px] text-[#a29382]">
                        <span className="text-[#c5a059] font-semibold flex items-center gap-0.5">
                          Selecionar
                          <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
                          </svg>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
