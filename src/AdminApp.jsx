import React, { useState } from 'react';
import Login from './components/Admin/Login';
import Dashboard from './components/Admin/Dashboard';

export default function AdminApp() {
    // Simple state-based auth
    const [clinicId, setClinicId] = useState(() => localStorage.getItem('@SalvusAdmin:clinicId'));

    const handleLogin = (id) => {
        localStorage.setItem('@SalvusAdmin:clinicId', id);
        setClinicId(id);
    };

    const handleLogout = () => {
        localStorage.removeItem('@SalvusAdmin:clinicId');
        setClinicId(null);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {!clinicId ? (
                <Login onLogin={handleLogin} />
            ) : (
                <Dashboard clinicId={clinicId} onLogout={handleLogout} />
            )}
        </div>
    );
}
