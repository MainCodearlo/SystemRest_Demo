import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { supabase } from '../supabase/client';
import { Package, LayoutGrid, Printer, Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';

const Config = () => {
  const [activeTab, setActiveTab] = useState('productos');
  
  return (
    <div className="max-w-6xl mx-auto">
      <Header title="Ajustes del Sistema" />
      
      {/* TABS DE NAVEGACIÓN */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1">
        <TabButton id="productos" label="Productos" icon={Package} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton id="mesas" label="Mesas y Zonas" icon={LayoutGrid} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton id="impresoras" label="Impresoras" icon={Printer} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* CONTENIDO */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px]">
        {activeTab === 'productos' && <ProductosTab />}
        {activeTab === 'mesas' && <MesasTab />}
        {activeTab === 'impresoras' && <div className="p-8 text-center text-slate-400">Configuración de impresoras locales (Pendiente)</div>}
      </div>
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---

const TabButton = ({ id, label, icon: Icon, activeTab, setActiveTab }) => (
  <button 
    onClick={() => setActiveTab(id)}
    className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold text-sm transition-all ${
      activeTab === id 
      ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
    }`}
  >
    <Icon size={18} /> {label}
  </button>
);

// SUB-COMPONENTE: GESTIÓN DE PRODUCTOS
const ProductosTab = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('productos').select('*, categorias(name)').order('name');
    setProducts(data || []);
    setLoading(false);
  };

  // Función stub para eliminar (se puede conectar luego)
  const handleDelete = async (id) => {
    if(!confirm("¿Borrar producto?")) return;
    await supabase.from('productos').delete().eq('id', id);
    fetchProducts();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-slate-700">Inventario de Productos</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700">
          <Plus size={16} /> Nuevo Producto
        </button>
      </div>

      {loading ? <div className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/>Cargando...</div> : (
        <div className="overflow-x-auto border rounded-xl border-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="p-3">Imagen</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Precio</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden">
                       {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">N/A</div>}
                    </div>
                  </td>
                  <td className="p-3 font-bold text-slate-700">{p.name}</td>
                  <td className="p-3 text-slate-500">{p.categorias?.name || '-'}</td>
                  <td className="p-3 font-mono">S/{p.price.toFixed(2)}</td>
                  <td className="p-3 text-right">
                    <button className="p-2 text-slate-400 hover:text-blue-600"><Edit size={16}/></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// SUB-COMPONENTE: GESTIÓN DE MESAS
const MesasTab = () => {
  const [tables, setTables] = useState([]);
  
  useEffect(() => {
    const fetchTables = async () => {
      const { data } = await supabase.from('mesas').select('*').order('id');
      setTables(data || []);
    };
    fetchTables();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-slate-700">Distribución de Mesas</h3>
        <button className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-900">
          <Plus size={16} /> Nueva Mesa
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tables.map(t => (
            <div key={t.id} className="p-4 border border-slate-200 rounded-xl flex flex-col gap-2 relative group hover:border-blue-400 transition-colors">
                <span className="font-bold text-slate-800">{t.name}</span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded self-start">{t.zone}</span>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 text-slate-400 hover:text-blue-600"><Edit size={14}/></button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Config;