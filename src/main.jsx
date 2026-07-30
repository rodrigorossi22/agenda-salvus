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
        <Route path="/homologacao" element={<OnlineBooking isHomologation={true} />} />
        <Route path="/admin" element={<AdminRoute><App /></AdminRoute>} />
        <Route path="/menu" element={<ServiceMenu />} />
        <Route path="/servicos" element={<ServiceMenu />} />
        <Route path="/tabela" element={<ServiceMenu />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
