# Agenda Access Control & Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect the internal daily schedule (`App.jsx`) behind a PIN authentication screen at `/admin`, redirect root traffic (`/`) to the public booking portal (`/agendamento_online`), and guarantee zero modifications to `/agendamento_online`.

**Architecture:** Create an `AdminRoute.jsx` wrapper and a `PinLockScreen.jsx` component in `Feegow/Agenda Salvus`. Update `main.jsx` routes so root redirects to `/agendamento_online` and `/admin` displays the PIN-protected internal agenda.

**Tech Stack:** React 19, React Router DOM, Vite, TailwindCSS, date-fns.

---

### Task 1: Create `PinLockScreen.jsx` Component

**Files:**
- Create: `Feegow/Agenda Salvus/src/components/PinLockScreen/PinLockScreen.jsx`

- [ ] **Step 1: Create the PinLockScreen component**

```jsx
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
```

- [ ] **Step 2: Verify file creation**

Verify that `Feegow/Agenda Salvus/src/components/PinLockScreen/PinLockScreen.jsx` exists and has no syntax errors.

---

### Task 2: Create `AdminRoute.jsx` Wrapper Component

**Files:**
- Create: `Feegow/Agenda Salvus/src/components/AdminRoute/AdminRoute.jsx`

- [ ] **Step 1: Create the AdminRoute wrapper component**

```jsx
import React, { useState } from 'react'
import PinLockScreen from '../PinLockScreen/PinLockScreen'

export default function AdminRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('salvus_admin_auth') === 'true'
  })

  const handleAuthenticate = () => {
    localStorage.setItem('salvus_admin_auth', 'true')
    setIsAuthenticated(true)
  }

  if (!isAuthenticated) {
    return <PinLockScreen onAuthenticate={handleAuthenticate} />
  }

  return children
}
```

- [ ] **Step 2: Verify file creation**

Verify that `Feegow/Agenda Salvus/src/components/AdminRoute/AdminRoute.jsx` exists and imports `PinLockScreen`.

---

### Task 3: Update `main.jsx` Routes & Redirections

**Files:**
- Modify: `Feegow/Agenda Salvus/src/main.jsx`

- [ ] **Step 1: Update main.jsx routing configuration**

Modify `src/main.jsx` to:
1. Import `Navigate` from `react-router-dom`.
2. Import `AdminRoute` from `./components/AdminRoute/AdminRoute`.
3. Set route `/` to `<Navigate to="/agendamento_online" replace />`.
4. Set route `/admin` to `<AdminRoute><App /></AdminRoute>`.
5. Keep `/agendamento_online` set to `<OnlineBooking />` untouched.

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import OnlineBooking from './components/OnlineBooking/OnlineBooking.jsx'
import { ServiceMenu } from './components/ServiceMenu/ServiceMenu.jsx'
import AdminRoute from './components/AdminRoute/AdminRoute.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/agendamento_online" replace />} />
        <Route path="/agendamento_online" element={<OnlineBooking />} />
        <Route path="/admin" element={<AdminRoute><App /></AdminRoute>} />
        <Route path="/menu" element={<ServiceMenu />} />
        <Route path="/servicos" element={<ServiceMenu />} />
        <Route path="/tabela" element={<ServiceMenu />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 2: Run build test**

Run: `npm run build` inside `Feegow/Agenda Salvus`
Expected: Build passes with zero errors.

---

### Task 4: Add Lock/Logout Button to `App.jsx` Topbar

**Files:**
- Modify: `Feegow/Agenda Salvus/src/App.jsx`

- [ ] **Step 1: Add Lock button in header of App.jsx**

In `App.jsx`, add a button next to `📋 Menu de Serviços & Valores` in the header bar:

```jsx
<button
  onClick={() => {
    localStorage.removeItem('salvus_admin_auth')
    window.location.reload()
  }}
  className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
>
  🔒 Trancar Agenda
</button>
```

- [ ] **Step 2: Run build test**

Run: `npm run build` inside `Feegow/Agenda Salvus`
Expected: PASS

---

### Task 5: Build, Test & Deploy to Vercel

**Files:**
- None (deployment step)

- [ ] **Step 1: Run production build locally**

Run: `npm run build` in `Feegow/Agenda Salvus`

- [ ] **Step 2: Deploy to Vercel production**

Run: `npx vercel deploy --prod --yes` in `Feegow/Agenda Salvus`
Expected: Production deployment URL ready (`agenda-salvus.vercel.app`).
