import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, Coffee, Beer, Wine, AlertCircle } from 'lucide-react';

const Barra = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    // SUSCRIPCIÓN REALTIME
    const channel = supabase
      .channel('barra_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes' },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    // 1. Traemos las órdenes pendientes con sus items y el producto asociado (para ver la categoría)
    const { data, error } = await supabase
      .from('ordenes')
      .select(`
        id, 
        created_at, 
        estado, 
        mesas ( name ),
        orden_items ( 
            id, 
            nombre_producto, 
            quantity:cantidad, 
            producto_id,
            productos ( category_id ) 
        )
      `)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error barra:", error);
    } else {
      // 2. FILTRADO JAVASCRIPT: Nos quedamos SOLO con items que sean 'bebidas'
      const drinksOnlyOrders = data.map(order => {
        // Filtramos los items dentro de la orden
        const drinkItems = order.orden_items.filter(item => 
            // Verificamos si la categoría es 'bebidas' (asegúrate que en tu BD sea 'bebidas')
            item.productos?.category_id === 'bebidas' || 
            item.productos?.category_id === 'tragos' || 
            item.productos?.category_id === 'cervezas'
        );
        
        // Retornamos la orden pero con la lista de items filtrada
        return { ...order, orden_items: drinkItems };
      })
      // 3. Si una orden se quedó sin items (porque era pura comida), la ocultamos
      .filter(order => order.orden_items.length > 0);

      setOrders(drinksOnlyOrders);
    }
    setLoading(false);
  };

  const handleDispatchDrinks = async (orderId) => {
    // Nota: Al despachar, cambiamos el estado de la orden completa.
    // En un sistema más complejo, cambiaríamos el estado item por item.
    const { error } = await supabase
      .from('ordenes')
      .update({ estado: 'servido' })
      .eq('id', orderId);

    if (error) alert("Error al despachar");
    else fetchOrders();
  };

  // Componente de Tarjeta (Reutilizado visualmente de Cocina pero con estilo de Barra)
  const DrinkCard = ({ order }) => {
    const [elapsed, setElapsed] = useState("");

    useEffect(() => {
      const updateTimer = () => {
        const diff = new Date() - new Date(order.created_at);
        const minutes = Math.floor(diff / 60000);
        setElapsed(`${minutes} min`);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }, [order.created_at]);

    return (
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
      >
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-lg">
                {order.mesas?.name.slice(0,2)}
            </div>
            <div>
                <h3 className="font-bold leading-tight">Mesa {order.mesas?.name}</h3>
                <span className="text-xs text-slate-400 font-mono opacity-70">#{order.id.toString().slice(0,8)}</span>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${parseInt(elapsed) > 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-500 text-white'}`}>
            <Clock size={14}/> {elapsed}
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto max-h-[300px] bg-slate-50">
           <ul className="space-y-3">
             {order.orden_items.map((item) => (
               <li key={item.id} className="flex gap-3 items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                 <span className="font-bold text-xl text-indigo-600 w-8 text-center bg-indigo-50 rounded h-8 flex items-center justify-center">{item.quantity}</span>
                 <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm leading-tight">{item.nombre_producto}</p>
                 </div>
                 <Beer size={16} className="text-slate-300"/>
               </li>
             ))}
           </ul>
        </div>

        <div className="p-3 bg-white border-t border-slate-100">
            <button 
                onClick={() => handleDispatchDrinks(order.id)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200"
            >
                <CheckCircle2 size={20}/> Bebidas Listas
            </button>
        </div>
      </motion.div>
    );
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-3">
             <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                <Coffee size={32} />
             </div>
             <div>
                 <h1 className="text-2xl font-bold text-slate-800">Barra / Bebidas</h1>
                 <p className="text-slate-500 text-sm">Tickets pendientes: <strong>{orders.length}</strong></p>
             </div>
         </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
            <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                <Wine size={48} className="text-slate-400"/>
            </div>
            <h2 className="text-xl font-bold text-slate-500">Sin pedidos de bebida</h2>
            <p>La barra está tranquila.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
                {orders.map(order => (
                    <DrinkCard key={order.id} order={order} />
                ))}
            </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Barra;