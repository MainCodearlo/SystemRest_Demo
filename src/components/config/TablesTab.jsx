import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { Plus, Edit, Trash2, Loader2, Save, X, LayoutGrid, MapPin } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

const TablesTab = () => {
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [saving, setSaving] = useState(false);

  const [newZoneName, setNewZoneName] = useState("");
  const [addingZone, setAddingZone] = useState(false);

  const [itemToDelete, setItemToDelete] = useState(null);

  const [formData, setFormData] = useState({ name: '', zone: '', seats: 4 });

  useEffect(() => {
    fetchData();
    
    // Mantenemos la suscripción como respaldo para cambios de OTROS usuarios
    const channel = supabase
      .channel('config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zonas' }, () => fetchData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchData = async () => {
    // No ponemos setLoading(true) aquí para evitar parpadeos molestos en actualizaciones rápidas
    const { data: tData } = await supabase.from('mesas').select('*').order('id', { ascending: true });
    const { data: zData } = await supabase.from('zonas').select('*').order('name', { ascending: true });
    
    if (tData) setTables(tData);
    if (zData) setZones(zData);
    setLoading(false);
  };

  // --- AGREGAR ZONA (CORREGIDO: Actualización Inmediata) ---
  const handleAddZone = async (e) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;
    setAddingZone(true);
    try {
        const { error } = await supabase.from('zonas').insert([{ name: newZoneName.trim() }]);
        if(error) throw error;
        
        setNewZoneName("");
        await fetchData(); // <--- ESTA LÍNEA FUERZA LA ACTUALIZACIÓN VISUAL AL INSTANTE
    } catch (error) {
        alert("Error al crear zona: " + error.message);
    } finally {
        setAddingZone(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    
    try {
        if (itemToDelete.type === 'mesa') {
            const { error } = await supabase.from('mesas').delete().eq('id', itemToDelete.id);
            if (error) throw error;
        } 
        else if (itemToDelete.type === 'zona') {
            // 1. Intentar borrar mesas de la zona
            const { error: errorMesas } = await supabase.from('mesas').delete().eq('zone', itemToDelete.name);
            if (errorMesas) {
                 alert("⚠️ No se pudo borrar la zona porque tiene mesas con ventas activas o historial protegido.");
                 return;
            }
            // 2. Borrar la zona
            const { error: errorZona } = await supabase.from('zonas').delete().eq('id', itemToDelete.id);
            if (errorZona) throw errorZona;
        }
        
        await fetchData(); // <--- ACTUALIZACIÓN INMEDIATA TRAS BORRAR
    } catch (error) {
        console.error(error);
        alert("Error al eliminar.");
    } finally {
        setItemToDelete(null);
    }
  };

  const openModal = (table = null) => {
    setEditingTable(table);
    if (table) {
      setFormData({ name: table.name, zone: table.zone, seats: table.seats });
    } else {
      const nextNum = tables.length + 1;
      const defaultZone = zones.length > 0 ? zones[0].name : '';
      setFormData({ name: `Mesa ${nextNum}`, zone: defaultZone, seats: 4 });
    }
    setShowModal(true);
  };

  const handleSaveTable = async (e) => {
    e.preventDefault();
    if (!formData.zone) return alert("Crea una zona primero.");
    setSaving(true);
    try {
      const data = { name: formData.name, zone: formData.zone, seats: parseInt(formData.seats) };
      
      if (editingTable) {
        await supabase.from('mesas').update(data).eq('id', editingTable.id);
      } else {
        await supabase.from('mesas').insert([data]);
      }
      
      setShowModal(false);
      await fetchData(); // <--- ACTUALIZACIÓN INMEDIATA TRAS GUARDAR MESA
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <ConfirmModal 
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDeleteItem}
        title={`¿Eliminar ${itemToDelete?.type === 'zona' ? 'Zona' : 'Mesa'}?`}
        message={itemToDelete?.type === 'zona' 
            ? `Se intentarán borrar TODAS las mesas de "${itemToDelete?.name}".` 
            : `Vas a eliminar "${itemToDelete?.name}".`}
      />

      {/* GESTIÓN DE ZONAS */}
      <div className="mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-200">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><MapPin size={18}/> Zonas / Ambientes</h3>
        <div className="flex flex-wrap gap-3 items-center">
            {zones.map(z => (
                <div key={z.id} className="group flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                    <span className="font-bold text-sm text-slate-600">{z.name}</span>
                    <button 
                        onClick={() => setItemToDelete({ type: 'zona', id: z.id, name: z.name })}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                        title="Borrar zona"
                    >
                        <X size={14}/>
                    </button>
                </div>
            ))}
            <form onSubmit={handleAddZone} className="flex items-center gap-2">
                <input 
                    type="text" 
                    placeholder="Nueva Zona..." 
                    className="w-32 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-blue-500"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                />
                <button type="submit" disabled={addingZone || !newZoneName} className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {addingZone ? <Loader2 className="animate-spin" size={14}/> : <Plus size={16}/>}
                </button>
            </form>
        </div>
      </div>

      {/* GESTIÓN DE MESAS */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-slate-700">Mesas</h3>
        <button onClick={() => openModal()} disabled={zones.length === 0} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-900 shadow-lg shadow-slate-300 transition-all disabled:opacity-50">
          <Plus size={18} /> Nueva Mesa
        </button>
      </div>

      {loading && tables.length === 0 ? (
        <div className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Cargando...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map(t => (
            <div key={t.id} className="group relative bg-white border border-slate-200 p-4 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-800 text-lg">{t.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(t)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit size={14}/></button>
                    <button onClick={() => setItemToDelete({ type: 'mesa', id: t.id, name: t.name })} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={14}/></button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                 <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate max-w-[100px]">{t.zone}</span>
              </div>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                 <LayoutGrid size={12}/> {t.seats} sillas
              </div>
            </div>
          ))}
          {tables.length === 0 && <div className="col-span-full text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">No hay mesas.</div>}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">{editingTable ? 'Editar' : 'Crear'}</h3>
                    <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveTable} className="p-6 space-y-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Nombre</label><input type="text" autoFocus required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/></div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Zona</label>
                        <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})}>
                            <option value="" disabled>-- Selecciona --</option>
                            {zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                        </select>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Sillas</label><input type="number" min="1" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={formData.seats} onChange={e => setFormData({...formData, seats: e.target.value})}/></div>
                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 shadow-lg">{saving ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default TablesTab;