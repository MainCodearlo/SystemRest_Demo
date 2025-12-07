import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { 
  LayoutGrid, 
  Settings, 
  Receipt, 
  Printer, 
  Coffee 
} from 'lucide-react';

const MobileNav = () => {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', session.user.id)
          .single();
        
        setRole(data?.rol || 'mozo');
      }
    };
    fetchRole();
  }, []);

  // Definimos los menús con sus permisos
  const menuItems = [
    { 
      path: '/', 
      name: 'Mesas', 
      icon: <LayoutGrid size={24} />, 
      allowed: ['admin', 'mozo'] 
    },
    { 
      path: '/barra', 
      name: 'Barra', 
      icon: <Coffee size={24} />, 
      allowed: ['admin', 'mozo', 'cocina'] 
    },
    { 
      path: '/cocina', 
      name: 'Cocina', 
      icon: <Printer size={24} />, 
      allowed: ['admin', 'cocina'] 
    },
    { 
      path: '/caja', 
      name: 'Caja', 
      icon: <Receipt size={24} />, 
      allowed: ['admin'] 
    },
    { 
      path: '/config', 
      name: 'Ajustes', 
      icon: <Settings size={24} />, 
      allowed: ['admin'] 
    },
  ];

  // Filtramos
  const visibleItems = menuItems.filter(item => role && item.allowed.includes(role));

  if (!role) return null; // No mostrar nada hasta cargar el rol

  return (
    // Solo visible en móvil (block), oculto en PC (md:hidden)
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 md:hidden z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <nav className="flex justify-around items-center">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-600 bg-blue-50' // Activo
                  : 'text-slate-400 hover:text-slate-600' // Inactivo
              }`
            }
          >
            {item.icon}
            <span className="text-[10px] font-bold">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default MobileNav;