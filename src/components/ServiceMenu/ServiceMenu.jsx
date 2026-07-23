import React, { useState, useMemo } from 'react'
import { useProceduresFull } from '../../hooks/useProceduresFull'
import salvusLogo from '../../assets/logo_transparent.png'

// Category definitions and mapping for Salvus Procedures
const CATEGORIES = [
  {
    id: 'recuperacao',
    title: 'Recuperação',
    subtitle: 'Alívio & Regeneração Muscular',
    keywords: ['ventosaterapia', 'eletroestimulação', 'eletroestimulacao', 'corrente russa', 'recuperação', 'recuperacao', 'dor', 'laser']
  },
  {
    id: 'desintoxicacao',
    title: 'Desintoxicação',
    subtitle: 'Purificação & Redução de Retenção',
    keywords: ['shape detox', 'drenagem', 'detox', 'linfática', 'linfatica', 'gordura', 'modeladora']
  },
  {
    id: 'reset-mental',
    title: 'Reset Mental',
    subtitle: 'Equilíbrio & Relaxamento Profundo',
    keywords: ['massagem', 'facial', 'relaxante', 'reset', 'stress', 'spa', 'crânio', 'cranio']
  },
  {
    id: 'medicina-performance',
    title: 'Medicina | Performance',
    subtitle: 'Avaliação Médica & Alta Performance',
    keywords: ['consulta', 'médica', 'medica', 'bioimpedância', 'bioimpedancia', 'nutrologia', 'endocrinologia', 'injetável', 'injetavel', 'protocolo', 'exame', 'retorno', 'avaliação', 'avaliacao']
  }
]

// Fallback procedural visual descriptions and icons
const PROCEDURE_META = {
  'ventosaterapia': {
    description: 'Aplicação de ventosas para descompressão tecidual, alívio de dores crônicas e ativação do fluxo sanguíneo.',
    duration: '50 min',
    category: 'recuperacao'
  },
  'eletroestimulacao': {
    description: 'Estímulos neuromusculares de alta tecnologia para fortalecimento, regeneração e alívio de fadiga.',
    duration: '50 min',
    category: 'recuperacao'
  },
  'corrente russa': {
    description: 'Correntes elétricas terapêuticas focadas na tonificação muscular profunda e analgesia local.',
    duration: '50 min',
    category: 'recuperacao'
  },
  'shape detox': {
    description: 'Protocolo exclusivo Salvus combinando drenagem profunda, manta térmica e princípios ativos detoxificantes.',
    duration: '60 min',
    category: 'desintoxicacao'
  },
  'drenagem': {
    description: 'Técnica manual suave para drenagem do sistema linfático, redução de inchaço e retenção de líquidos.',
    duration: '50 min',
    category: 'desintoxicacao'
  },
  'massagem facial': {
    description: 'Massagem focada na musculatura facial e cervical para alívio de tensão mandibular e viço da pele.',
    duration: '50 min',
    category: 'reset-mental'
  },
  'massagem relaxante': {
    description: 'Massagem corporal completa com óleos essenciais para alívio do estresse físico e reequilíbrio mental.',
    duration: '50 min',
    category: 'reset-mental'
  },
  'consulta': {
    description: 'Consulta médica especializada em medicina integrativa, avaliação metabólica e plano personalizado de saúde.',
    duration: '60 min',
    category: 'medicina-performance'
  },
  'bioimpedancia': {
    description: 'Exame de composição corporal avançado por bioimpedância com relatório detalhado de massa magra e gordura.',
    duration: '30 min',
    category: 'medicina-performance'
  }
}

export function ServiceMenu({ onSelectBooking, whatsappNumber = '5521971661665' }) {
  const { procedures, loading, error, refetch } = useProceduresFull()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todos')

  // Formata o preço vindo da Feegow (trata centavos e números brutos)
  const formatPrice = (rawValor) => {
    if (rawValor === undefined || rawValor === null || rawValor === 0 || rawValor === '0' || rawValor === '0.00') {
      return 'Sob Consulta'
    }
    const num = Number(rawValor)
    if (isNaN(num)) return 'Sob Consulta'
    
    // Se o valor for um número muito alto (ex: 15000), a Feegow está enviando centavos
    const valorEmReais = num > 1000 ? num / 100 : num
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valorEmReais)
  }

  // Categorização inteligente dos procedimentos retornados pela Feegow
  const categorizedProcedures = useMemo(() => {
    if (!Array.isArray(procedures)) return {}

    const result = {
      recuperacao: [],
      desintoxicacao: [],
      'reset-mental': [],
      'medicina-performance': [],
      outros: []
    }

    const EXCLUDED_KEYWORDS = [
      'laser', 'gympass', 'principia', 'classpass', 'class pass', 'sabonete',
      'retorno', 'teleconsulta', 'cbd', 'crio', 'bioplastia',
      '1 ui', 'lavieen', 'tirzepatida', 'semaglutida', 'enfermagem', 'locação',
      'locacao', 'whey', 'modelo', 'mentoria', 'rino', 'fotos', 'medidas',
      'crédito', 'credito', 'implante', 'corticoide', 'pilates', 'bota de compress',
      'preenchimento corporal', 'maesteron', 'masteron', 'vitamina b1',
      'cynthia', 'cyntyia', 'noda', 'soroterapia mitocondrial', 'soroterapia otimiz',
      'protetor solar'
    ]

    procedures.forEach((proc) => {
      const nomeLower = (proc.nome || '').toLowerCase()
      
      // Filtrar e remover procedimentos excluídos pelo cliente
      if (EXCLUDED_KEYWORDS.some((kw) => nomeLower.includes(kw))) {
        return
      }

      // Checar se bate com a busca
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase()
        if (!nomeLower.includes(query) && !String(proc.procedimento_id).includes(query)) {
          return
        }
      }

      // Encontrar a categoria correspondente
      let matchedCategory = 'outros'
      for (const cat of CATEGORIES) {
        if (cat.keywords.some((kw) => nomeLower.includes(kw))) {
          matchedCategory = cat.id
          break
        }
      }

      // Buscar metadados complementares (descrição / duração)
      let meta = { description: 'Atendimento especializado na Clínica Salvus.', duration: proc.tempo ? `${proc.tempo} min` : '50 min' }
      for (const [key, val] of Object.entries(PROCEDURE_META)) {
        if (nomeLower.includes(key)) {
          meta = { ...meta, ...val }
          break
        }
      }

      result[matchedCategory].push({
        ...proc,
        formattedPrice: formatPrice(proc.valor),
        description: meta.description,
        displayDuration: proc.tempo ? `${proc.tempo} min` : meta.duration
      })
    })

    // Agrupar e ordenar alfabeticamente para colocar procedimentos semelhantes juntos (ex: Botox, Ultrassom, Massagem, etc.)
    Object.keys(result).forEach((catId) => {
      result[catId].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
    })

    return result
  }, [procedures, searchTerm])

  // Gerar link direto para WhatsApp com mensagem personalizada
  const getWhatsAppLink = (proc) => {
    const precoText = proc.formattedPrice !== 'Sob Consulta' ? ` (${proc.formattedPrice})` : ''
    const msg = `Olá! Gostaria de agendar o serviço *${proc.nome}*${precoText} que vi no Menu da Clínica Salvus. Poderiam me informar a disponibilidade de horários?`
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#2E2A25] font-sans">
      {/* Header Sticky com Estética Silent Luxury */}
      <header className="sticky top-0 z-20 bg-[#F5F4F0]/90 backdrop-blur-md border-b border-[#E6E2DC] px-6 py-5 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={salvusLogo} alt="Clínica Salvus" className="h-12 md:h-14 object-contain" />
            <div className="hidden sm:block h-8 w-px bg-[#C4A47C]/40" />
            <div className="hidden sm:block">
              <span className="text-[10px] uppercase tracking-widest text-[#C4A47C] font-semibold block">
                Tabela Oficial
              </span>
              <h1 className="text-xl font-serif text-[#2E2A25] font-medium leading-tight">
                Menu de Serviços & Valores
              </h1>
            </div>
          </div>

          {/* Barra de Busca e Ação Geral */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="relative flex-1 md:w-72">
              <svg 
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7065]" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar tratamento ou valor..."
                className="w-full bg-white border border-[#E6E2DC] focus:border-[#C4A47C] focus:ring-1 focus:ring-[#C4A47C] text-sm text-[#2E2A25] placeholder-[#7A7065]/60 rounded-full pl-10 pr-4 py-2 outline-none transition-all shadow-xs"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7A7065] hover:text-[#2E2A25]"
                >
                  ✕
                </button>
              )}
            </div>

            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de consultar informações sobre os atendimentos da Clínica Salvus.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2E2A25] text-white hover:bg-[#3A352F] transition-all text-xs font-semibold tracking-wide whitespace-nowrap shadow-sm"
            >
              <span>Atendimento WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-10 px-6 max-w-7xl mx-auto text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C4A47C]">
          Medicina • Performance • Estética
        </span>
        <h2 className="text-4xl md:text-5xl font-serif text-[#2E2A25] mt-3 font-normal tracking-tight">
          Catálogo Exclusivo de Procedimentos
        </h2>
        <p className="text-sm md:text-base text-[#7A7065] mt-3 max-w-2xl mx-auto leading-relaxed">
          Transparência e excelência em saúde.
        </p>

        {/* Filtro de Categorias */}
        <div className="flex items-center justify-center flex-wrap gap-2 mt-8">
          <button
            onClick={() => setSelectedCategory('todos')}
            className={`px-5 py-2 rounded-full text-xs font-medium tracking-wide transition-all cursor-pointer ${
              selectedCategory === 'todos'
                ? 'bg-[#C4A47C] text-white shadow-sm font-semibold'
                : 'bg-white border border-[#E6E2DC] text-[#7A7065] hover:border-[#C4A47C] hover:text-[#2E2A25]'
            }`}
          >
            Todos os Serviços
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2 rounded-full text-xs font-medium tracking-wide transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#C4A47C] text-white shadow-sm font-semibold'
                  : 'bg-white border border-[#E6E2DC] text-[#7A7065] hover:border-[#C4A47C] hover:text-[#2E2A25]'
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 pb-20">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-[#7A7065]">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#C4A47C] border-t-transparent mb-4" />
            <p className="font-serif text-lg text-[#2E2A25]">Carregando tabela atualizada da Feegow...</p>
            <p className="text-xs text-[#7A7065] mt-1">Conectando aos servidores de agendamento em tempo real</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="max-w-xl mx-auto bg-white border border-red-200 rounded-2xl p-8 text-center shadow-sm my-12">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
              !
            </div>
            <h3 className="text-lg font-serif text-[#2E2A25] font-medium">Não foi possível carregar a Feegow</h3>
            <p className="text-xs text-[#7A7065] mt-2 mb-6">{error}</p>
            <button
              onClick={refetch}
              className="px-6 py-2.5 bg-[#C4A47C] text-white rounded-full text-xs font-semibold hover:bg-[#B5966D] transition-colors shadow-xs"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Content Displayed by Categories */}
        {!loading && !error && (
          <div className="space-y-14">
            {CATEGORIES.map((cat) => {
              if (selectedCategory !== 'todos' && selectedCategory !== cat.id) {
                return null
              }

              const catProcs = categorizedProcedures[cat.id] || []
              if (catProcs.length === 0 && selectedCategory !== 'todos') {
                return (
                  <div key={cat.id} className="text-center py-12 bg-white rounded-2xl border border-[#E6E2DC]">
                    <p className="text-sm text-[#7A7065]">Nenhum procedimento encontrado para esta categoria com a busca atual.</p>
                  </div>
                )
              }

              if (catProcs.length === 0) return null

              return (
                <section key={cat.id} className="space-y-6">
                  {/* Category Banner */}
                  <div className="border-b border-[#E6E2DC] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#C4A47C] font-semibold">
                        Categoria
                      </span>
                      <h3 className="text-2xl md:text-3xl font-serif text-[#2E2A25] font-medium">
                        {cat.title}
                      </h3>
                      <p className="text-xs text-[#7A7065] mt-0.5">{cat.subtitle}</p>
                    </div>
                    <span className="text-xs bg-[#C4A47C]/10 text-[#C4A47C] font-bold px-3 py-1 rounded-full w-fit">
                      {catProcs.length} procedimento{catProcs.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {catProcs.map((proc) => (
                      <div
                        key={proc.procedimento_id}
                        className="bg-white border border-[#E6E2DC] hover:border-[#C4A47C] rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xs hover:shadow-md group"
                      >
                        <div>
                          {/* Top Card Info */}
                          <div className="flex justify-between items-start gap-3 mb-3">
                            <h4 className="font-serif text-lg font-medium text-[#2E2A25] group-hover:text-[#C4A47C] transition-colors leading-snug">
                              {proc.nome}
                            </h4>
                            <span className="text-[10px] bg-[#F5F4F0] border border-[#E6E2DC] text-[#7A7065] px-2.5 py-1 rounded-full whitespace-nowrap font-medium flex-shrink-0">
                              {proc.displayDuration}
                            </span>
                          </div>

                          <p className="text-xs text-[#7A7065] leading-relaxed mb-6">
                            {proc.description}
                          </p>
                        </div>

                        {/* Price & Actions */}
                        <div className="pt-4 border-t border-[#F2EFEB] flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[9px] uppercase tracking-widest text-[#7A7065] block font-semibold">
                              Valor Oficial
                            </span>
                            <span className="text-lg font-serif font-bold text-[#2E2A25]">
                              {proc.formattedPrice}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {onSelectBooking && (
                              <button
                                onClick={() => onSelectBooking(proc)}
                                className="p-2 rounded-full border border-[#C4A47C] text-[#C4A47C] hover:bg-[#C4A47C] hover:text-white transition-colors cursor-pointer text-xs font-semibold"
                                title="Agendar Online na Agenda"
                              >
                                📅
                              </button>
                            )}

                            <a
                              href={getWhatsAppLink(proc)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#C4A47C] hover:bg-[#B5966D] text-white transition-all text-xs font-medium shadow-xs"
                            >
                              <span>Agendar WhatsApp</span>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}

            {/* Outros / Procedimentos Sem Categoria Específica */}
            {(selectedCategory === 'todos' || selectedCategory === 'outros') && (categorizedProcedures.outros || []).length > 0 && (
              <section className="space-y-6 pt-6">
                <div className="border-b border-[#E6E2DC] pb-4 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#C4A47C] font-semibold">
                      Outros Atendimentos
                    </span>
                    <h3 className="text-2xl md:text-3xl font-serif text-[#2E2A25] font-medium">
                      Procedimentos Diversos
                    </h3>
                  </div>
                  <span className="text-xs bg-[#C4A47C]/10 text-[#C4A47C] font-bold px-3 py-1 rounded-full">
                    {categorizedProcedures.outros.length} itens
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorizedProcedures.outros.map((proc) => (
                    <div
                      key={proc.procedimento_id}
                      className="bg-white border border-[#E6E2DC] hover:border-[#C4A47C] rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xs hover:shadow-md group"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-3 mb-3">
                          <h4 className="font-serif text-lg font-medium text-[#2E2A25] group-hover:text-[#C4A47C] transition-colors leading-snug">
                            {proc.nome}
                          </h4>
                          <span className="text-[10px] bg-[#F5F4F0] border border-[#E6E2DC] text-[#7A7065] px-2.5 py-1 rounded-full whitespace-nowrap font-medium flex-shrink-0">
                            {proc.displayDuration}
                          </span>
                        </div>
                        <p className="text-xs text-[#7A7065] leading-relaxed mb-6">
                          {proc.description}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-[#F2EFEB] flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-[#7A7065] block font-semibold">
                            Valor Oficial
                          </span>
                          <span className="text-lg font-serif font-bold text-[#2E2A25]">
                            {proc.formattedPrice}
                          </span>
                        </div>

                        <a
                          href={getWhatsAppLink(proc)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#C4A47C] hover:bg-[#B5966D] text-white transition-all text-xs font-medium shadow-xs"
                        >
                          <span>Agendar WhatsApp</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Footer Editorial */}
      <footer className="bg-white border-t border-[#E6E2DC] py-10 px-6 text-center text-xs text-[#7A7065]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={salvusLogo} alt="Salvus" className="h-8 object-contain" />
            <span className="font-serif text-[#2E2A25] font-medium">Clínica Salvus</span>
          </div>
          <p>© {new Date().getFullYear()} Clínica Salvus. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
