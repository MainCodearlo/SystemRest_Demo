import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, DollarSign, Utensils, Coffee, ArrowRightLeft, X, Loader2 } from 'lucide-react';
import OrderModal from '../components/OrderModal';
import { supabase } from '../supabase/client';

const Mesas = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState("Salón Principal");
  const [selectedTable, setSelectedTable] = useState(null);
  const [moveSource, setMoveSource] = useState(null);
  
  // ESTADO RELOJ: Actualiza la UI cada segundo
  const [now, setNow] = useState(new Date());

  const zones = ["Salón Principal", "Terraza", "Barra"];

  // --- 1. CARGAR DATOS Y ACTIVAR REALTIME ---
  useEffect(() => {
    fetchTables();

    // Suscripción a cambios en la base de datos
    const channel = supabase
      .channel('tabla_mesas_live')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'mesas' }, 
        (payload) => {
          fetchTables(); // Recargar datos inmediatamente
        }
      )
      .subscribe();

    // CAMBIO CRÍTICO: Actualizar cada 1 segundo (1000ms) para ver los segundos
    const timerInterval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timerInterval);
    };
  }, []);

  const fetchTables = async () => {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) console.error("Error al cargar mesas:", error);
    else {
      setTables(data);
      setLoading(false);
    }
  };

  // --- 2. LOGICA DE TRASLADO ---
  const handleMoveTable = async (targetTable) => {
    if (!moveSource) return;

    try {
      // A. Copiar datos a la mesa destino
      const { error: errorTarget } = await supabase
        .from('mesas')
        .update({
          status: moveSource.status,
          time_opened: moveSource.time_opened,
          total: moveSource.total,
          current_order_id: moveSource.current_order_id
        })
        .eq('id', targetTable.id);

      if (errorTarget) throw errorTarget;

      // B. Limpiar la mesa origen
      const { error: errorSource } = await supabase
        .from('mesas')
        .update({ 
            status: 'libre', 
            time_opened: null, 
            total: 0, 
            current_order_id: null 
        })
        .eq('id', moveSource.id);

      if (errorSource) throw errorSource;

      setMoveSource(null);

    } catch (error) {
      console.error("Error en traslado:", error);
      alert("Hubo un error al trasladar la mesa.");
    }
  };

  const filteredTables = tables.filter(t => t.zone === activeZone);

  // --- 3. CALCULADORA DE TIEMPO (FORMATO HH:MM:SS) ---
  const calculateTime = (timestamp) => {
    if (!timestamp) return '00:00:00';
    
    const start = new Date(timestamp);
    const diff = now - start; // Diferencia en milisegundos

    if (diff < 0) return '00:00:00';

    // Matemáticas para obtener horas, minutos y segundos
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    // Formatear con ceros a la izquierda (01:05:09)
    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');

    return `${h}:${m}:${s}`;
  };

  // Estilos dinámicos
  const getStatusStyles = (status) => {
    switch (status) {
      case 'ocupada': return 'bg-red-50 border-red-200';
      case 'pagando': return 'bg-orange-50 border-orange-200';
      default: return 'bg-white border-slate-200 hover:border-blue-300 shadow-sm';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ocupada': return <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Ocupada</span>;
      case 'pagando': return <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Pagando</span>;
      default: return <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Libre</span>;
    }
  };

  if (loading) {
    return (
        <div className="h-screen flex items-center justify-center bg-[#F3F4F6]">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-slate-400 text-sm font-medium">Cargando salón...</p>
            </div>
        </div>
    );
  }

  return (
    <div>
      <Header title="Control de Mesas" />

      {/* MODAL DE PEDIDOS */}
      <OrderModal 
        isOpen={!!selectedTable} 
        onClose={() => setSelectedTable(null)} 
        table={selectedTable}
      />

      {/* MODAL DE TRASLADO */}
      <AnimatePresence>
        {moveSource && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMoveSource(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 z-10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">Mover {moveSource.name} a...</h3>
                <button onClick={() => setMoveSource(null)}><X className="text-slate-400"/></button>
              </div>
              
              <p className="text-sm text-slate-500 mb-4">Selecciona una mesa libre:</p>
              
              <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                {tables.filter(t => t.status === 'libre').map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleMoveTable(t)}
                    className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-500 transition-all active:scale-95"
                  >
                    <span className="font-bold text-slate-700">{t.name}</span>
                    <span className="text-xs text-slate-400">{t.zone}</span>
                  </button>
                ))}
              </div>
              {tables.filter(t => t.status === 'libre').length === 0 && (
                <p className="text-center text-red-400 text-sm py-4 font-medium">No hay mesas libres disponibles.</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ZONAS */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {zones.map(zone => (
          <button
            key={zone}
            onClick={() => setActiveZone(zone)}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeZone === zone
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {zone}
          </button>
        ))}
      </div>

      {/* GRID DE MESAS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 pb-24">
        {filteredTables.map((table) => (
          <motion.div
            key={table.id}
            onClick={() => setSelectedTable(table)} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-4 sm:p-5 rounded-3xl border cursor-pointer flex flex-col justify-between min-h-[140px] group transition-all ${getStatusStyles(table.status)}`}
          >
            
            {/* Botón Traslado */}
            {table.status !== 'libre' && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveSource(table);
                }}
                className="absolute top-3 right-3 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-400 shadow-sm z-10 transition-colors"
              >
                <ArrowRightLeft size={14} />
              </button>
            )}

            {/* Header Mesa */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col gap-1">
                 <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg ${
                        table.status === 'libre' ? 'bg-slate-100 text-slate-600' : 
                        table.status === 'ocupada' ? 'bg-red-100 text-red-500' : 'bg-orange-100 text-orange-500'
                    }`}>
                      {table.zone === 'Barra' ? <Coffee size={16}/> : <Utensils size={16}/>}
                    </div>
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg">{table.name}</h3>
                 </div>
                 <div className="flex items-center gap-1 text-slate-400 text-[10px] sm:text-xs font-medium pl-1">
                    <Users size={12} />
                    <span>{table.seats} P.</span>
                 </div>
              </div>
            </div>

            <div className="mb-3">
               {getStatusBadge(table.status)}
            </div>

            {/* Info Detallada con Tiempo Real */}
            {table.status !== 'libre' ? (
              <div className="space-y-1 bg-white/60 p-2 rounded-xl border border-black/5">
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={10}/> Tiempo</span>
                  {/* AQUÍ SE MUESTRA EL NUEVO FORMATO */}
                  <span className="font-mono font-bold text-slate-700 tracking-tight">
                    {table.time_opened ? calculateTime(table.time_opened) : '00:00:00'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
                  <span className="flex items-center gap-1"><DollarSign size={10}/> Total</span>
                  <span className="font-mono font-bold text-slate-900">S/{parseFloat(table.total || 0).toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                 <span className="text-xs text-slate-400 font-medium border border-dashed border-slate-300 px-2 py-1 rounded-lg bg-slate-50/50">Disponible</span>
              </div>
            )}

          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Mesas;