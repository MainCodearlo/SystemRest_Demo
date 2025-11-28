import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, DollarSign, Utensils, Coffee, ArrowRightLeft, X, Loader2, AlertCircle } from 'lucide-react';
import OrderModal from '../components/OrderModal';
import { supabase } from '../supabase/client';

const Mesas = () => {
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeZone, setActiveZone] = useState("");
  const [selectedTable, setSelectedTable] = useState(null);
  const [moveSource, setMoveSource] = useState(null);
  
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // 1. Carga inicial
    fetchInitialData();

    // 2. SUSCRIPCIÓN REALTIME (ESTRATEGIA ROBUSTA)
    // Escucha CUALQUIER cambio en mesas o zonas y recarga los datos frescos.
    const channel = supabase
      .channel('sala_realtime_v2') // Nombre del canal único
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'mesas' }, 
        (payload) => {
          console.log("Cambio detectado en mesas:", payload);
          fetchInitialData(); // <--- RECARGA AUTOMÁTICA AL DETECTAR CAMBIOS
        }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'zonas' }, 
        () => fetchInitialData()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🟢 Conectado al tiempo real de mesas');
        }
      });

    // 3. Reloj para el tiempo transcurrido
    const timerInterval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timerInterval);
    };
  }, []);

  const fetchInitialData = async () => {
    // No activamos setLoading(true) aquí para evitar parpadeos molestos
    // solo actualizamos los datos silenciosamente.
    const { data: tData } = await supabase.from('mesas').select('*').order('id', { ascending: true });
    const { data: zData } = await supabase.from('zonas').select('*').order('name', { ascending: true });
    
    if (tData) setTables(tData);
    if (zData) setZones(zData);

    // Configurar zona por defecto si no hay una activa
    if (zData && zData.length > 0) {
        setActiveZone(prev => {
            const exists = zData.find(z => z.name === prev);
            return exists ? prev : zData[0].name;
        });
    }
    
    // Solo quitamos el loading la primera vez
    setLoading(false);
  };

  const handleMoveTable = async (targetTable) => {
    if (!moveSource) return;
    try {
      // Copiar estado
      const { error: errorTarget } = await supabase.from('mesas').update({
          status: moveSource.status,
          time_opened: moveSource.time_opened,
          total: moveSource.total,
          current_order_id: moveSource.current_order_id
        }).eq('id', targetTable.id);

      if (errorTarget) throw errorTarget;

      // Limpiar origen
      const { error: errorSource } = await supabase.from('mesas').update({ 
            status: 'libre', time_opened: null, total: 0, current_order_id: null 
        }).eq('id', moveSource.id);

      if (errorSource) throw errorSource;
      
      setMoveSource(null);
      // fetchInitialData() se ejecutará automáticamente gracias al Realtime
    } catch (error) {
      alert("Error al mover la mesa: " + error.message);
    }
  };

  const calculateTime = (timestamp) => {
    if (!timestamp) return '00:00:00';
    const start = new Date(timestamp);
    const diff = now - start; 
    if (diff < 0) return '00:00:00';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'ocupada': return 'bg-red-50 border-red-200 shadow-red-100';
      case 'pagando': return 'bg-orange-50 border-orange-200 shadow-orange-100';
      default: return 'bg-white border-slate-200 hover:border-blue-300 shadow-sm';
    }
  };

  const filteredTables = tables.filter(t => t.zone === activeZone);

  if (loading && tables.length === 0) return <div className="h-screen flex items-center justify-center bg-[#F3F4F6]"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>;

  return (
    <div>
      <Header title="Control de Mesas" />
      
      {/* Modal con callback para forzar actualización local inmediata también */}
      <OrderModal 
        isOpen={!!selectedTable} 
        onClose={() => setSelectedTable(null)} 
        table={selectedTable} 
        onUpdate={fetchInitialData} 
      />

      <AnimatePresence>
        {moveSource && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoveSource(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"/>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 z-10">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-slate-800">Mover {moveSource.name} a...</h3><button onClick={() => setMoveSource(null)}><X className="text-slate-400"/></button></div>
              <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                {tables.filter(t => t.status === 'libre' && t.id !== moveSource.id).map(t => (
                  <button key={t.id} onClick={() => handleMoveTable(t)} className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-500 transition-all active:scale-95">
                    <span className="font-bold text-slate-700">{t.name}</span><span className="text-xs text-slate-400">{t.zone}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {zones.length === 0 && <div className="px-4 py-2 bg-yellow-50 text-yellow-600 rounded-xl text-sm font-bold border border-yellow-200 flex items-center gap-2"><AlertCircle size={16}/> Crea zonas en Ajustes.</div>}
        {zones.map(zone => (
          <button key={zone.id} onClick={() => setActiveZone(zone.name)} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeZone === zone.name ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
            {zone.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 pb-24">
        {filteredTables.map((table) => (
          <motion.div key={table.id} onClick={() => setSelectedTable(table)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`relative p-4 sm:p-5 rounded-3xl border cursor-pointer flex flex-col justify-between min-h-[140px] group transition-all ${getStatusStyles(table.status)}`}>
            {table.status !== 'libre' && (
              <button onClick={(e) => { e.stopPropagation(); setMoveSource(table); }} className="absolute top-3 right-3 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-400 shadow-sm z-10 transition-colors"><ArrowRightLeft size={14} /></button>
            )}
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col gap-1">
                 <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${table.status === 'libre' ? 'bg-slate-100 text-slate-600' : table.status === 'ocupada' ? 'bg-red-100 text-red-500' : 'bg-orange-100 text-orange-500'}`}>
                      {table.zone.toLowerCase().includes('barra') ? <Coffee size={16}/> : <Utensils size={16}/>}
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">{table.name}</h3>
                 </div>
                 <div className="flex items-center gap-1 text-slate-400 text-xs font-medium pl-1"><Users size={12} /><span>{table.seats} P.</span></div>
              </div>
            </div>
            
            <div className="mb-3">
               {table.status === 'ocupada' && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Ocupada</span>}
               {table.status === 'pagando' && <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Pagando</span>}
               {table.status === 'libre' && <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Libre</span>}
            </div>

            {table.status !== 'libre' ? (
              <div className="space-y-1 bg-white/60 p-2 rounded-xl border border-black/5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={10}/> Tiempo</span>
                  <span className="font-mono font-bold text-slate-700 tracking-tight">{calculateTime(table.time_opened)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><DollarSign size={10}/> Total</span>
                  <span className="font-mono font-bold text-slate-900">S/{parseFloat(table.total || 0).toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center"><span className="text-xs text-slate-400 font-medium border border-dashed border-slate-300 px-2 py-1 rounded-lg bg-slate-50/50">Disponible</span></div>
            )}
          </motion.div>
        ))}
        {filteredTables.length === 0 && zones.length > 0 && <div className="col-span-full py-10 text-center text-slate-400">Zona vacía.</div>}
      </div>
    </div>
  );
};

export default Mesas;