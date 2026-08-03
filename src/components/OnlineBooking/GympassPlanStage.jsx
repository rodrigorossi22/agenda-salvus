import React, { useState } from 'react'
import { motion } from 'framer-motion'

export default function GympassPlanStage({ onConfirmDiamond, onBack }) {
  const [showOffer, setShowOffer] = useState(false)
  const whatsappUrl = `https://wa.me/5511949872408?text=${encodeURIComponent(
    'Olá! Sou membro Wellhub e gostaria de saber mais sobre a condição especial para atendimento particular na Clínica Salvus.'
  )}`

  return (
    <div className="w-full max-w-md px-4 py-8">
      <header className="mb-6 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#c5a059]">Comunicado Importante</span>
        <h2 className="text-2xl font-serif mt-2 text-[#2e2a25]">Validação de Plano Wellhub</h2>
      </header>

      {!showOffer ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-[#faf8f3] border border-[#c5a059]/40 rounded-xl p-5 shadow-sm text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">⚠️</span>
              <h3 className="font-semibold text-xs uppercase tracking-wider text-[#2e2a25]">Alteração de Regras na Plataforma</h3>
            </div>
            <p className="text-xs text-[#5c5449] leading-relaxed">
              Devido a uma alteração nas regras operacionais realizada <strong>inteiramente pelo próprio Wellhub (Gympass) e sem aviso prévio</strong>, a Clínica Salvus passa a aceitar para agendamentos online exclusivamente os membros do plano <strong>Diamond+</strong>.
            </p>
          </div>

          <p className="text-xs font-medium text-[#7a7065] text-center pt-1 mb-3">Confirme a categoria do seu plano para prosseguir:</p>

          <button
            onClick={onConfirmDiamond}
            className="w-full text-left bg-gradient-to-r from-[#c5a059] to-[#b08e4f] text-white hover:opacity-95 rounded-xl p-4 transition-all duration-300 group cursor-pointer shadow-md flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/80 block">Plano Aceito</span>
              <span className="font-semibold text-sm">Sim, meu plano é o Diamond+</span>
            </div>
            <svg className="w-5 h-5 text-white/90 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => setShowOffer(true)}
            className="w-full text-left bg-white hover:bg-[#faf8f3] border border-[#e6e2dc] hover:border-[#c5a059]/60 rounded-xl p-4 transition-all duration-300 group cursor-pointer shadow-sm flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-widest text-[#a29382] block">Outras Categorias</span>
              <span className="font-medium text-xs text-[#2e2a25] group-hover:text-[#c5a059] transition-colors">Possuo outro plano Wellhub</span>
            </div>
            <svg className="w-4 h-4 text-[#a29382] group-hover:text-[#c5a059] transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button onClick={onBack} className="w-full text-center text-xs text-[#7a7065] hover:text-[#2e2a25] pt-2 transition-colors cursor-pointer">
            ← Voltar ao início
          </button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-[#faf8f3] border border-[#c5a059]/60 rounded-xl p-5 shadow-sm text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#c5a059] block mb-1">Condição Especial Exclusiva</span>
            <h3 className="font-serif text-lg text-[#2e2a25] mb-2">Atendimento Particular Salvus</h3>
            <p className="text-xs text-[#5c5449] leading-relaxed mb-4">
              Pensando em você que já é membro Wellhub, preparamos uma <strong>condição especial e exclusiva</strong> para que possa realizar seus atendimentos em nossa clínica na modalidade particular.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs rounded-lg py-3 px-4 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
            >
              <span>💬</span> Garantir Condição Especial no WhatsApp
            </a>
          </div>

          <button onClick={() => setShowOffer(false)} className="w-full text-center text-xs text-[#7a7065] hover:text-[#2e2a25] pt-2 transition-colors cursor-pointer">
            ← Voltar para opção de planos
          </button>
        </motion.div>
      )}
    </div>
  )
}
