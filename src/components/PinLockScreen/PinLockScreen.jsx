import React, { useState } from 'react'
import salvusLogo from '../../assets/logo_transparent.png'

export default function PinLockScreen({ onAuthenticate }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handlePinSubmit = (e) => {
    e.preventDefault()
    const expectedPin = import.meta.env.VITE_ADMIN_PIN || '2408'
    if (pin === expectedPin) {
      setError(false)
      onAuthenticate()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-6 font-sans">
      <div className="w-full max-w-md bg-[#111111] border border-[#333] rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
        <img src={salvusLogo} alt="Clínica Salvus" className="h-20 mb-6 object-contain" />
        
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#c5a059]">
          Acesso Restrito • Equipe Salvus
        </span>
        <h2 className="text-2xl font-serif mt-1 text-white">Agenda do Dia</h2>
        <p className="text-xs text-gray-400 mt-2 mb-6">
          Digite o PIN de acesso da recepção para visualizar a agenda de pacientes.
        </p>

        {error && (
          <div className="w-full mb-4 p-3 bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-semibold rounded-lg">
            PIN incorreto. Tente novamente.
          </div>
        )}

        <form onSubmit={handlePinSubmit} className="w-full space-y-4">
          <div>
            <input
              type="password"
              maxLength={6}
              autoFocus
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full text-center text-2xl tracking-[0.5em] py-3 bg-[#1a1a1a] border border-[#333] focus:border-[#c5a059] text-white rounded-xl outline-none transition-colors font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#c5a059] hover:bg-[#b08e4f] text-black font-bold rounded-xl transition-all shadow-md cursor-pointer text-sm"
          >
            Acessar Agenda
          </button>
        </form>

        <p className="mt-6 text-[10px] text-gray-500">
          Dúvidas? Entre em contato com a administração da clínica.
        </p>
      </div>
    </div>
  )
}
