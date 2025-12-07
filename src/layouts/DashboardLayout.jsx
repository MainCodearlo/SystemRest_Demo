import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav'; // <--- Importar la barra móvil
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      
      {/* 1. Sidebar de Escritorio (Se oculta solo en móvil gracias al CSS que pusimos en Paso 1) */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* 2. Barra de Navegación Móvil (Se muestra solo en móvil) */}
      <MobileNav />

      {/* 3. Contenido Principal */}
      <main 
        className={`flex-1 p-4 md:p-6 transition-all duration-300 
          /* MÓVIL: Sin margen izquierdo, pero con padding abajo para la barra */
          ml-0 pb-24 
          /* ESCRITORIO (md): Margen izquierdo según si el sidebar está abierto/cerrado */
          ${isSidebarOpen ? 'md:ml-80' : 'md:ml-28'}
        `}
      >
        <Outlet /> 
      </main>

    </div>
  );
};

export default DashboardLayout;