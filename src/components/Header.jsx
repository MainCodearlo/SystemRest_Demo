import React from 'react';
import { Search, Bell } from 'lucide-react';

const Header = ({ title }) => {
  const date = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <header className="flex justify-between items-center mb-8 pt-2">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
        <p className="text-slate-500 capitalize mt-1">{date}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Barra de búsqueda estilo píldora */}
        <div className="hidden md:flex items-center bg-white px-4 py-2.5 rounded-full border border-slate-200 shadow-sm w-64 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search size={18} className="text-slate-400 mr-2" />
          <input 
            type="text" 
            placeholder="Buscar orden..." 
            className="bg-transparent outline-none text-sm w-full text-slate-600 placeholder:text-slate-400"
          />
        </div>

        {/* Botón de Notificaciones */}
        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm text-slate-600 hover:text-blue-600 hover:shadow-md transition-all relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;