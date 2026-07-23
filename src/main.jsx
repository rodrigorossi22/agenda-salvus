import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import OnlineBooking from './components/OnlineBooking/OnlineBooking.jsx'
import { ServiceMenu } from './components/ServiceMenu/ServiceMenu.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/agendamento_online" element={<OnlineBooking />} />
        <Route path="/menu" element={<ServiceMenu />} />
        <Route path="/servicos" element={<ServiceMenu />} />
        <Route path="/tabela" element={<ServiceMenu />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
