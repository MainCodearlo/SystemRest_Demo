import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, ChefHat, Utensils } from 'lucide-react';

const Cocina = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('cocina_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes' },
        (payload) => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('ordenes')
      .select(`
        id, created_at, estado, mesas ( name ),
        orden_items ( id, nombre_producto, quantity:cantidad, precio:precio_unitario )
      `)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });

    if (error) console.error("Error cocina:", error);
    else setOrders(data || []);
    setLoading(false);
  };

  const handleCompleteOrder = async (orderId) => {
    const { error } = await supabase.from('ordenes').update({ estado: 'servido' }).eq('id', orderId);
    if (error) alert("Error al completar");
    else setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const OrderCard = ({ order }) => {
    const [elapsed, setElapsed] = useState("");
    useEffect(() => {
      const updateTimer = () => {
        const diff = new Date() - new Date(order.created_at);
        setElapsed(`${Math.floor(diff / 60000)} min`);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }, [order.created_at]);

    return (
      <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                {order.mesas?.name.length < 3 ? order.mesas?.name : <Utensils size={18}/>}
            </div>
            <div>
                <h3 className="font-bold text-slate-800 leading-tight">Mesa {order.mesas?.name}</h3>
                <span className="text-xs text-slate-400 font-mono">#{order.id.toString().slice(0,8)}</span>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${parseInt(elapsed) > 15 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-700'}`}>
            <Clock size={14}/> {elapsed}
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto max-h-[300px]">
           <ul className="space-y-3">
             {order.orden_items.map((item) => (
               <li key={item.id} className="flex gap-3 items-start">
                 <span className="font-bold text-lg text-slate-700 w-6 text-right">{item.quantity}</span>
                 <div className="flex-1 border-b border-slate-50 pb-2">
                    <p className="font-bold text-slate-800 text-sm leading-tight">{item.nombre_producto}</p>
                 </div>
               </li>
             ))}
           </ul>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100">
            <button onClick={() => handleCompleteOrder(order.id)} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg">
                <CheckCircle2 size={20}/> Despachar
            </button>
        </div>
      </motion.div>
    );
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-3">
             <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600"><ChefHat size={32} /></div>
             <div><h1 className="text-2xl font-bold text-slate-800">Cocina</h1><p className="text-slate-500 text-sm">Pendientes: <strong>{orders.length}</strong></p></div>
         </div>
      </div>
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
            <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4"><CheckCircle2 size={48} className="text-slate-400"/></div>
            <h2 className="text-xl font-bold text-slate-500">Todo limpio, Chef.</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>{orders.map(order => <OrderCard key={order.id} order={order} />)}</AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Cocina;