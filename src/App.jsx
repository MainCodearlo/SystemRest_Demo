import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Mesas from './pages/Mesas';
import Cocina from './pages/Cocina';
import Barra from './pages/Barra';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Todas estas rutas usarán el DashboardLayout (con Sidebar) */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Mesas />} />       {/* Página Principal (Salón) */}
          <Route path="cocina" element={<Cocina />} />
          <Route path="barra" element={<Barra />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;