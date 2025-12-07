import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './supabase/client';
import { Loader2 } from 'lucide-react';

import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Mesas from './pages/Mesas';
import Cocina from './pages/Cocina';
import Barra from './pages/Barra';
import Caja from './pages/Caja';
import Config from './pages/Config';

const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSessionAndRole = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        if (currentSession) {
          const { data: profile, error } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', currentSession.user.id)
            .single();

          if (error || !profile) {
            setUserRole('mozo');
          } else {
            setUserRole(profile.rol);
          }
        }
      } catch (error) {
        console.error("Error auth:", error);
      } finally {
        setLoading(false);
      }
    };

    getSessionAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setSession(null);
        setUserRole(null);
        setLoading(false);
      } else {
        getSessionAndRole();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>;

  if (!session) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    if (userRole === 'cocina') return <Navigate to="/cocina" replace />;
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute allowedRoles={['admin', 'mozo', 'cocina']}><DashboardLayout /></ProtectedRoute>}>
          <Route path="/" element={<ProtectedRoute allowedRoles={['admin', 'mozo']}><Mesas /></ProtectedRoute>} />
          <Route path="barra" element={<ProtectedRoute allowedRoles={['admin', 'mozo']}><Barra /></ProtectedRoute>} />
          <Route path="cocina" element={<ProtectedRoute allowedRoles={['admin', 'cocina']}><Cocina /></ProtectedRoute>} />
          <Route path="caja" element={<ProtectedRoute allowedRoles={['admin']}><Caja /></ProtectedRoute>} />
          <Route path="config" element={<ProtectedRoute allowedRoles={['admin']}><Config /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;