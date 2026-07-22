import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

export default function WaitlistModal({ isOpen, onClose, selectedDate }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateStr, setDateStr] = useState(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [turno, setTurno] = useState('qualquer')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim() || !phone.trim() || !dateStr) {
      setError('Por favor, preencha o seu nome, WhatsApp e a data desejada.')
      return
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setError('Por favor, informe um número de WhatsApp válido com DDD.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const webhookUrl = 'https://rossiatmz.com.br/n8n/webhook/fila-espera-inscricao'
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: name.trim(),
          telefone: cleanPhone,
          data_desejada: dateStr,
          turno
        })
      })

      if (!response.ok) {
        throw new Error('Falha ao registrar na Fila de Espera.')
      }

      setSuccess(true)
    } catch (err) {
      console.error(err)
      setError('Não foi possível registrar seu nome na fila no momento. Tente novamente em instantes.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#faf9f6] border border-[#e6e2dc] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#7a7065] hover:text-[#2e2a25] text-xl font-serif cursor-pointer"
          >
            ✕
          </button>

          {!success ? (
            <>
              <div className="text-center mb-6">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#c5a059]">Clínica Salvus</span>
                <h3 className="text-2xl font-serif text-[#2e2a25] mt-1">Entrar na Fila de Espera ⚡</h3>
                <p className="text-xs text-[#7a7065] mt-2 leading-relaxed">
                  Se um horário vagar para o dia selecionado, avisaremos você instantaneamente pelo WhatsApp!
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7a7065] mb-1">
                    Seu Nome Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Camila Silva"
                    className="w-full px-4 py-2.5 bg-white border border-[#e6e2dc] rounded-lg text-sm text-[#2e2a25] focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7a7065] mb-1">
                    Seu WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-2.5 bg-white border border-[#e6e2dc] rounded-lg text-sm text-[#2e2a25] focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7a7065] mb-1">
                    Data Desejada
                  </label>
                  <input
                    type="date"
                    value={dateStr}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#e6e2dc] rounded-lg text-sm text-[#2e2a25] focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7a7065] mb-1">
                    Turno de Preferência
                  </label>
                  <select
                    value={turno}
                    onChange={(e) => setTurno(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#e6e2dc] rounded-lg text-sm text-[#2e2a25] focus:outline-none focus:border-[#c5a059]"
                  >
                    <option value="qualquer">Qualquer Horário</option>
                    <option value="manha">Manhã (08:00 - 12:00)</option>
                    <option value="tarde">Tarde (12:00 - 18:00)</option>
                    <option value="noite">Noite (18:00 - 20:30)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 bg-[#c5a059] hover:bg-[#b08e4f] text-white font-bold py-3 px-6 rounded-lg uppercase tracking-widest text-xs transition-colors shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Registrando...' : 'Confirmar Inscrição na Fila'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-[#c5a059]/10 text-[#c5a059] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                ✓
              </div>
              <h3 className="text-xl font-serif text-[#2e2a25] font-semibold">Inscrição Confirmada!</h3>
              <p className="text-xs text-[#7a7065] mt-2 leading-relaxed">
                Você foi cadastrado(a) com sucesso na nossa Fila de Espera para a data selecionada. Assim que surgir uma Vaga Relâmpago, avisaremos você direto pelo WhatsApp!
              </p>
              <button
                onClick={onClose}
                className="mt-6 bg-[#c5a059] text-white font-bold py-2.5 px-6 rounded-lg text-xs tracking-wider uppercase"
              >
                Fechar
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
