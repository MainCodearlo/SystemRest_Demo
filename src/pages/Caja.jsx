import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { supabase } from '../supabase/client';
import { DollarSign, CreditCard, Smartphone, Calendar, TrendingUp, Loader2 } from 'lucide-react';

const Caja = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ efectivo: 0, tarjeta: 0, yape: 0, total: 0 });

  useEffect(() => {
    fetchDailySales();
  }, []);

  const fetchDailySales = async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('ordenes')
      .select(`id, created_at, total, metodo_pago, mesa_id, mesas ( name )`)
      .eq('estado', 'pagado')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando caja:', error);
    } else {
      setMovements(data || []);
      calculateTotals(data || []);
    }
    setLoading(false);
  };

  const calculateTotals = (data) => {
    const newTotals = data.reduce(
      (acc, curr) => {
        const amount = parseFloat(curr.total);
        acc.total += amount;
        if (curr.metodo_pago === 'efectivo') acc.efectivo += amount;
        if (curr.metodo_pago === 'tarjeta') acc.tarjeta += amount;
        if (curr.metodo_pago === 'yape') acc.yape += amount;
        return acc;
      },
      { efectivo: 0, tarjeta: 0, yape: 0, total: 0 }
    );
    setTotals(newTotals);
  };

  const StatCard = ({ title, amount, icon: Icon, color }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-slate-800">S/{amount.toFixed(2)}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <Header title="Caja y Movimientos" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Día" amount={totals.total} icon={TrendingUp} color="bg-blue-100 text-blue-600" />
        <StatCard title="Efectivo" amount={totals.efectivo} icon={DollarSign} color="bg-green-100 text-green-600" />
        <StatCard title="Tarjeta" amount={totals.tarjeta} icon={CreditCard} color="bg-indigo-100 text-indigo-600" />
        <StatCard title="Yape / Plin" amount={totals.yape} icon={Smartphone} color="bg-purple-100 text-purple-600" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Calendar size={18} className="text-slate-400"/> Transacciones de Hoy
          </h3>
          <button onClick={fetchDailySales} className="text-sm text-blue-600 hover:underline font-medium">Actualizar</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="p-4">Hora</th>
                <th className="p-4">N° Orden</th>
                <th className="p-4">Mesa</th>
                <th className="p-4">Método</th>
                <th className="p-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400"><div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin"/> Cargando movimientos...</div></td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay ventas registradas hoy.</td></tr>
              ) : (
                movements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600 font-mono text-sm">{new Date(mov.created_at).toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="p-4 text-slate-800 font-bold text-sm">#{mov.id.toString().slice(0,8)}...</td>
                    <td className="p-4 text-slate-600 text-sm">Mesa {mov.mesas?.name || 'Unknown'}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${mov.metodo_pago === 'efectivo' ? 'bg-green-100 text-green-700' : mov.metodo_pago === 'tarjeta' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>{mov.metodo_pago}</span></td>
                    <td className="p-4 text-right font-bold text-slate-800">S/{parseFloat(mov.total).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Caja;