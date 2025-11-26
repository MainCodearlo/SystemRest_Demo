import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Settings, Receipt, History } from 'lucide-react'; // Agrega los iconos que uses

const MobileNav = () => {
  const menuItems = [
    { path: '/', name: 'Mesas', icon: <LayoutGrid size={24} /> },
    { path: '/caja', name: 'Caja', icon: <Receipt size={24} /> },
    // { path: '/historial', name: 'Historial', icon: <History size={24} /> },
    { path: '/config', name: 'Ajustes', icon: <Settings size={24} /> },
  ];

  return (
    // Solo visible en móvil (block), oculto en PC (md:hidden)
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 md:hidden z-50 pb-safe">
      <nav className="flex justify-around items-center">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-colors ${
                isActive
                  ? 'text-blue-600' // Color activo
                  : 'text-slate-400 hover:text-slate-600' // Color inactivo
              }`
            }
          >
            {/* El icono cambia si está activo (relleno o normal) */}
            <div className={`p-2 rounded-xl ${
                 // Opcional: fondo suave si está activo
                 // isActive ? 'bg-blue-50' : '' 
                 ''
            }`}>
                {item.icon}
            </div>
            <span className="text-[10px] font-bold">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default MobileNav;