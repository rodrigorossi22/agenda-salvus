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
