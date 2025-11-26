import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase/client';
import { Loader2 } from 'lucide-react';

// Layouts y Páginas
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login'; // <--- Importamos el Login
import Mesas from './pages/Mesas';
import Cocina from './pages/Cocina';
import Barra from './pages/Barra';
import Caja from './pages/Caja';
import Config from './pages/Config';

// --- COMPONENTE DE RUTA PROTEGIDA ---
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Pantalla de carga mientras verifica si estás logueado
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 w-10 h-10"/>
      </div>
    );
  }

  // Si no hay sesión, mandar al login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Si hay sesión, mostrar el contenido (Dashboard)
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* RUTA PUBLICA: LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* RUTAS PROTEGIDAS: EL SISTEMA */}
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Mesas />} />
          <Route path="cocina" element={<Cocina />} />
          <Route path="barra" element={<Barra />} />
          <Route path="caja" element={<Caja />} />
          <Route path="config" element={<Config />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;