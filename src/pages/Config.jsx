import React, { useState } from 'react';
import Header from '../components/Header';
import { Package, LayoutGrid, Printer } from 'lucide-react';

// Importamos los componentes modulares
import ProductsTab from '../components/config/ProductsTab';
import TablesTab from '../components/config/TablesTab';

const Config = () => {
  const [activeTab, setActiveTab] = useState('productos');
  
  return (
    <div className="max-w-6xl mx-auto pb-20">
      <Header title="Ajustes del Sistema" />
      
      {/* NAVEGACIÓN DE PESTAÑAS */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1 overflow-x-auto">
        <TabButton 
          id="productos" 
          label="Productos" 
          icon={Package} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
        <TabButton 
          id="mesas" 
          label="Mesas y Zonas" 
          icon={LayoutGrid} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
        <TabButton 
          id="impresoras" 
          label="Impresoras" 
          icon={Printer} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
      </div>

      {/* CONTENIDO DE PESTAÑAS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px]">
        {activeTab === 'productos' && <ProductsTab />}
        {activeTab === 'mesas' && <TablesTab />}
        {activeTab === 'impresoras' && (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Printer size={40}/>
            </div>
            <h3 className="text-lg font-bold text-slate-500">Configuración de Impresoras</h3>
            <p className="text-sm text-slate-400">Este módulo se implementará próximamente.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente simple para los botones
const TabButton = ({ id, label, icon: Icon, activeTab, setActiveTab }) => (
  <button 
    onClick={() => setActiveTab(id)} 
    className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold text-sm transition-all whitespace-nowrap 
      ${activeTab === id 
        ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      }`}
  >
    <Icon size={18} /> {label}
  </button>
);

export default Config;