import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { 
  LayoutGrid, 
  Settings, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  UtensilsCrossed, 
  MoreVertical,
  Receipt 
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };
  
  const menuItems = [
    { path: '/', name: 'Salón / Mesas', icon: <LayoutGrid size={20} /> },
    { path: '/caja', name: 'Caja', icon: <Receipt size={20} /> },
    { path: '/config', name: 'Ajustes', icon: <Settings size={20} /> },
  ];

  return (
    <div className={`hidden md:flex fixed left-4 top-4 bottom-4 bg-white border border-slate-200 flex-col transition-all duration-300 z-50 shadow-xl rounded-3xl overflow-hidden ${isOpen ? 'w-72' : 'w-20'}`}>
      
      {/* 1. HEADER */}
      <div className="h-20 flex items-center justify-between px-5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="min-w-[40px] h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200">
            <UtensilsCrossed size={20} />
          </div>
          <div className={`flex flex-col transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
             <span className="font-bold text-lg text-slate-800 leading-tight">RestoSystem</span>
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">POS</span>
          </div>
        </div>
        <button onClick={toggleSidebar} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* 2. BUSCADOR */}
      <div className={`px-4 mb-6 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar..." className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"/>
        </div>
      </div>

      {/* 3. MENU */}
      <div className="flex-1 px-3 overflow-y-auto">
        <nav className="space-y-2">
            {menuItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl transition-all group font-medium ${isActive ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${!isOpen && 'justify-center'}`}>
                <span className={!isOpen ? "" : ""}>{item.icon}</span>
                {isOpen && <span className="text-sm">{item.name}</span>}
            </NavLink>
            ))}
        </nav>
      </div>

      {/* 4. FOOTER / LOGOUT */}
      <div className="p-4 mt-auto">
        <button onClick={handleLogout} className={`w-full flex items-center p-2 rounded-2xl border border-transparent hover:border-red-100 hover:bg-red-50 transition-all cursor-pointer group ${isOpen ? 'gap-3' : 'justify-center'}`} title="Cerrar Sesión">
            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-red-200 transition-colors"/>
            {isOpen && (
                <div className="flex-1 overflow-hidden text-left">
                    <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-red-600 transition-colors">Cerrar Sesión</h4>
                    <p className="text-xs text-slate-500 truncate">Administrador</p>
                </div>
            )}
            {isOpen && <MoreVertical size={16} className="text-slate-400 group-hover:text-red-400" />}
        </button>
      </div>

    </div>
  );
};

export default Sidebar;