import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { Plus, Edit, Trash2, Loader2, Save, X, Printer, Wifi, WifiOff, CheckCircle2 } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

const PrintersTab = () => {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState(null);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Delete State
  const [printerToDelete, setPrinterToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    port: 9100,
    tipo: 'ticket'
  });

  useEffect(() => {
    fetchPrinters();
  }, []);

  const fetchPrinters = async () => {
    setLoading(true);
    const { data } = await supabase.from('impresoras').select('*').order('id');
    setPrinters(data || []);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPrinter) {
        await supabase.from('impresoras').update(formData).eq('id', editingPrinter.id);
      } else {
        await supabase.from('impresoras').insert([formData]);
      }
      setShowModal(false);
      fetchPrinters();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!printerToDelete) return;
    await supabase.from('impresoras').delete().eq('id', printerToDelete.id);
    setPrinterToDelete(null);
    fetchPrinters();
  };

  const openModal = (printer = null) => {
    setEditingPrinter(printer);
    if (printer) {
      setFormData({ name: printer.name, ip_address: printer.ip_address, port: printer.port,NJtipo: printer.tipo });
    } else {
      setFormData({ name: '', ip_address: '192.168.1.', port: 9100, tipo: 'cocina' });
    }
    setShowModal(true);
  };

  // --- SIMULACIÓN DE PRUEBA DE CONEXIÓN ---
  const testPrint = async (printer) => {
    setTestingId(printer.id);
    // AQUÍ ES DONDE LLAMARÍAMOS AL "PUENTE" LOCAL
    // Por ahora simulamos un ping de red
    setTimeout(() => {
        alert(`🖨️ Enviando prueba a ${printer.ip_address}:${printer.port}...\n\n(Para que esto imprima real, necesitas el 'Bridge' local corriendo)`);
        setTestingId(null);
    }, 1500);
  };

  return (
    <div className="p-6">
      <ConfirmModal 
        isOpen={!!printerToDelete} onClose={() => setPrinterToDelete(null)} onConfirm={confirmDelete}
        title="¿Borrar Impresora?" message={`Se eliminará la configuración de "${printerToDelete?.name}".`}
      />

      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-slate-700">Impresoras de Red (TCP/IP)</h3>
        <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200">
          <Plus size={18} /> Nueva Impresora
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Buscando dispositivos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {printers.map(p => (
            <div key={p.id} className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-blue-300 transition-all shadow-sm group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${p.tipo === 'cocina' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        <Printer size={20}/>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">{p.name}</h4>
                        <p className="text-xs text-slate-400 uppercase font-bold">{p.tipo}</p>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(p)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Edit size={16}/></button>
                    <button onClick={() => setPrinterToDelete(p)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center mb-4 border border-slate-100">
                <div className="flex items-center gap-2 text-sm font-mono text-slate-600">
                    <Wifi size={14} className="text-green-500"/>
                    {p.ip_address} <span className="text-slate-300">|</span> :{p.port}
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              </div>

              <button 
                onClick={() => testPrint(p)}
                disabled={testingId === p.id}
                className="w-full py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {testingId === p.id ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
                PROBAR CONEXIÓN
              </button>
            </div>
          ))}
          {printers.length === 0 && (
            <div className="col-span-3 p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                <WifiOff size={48} className="mx-auto mb-2 opacity-20"/>
                <p>No hay impresoras configuradas</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">{editingPrinter ? 'Editar Impresora' : 'Nueva Impresora'}</h3>
                    <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-blue-500 font-bold text-slate-700" placeholder="Ej. Cocina Caliente"/>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Dirección IP</label>
                            <input type="text" required value={formData.ip_address} onChange={e => setFormData({...formData, ip_address: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-blue-500 font-mono text-slate-700" placeholder="192.168.1.xxx"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Puerto</label>
                            <input type="number" required value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-blue-500 font-mono text-slate-700"/>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Uso</label>
                        <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-blue-500 text-slate-700">
                            <option value="ticket">Caja / Ticket Cliente</option>
                            <option value="cocina">Comanda Cocina / Bar</option>
                        </select>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg flex justify-center items-center gap-2">
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

export default PrintersTab;