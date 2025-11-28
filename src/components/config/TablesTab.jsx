import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { Plus, Edit, Trash2, Loader2, Save, X, LayoutGrid } from 'lucide-react';
import ConfirmModal from '../ConfirmModal'; // Reutilizamos tu modal de confirmación

const TablesTab = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados del Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [saving, setSaving] = useState(false);

  // Estado para eliminar
  const [tableToDelete, setTableToDelete] = useState(null);

  // Formulario
  const [formData, setFormData] = useState({
    name: '',
    zone: 'Salón Principal',
    seats: 4
  });

  const zones = ["Salón Principal", "Terraza", "Barra", "VIP"];

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    const { data } = await supabase.from('mesas').select('*').order('id', { ascending: true });
    setTables(data || []);
    setLoading(false);
  };

  // --- ABRIR MODAL ---
  const openModal = (table = null) => {
    setEditingTable(table);
    if (table) {
      setFormData({ name: table.name, zone: table.zone, seats: table.seats });
    } else {
      // Generar nombre automático sugerido (Ej: Mesa X)
      const nextNum = tables.length + 1;
      setFormData({ name: `Mesa ${nextNum}`, zone: 'Salón Principal', seats: 4 });
    }
    setShowModal(true);
  };

  // --- GUARDAR (INSERT/UPDATE) ---
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const tableData = {
        name: formData.name,
        zone: formData.zone,
        seats: parseInt(formData.seats)
      };

      if (editingTable) {
        const { error } = await supabase.from('mesas').update(tableData).eq('id', editingTable.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mesas').insert([tableData]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchTables();
    } catch (error) {
      alert("Error al guardar mesa: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- ELIMINAR ---
  const confirmDelete = async () => {
    if (!tableToDelete) return;
    try {
      const { error } = await supabase.from('mesas').delete().eq('id', tableToDelete.id);
      if (error) throw error;
      fetchTables();
    } catch (error) {
      alert("No se puede borrar: Probablemente tiene ventas asociadas.");
    } finally {
      setTableToDelete(null);
    }
  };

  return (
    <div className="p-6">
      {/* Modal de Confirmación de Borrado */}
      <ConfirmModal 
        isOpen={!!tableToDelete}
        onClose={() => setTableToDelete(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar Mesa?"
        message={`Vas a eliminar la "${tableToDelete?.name}". Si tiene historial de ventas, esto podría fallar.`}
      />

      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-slate-700">Distribución de Mesas</h3>
        <button 
          onClick={() => openModal()} 
          className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-900 shadow-lg shadow-slate-300 transition-all"
        >
          <Plus size={18} /> Nueva Mesa
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Cargando mesas...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map(t => (
            <div key={t.id} className="group relative bg-white border border-slate-200 p-4 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-800 text-lg">{t.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(t)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit size={14}/></button>
                    <button onClick={() => setTableToDelete(t)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={14}/></button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                 <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.zone}</span>
              </div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                 <LayoutGrid size={12}/> Capacidad: {t.seats} pers.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL CREAR/EDITAR MESA --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">{editingTable ? 'Editar Mesa' : 'Nueva Mesa'}</h3>
                    <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                        <input type="text" autoFocus required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-blue-500 font-bold text-slate-700" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Mesa 5"/>
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Zona</label>
                        <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-blue-500 text-slate-700" value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})}>
                            {zones.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Asientos</label>
                        <input type="number" min="1" max="20" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-blue-500 font-bold text-slate-700" value={formData.seats} onChange={e => setFormData({...formData, seats: e.target.value})}/>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 shadow-lg flex justify-center items-center gap-2 disabled:opacity-70">
                            {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default TablesTab;