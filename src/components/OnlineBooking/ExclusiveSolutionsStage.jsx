import React from 'react'

const SOLUTIONS = [
  {
    id: 'emagrecimento',
    title: 'Emagrecimento Inteligente',
    category: 'Corpo & Saúde',
    subtitle: 'Saúde Metabólica & Redução de Medidas',
    description: 'Protocolos médicos personalizados integrando avaliação metabólica, estratégias nutricionais e injetáveis para perda de peso saudável e sustentável.',
    icon: (
      <svg className="w-8 h-8 text-[#c5a059]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
  },
  {
    id: 'hipertrofia',
    title: 'Otimização de Performance',
    category: 'Corpo & Saúde',
    subtitle: 'Ganho Muscular & Energia',
    description: 'Suporte médico metabólico e terapias injetáveis para acelerar a recuperação muscular, maximizar o ganho de massa magra e elevar a disposição.',
    icon: (
      <svg className="w-8 h-8 text-[#c5a059]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    id: 'rejuvenescimento',
    title: 'Rejuvenescimento Facial',
    category: 'Face & Pele',
    subtitle: 'Harmonização & Suavização de Linhas',
    description: 'Protocolos preventivos e corretivos com Toxina Botulínica (Botox) e preenchedores de alta qualidade, garantindo resultados naturais e elegância facial.',
    icon: (
      <svg className="w-8 h-8 text-[#c5a059]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zM15 9.75c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zM9 14.25c1.5 1.5 4.5 1.5 6 0" />
      </svg>
    )
  },
  {
    id: 'firmeza-contorno',
    title: 'Firmeza & Contorno',
    category: 'Face & Pele',
    subtitle: 'Bioestimuladores de Colágeno',
    description: 'Tratamentos de alta performance que estimulam a produção natural de colágeno, devolvendo a firmeza, elasticidade e o contorno jovial da pele.',
    icon: (
      <svg className="w-8 h-8 text-[#c5a059]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    )
  },
  {
    id: 'estetica-intima',
    title: 'Saúde & Estética Íntima',
    category: 'Corpo & Saúde',
    subtitle: 'Bem-Estar & Rejuvenescimento Íntimo',
    description: 'Procedimentos médicos delicados, discretos e indolores focados no clareamento, rejuvenescimento e resgate do conforto e autoestima feminina.',
    icon: (
      <svg className="w-8 h-8 text-[#c5a059]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    )
  }
]

export default function ExclusiveSolutionsStage({ onBack, whatsappNumber = '5521971661665' }) {
  const getWhatsAppLink = (solution) => {
    const message = `Olá! Sou membro Wellhub e estava no agendamento online. Gostaria de saber mais sobre *${solution.title}* e como funciona a condição especial reservada.`
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
  }

  const categories = ['Corpo & Saúde', 'Face & Pele']

  return (
    <div className="w-full max-w-5xl px-4 py-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#c5a059]/40 text-[#2e2a25] hover:text-[#8c6d31] hover:border-[#c5a059] hover:bg-[#faf8f5] shadow-xs hover:shadow-md transition-all font-medium text-sm mb-6 cursor-pointer group"
      >
        <svg className="w-4 h-4 text-[#c5a059] group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Voltar</span>
      </button>

      <header className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Clínica Salvus • Medicina & Estética Avançada</span>
        <h2 className="text-3xl md:text-4xl font-serif mt-2 text-[#2e2a25]">Tratamentos Exclusivos</h2>
        <p className="text-xs md:text-sm text-[#7a7065] mt-2 max-w-xl mx-auto leading-relaxed">
          Além das sessões de bem-estar do seu plano, nossa equipe médica oferece protocolos integrativos focados na sua transformação.
        </p>
      </header>

      {/* Banner de Condição Especial Wellhub */}
      <div className="mb-10 bg-gradient-to-r from-[#faf7f0] via-[#f5efe2] to-[#faf7f0] border border-[#c5a059]/40 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/30 flex items-center justify-center flex-shrink-0 text-xl">
            ✨
          </div>
          <div>
            <h3 className="font-serif font-semibold text-sm md:text-base text-[#2e2a25]">
              Benefício Reservado aos Pacientes Wellhub
            </h3>
            <p className="text-xs text-[#7a7065] mt-0.5 leading-relaxed">
              Pacientes com agendamento Wellhub possuem uma condição especial reservada em nossos procedimentos médicos e estéticos avançados. Fale com nossa equipe de concierge para consultar disponibilidade e resgatar.
            </p>
          </div>
        </div>
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá! Sou membro Wellhub e gostaria de consultar a condição especial reservada para os procedimentos médicos e estéticos da Clínica Salvus.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap px-5 py-2.5 rounded-full bg-[#c5a059] hover:bg-[#b08e4f] text-white text-xs font-semibold tracking-wide transition-all shadow-xs hover:shadow flex items-center gap-2 cursor-pointer"
        >
          <span>Consultar no WhatsApp</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>

      {/* Lista por Categorias */}
      <div className="space-y-10">
        {categories.map((cat) => {
          const categorySolutions = SOLUTIONS.filter((s) => s.category === cat)
          if (categorySolutions.length === 0) return null

          return (
            <div key={cat} className="space-y-4">
              <div className="border-b border-[#e6e2dc] pb-2 flex items-center justify-between">
                <h3 className="text-xl font-serif text-[#2e2a25] font-medium">{cat}</h3>
                <span className="text-[10px] uppercase tracking-widest text-[#c5a059] font-semibold">
                  Protocolos Avançados
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categorySolutions.map((solution) => (
                  <div
                    key={solution.id}
                    className="bg-white border border-[#e6e2dc] hover:border-[#c5a059] rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xs hover:shadow-md group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <span className="text-[10px] text-[#c5a059] font-semibold uppercase tracking-wider block">
                            {solution.subtitle}
                          </span>
                          <h4 className="font-serif text-lg font-medium text-[#2e2a25] group-hover:text-[#c5a059] transition-colors mt-0.5">
                            {solution.title}
                          </h4>
                        </div>
                        <div className="p-2 rounded-xl bg-[#faf9f6] border border-[#e6e2dc] group-hover:border-[#c5a059]/40 transition-colors flex-shrink-0">
                          {solution.icon}
                        </div>
                      </div>

                      <p className="text-xs text-[#7a7065] leading-relaxed mb-6">
                        {solution.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#f2efeb] flex items-center justify-between gap-3">
                      <span className="text-[11px] text-[#a29382] font-medium">
                        Atendimento com Especialistas
                      </span>

                      <a
                        href={getWhatsAppLink(solution)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2e2a25] hover:bg-[#c5a059] text-white transition-all text-xs font-medium cursor-pointer shadow-xs"
                      >
                        <span>Saber Mais no WhatsApp</span>
                        <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
