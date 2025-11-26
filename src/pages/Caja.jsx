import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { supabase } from '../supabase/client';
import { 
  DollarSign, CreditCard, Smartphone, Calendar, TrendingUp, Loader2, 
  Lock, Unlock, PlusCircle, MinusCircle, Save, AlertTriangle, Printer 
} from 'lucide-react';

// --- FUNCIÓN DE IMPRESIÓN DE REPORTE DETALLADO ---
const printSessionReport = (totals, cashExpected, realCount, diff, salesDetail, userEmail = "Administrador") => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PE');
  const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  // Generamos el HTML de cada venta individual
  const salesRows = salesDetail.map(sale => {
    const timeSale = new Date(sale.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    
    // Lista de productos de esta mesa
    const itemsHtml = sale.orden_items.map(item => `
        <div style="display: flex; justify-content: space-between; padding-left: 10px; color: #555;">
            <span>${item.cantidad} x ${item.nombre_producto}</span>
            <span>${parseFloat(item.precio_unitario * item.cantidad).toFixed(2)}</span>
        </div>
    `).join('');

    return `
      <div style="margin-bottom: 8px; border-bottom: 1px dotted #ccc; padding-bottom: 4px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>Mesa: ${sale.mesas?.name || 'Barra'}</span>
            <span>${timeSale}</span>
        </div>
        <div style="font-size: 10px; color: #333; margin-bottom: 2px;">
            Ticket #${sale.id.toString().slice(0,8)} - ${sale.metodo_pago.toUpperCase()}
        </div>
        
        <div style="font-size: 10px; margin-bottom: 4px;">
            ${itemsHtml}
        </div>

        <div style="text-align: right; font-weight: bold;">
            Total: S/${parseFloat(sale.total).toFixed(2)}
        </div>
      </div>
    `;
  }).join('');

  const ticketContent = `
    <html>
      <head>
        <title>Reporte Detallado</title>
        <style>
          body { font-family: 'Courier New', monospace; width: 300px; font-size: 12px; margin: 0; padding: 5px; color: #000; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
          .title { font-size: 16px; font-weight: bold; margin: 5px 0; }
          .subtitle { font-size: 14px; font-weight: bold; margin: 15px 0 5px 0; border-bottom: 1px solid #000; display: block; text-transform: uppercase; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .total-row { display: flex; justify-content: space-between; margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px; font-weight: bold; font-size: 14px; }
          .footer { margin-top: 30px; border-top: 1px dashed #000; padding-top: 10px; text-align: center; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">REPORTE DE CIERRE</div>
          <div>Fecha: ${dateStr} - Hora: ${timeStr}</div>
          <div>Cajero: ${userEmail}</div>
        </div>

        <span class="subtitle">RESUMEN FINANCIERO</span>
        <div class="row"><span>Ventas Totales:</span> <span>S/${totals.totalVentas.toFixed(2)}</span></div>
        
        <span class="subtitle">DESGLOSE POR PAGO</span>
        <div class="row"><span>Efectivo:</span> <span>S/${totals.efectivo.toFixed(2)}</span></div>
        <div class="row"><span>Tarjeta:</span> <span>S/${totals.tarjeta.toFixed(2)}</span></div>
        <div class="row"><span>Yape / Plin:</span> <span>S/${totals.yape.toFixed(2)}</span></div>

        <span class="subtitle">ARQUEO DE EFECTIVO</span>
        <div class="row"><span>Base Inicial:</span> <span>S/${(totals.inicio || 0).toFixed(2)}</span></div>
        <div class="row"><span>(+) Ventas Efec.:</span> <span>S/${totals.efectivo.toFixed(2)}</span></div>
        <div class="row"><span>(+) Ingresos:</span> <span>S/${totals.ingresos.toFixed(2)}</span></div>
        <div class="row"><span>(-) Gastos:</span> <span>S/${totals.egresos.toFixed(2)}</span></div>
        
        <div class="total-row">
            <span>SISTEMA (TEÓRICO):</span> 
            <span>S/${cashExpected.toFixed(2)}</span>
        </div>
        
        ${realCount !== null ? `
        <div class="row" style="margin-top:5px;"><span>CONTEO REAL:</span> <span>S/${parseFloat(realCount).toFixed(2)}</span></div>
        <div class="row"><span>DIFERENCIA:</span> <span>S/${parseFloat(diff).toFixed(2)}</span></div>
        ` : ''}

        <span class="subtitle">DETALLE DE VENTAS</span>
        <div style="font-size: 11px;">
            ${salesRows}
        </div>

        <div class="footer">
          __________________________<br/>
          Firma del Responsable
        </div>
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(ticketContent);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 500);
};
// ---------------------------------------------------------------

const Caja = () => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null); 
  
  const [movements, setMovements] = useState([]);
  const [manualMovements, setManualMovements] = useState([]);
  
  const [totals, setTotals] = useState({ 
      efectivo: 0, 
      tarjeta: 0, 
      yape: 0, 
      totalVentas: 0, 
      ingresos: 0, 
      egresos: 0,
      inicio: 0
  });

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const [initialAmount, setInitialAmount] = useState('');
  const [moveForm, setMoveForm] = useState({ type: 'ingreso', amount: '', description: '' });
  const [closeAmount, setCloseAmount] = useState(''); 

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase
        .from('caja_sesiones')
        .select('*')
        .eq('estado', 'abierta')
        .maybeSingle();

      if (sessionData) {
        setSession(sessionData);
        await fetchSessionData(sessionData.id); 
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error("Error verificando sesión:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionData = async (sessionId) => {
    const { data: sessionInfo } = await supabase.from('caja_sesiones').select('created_at, monto_inicial').eq('id', sessionId).single();
    
    // --- AQUÍ ESTÁ LA MAGIA: Ahora traemos también 'orden_items' ---
    const { data: sales } = await supabase
      .from('ordenes')
      .select(`
        id, 
        created_at, 
        total, 
        metodo_pago, 
        mesas(name),
        orden_items ( nombre_producto, cantidad, precio_unitario ) 
      `)
      .eq('estado', 'pagado')
      .gte('created_at', sessionInfo.created_at) 
      .order('created_at', { ascending: false });

    const { data: manuals } = await supabase
      .from('caja_movimientos')
      .select('*')
      .eq('sesion_id', sessionId)
      .order('created_at', { ascending: false });

    setMovements(sales || []);
    setManualMovements(manuals || []);
    calculateTotals(sales || [], manuals || [], sessionInfo.monto_inicial);
  };

  const calculateTotals = (sales, manuals, startAmount) => {
    const t = { 
        efectivo: 0, tarjeta: 0, yape: 0, totalVentas: 0, 
        ingresos: 0, egresos: 0, inicio: parseFloat(startAmount) || 0 
    };

    sales.forEach(sale => {
        const amt = parseFloat(sale.total);
        t.totalVentas += amt;
        if (sale.metodo_pago === 'efectivo') t.efectivo += amt;
        else if (sale.metodo_pago === 'tarjeta') t.tarjeta += amt;
        else if (sale.metodo_pago === 'yape') t.yape += amt;
    });

    manuals.forEach(mov => {
        const amt = parseFloat(mov.monto);
        if (mov.tipo === 'ingreso') t.ingresos += amt;
        else t.egresos += amt;
    });

    setTotals(t);
  };

  const handleOpenSession = async () => {
    if (!initialAmount) return alert("Ingresa un monto inicial");
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('caja_sesiones').insert([{
        usuario_id: user.id,
        monto_inicial: parseFloat(initialAmount),
        estado: 'abierta'
    }]);

    if (error) alert("Error al abrir caja");
    else {
        setShowOpenModal(false);
        setInitialAmount('');
        checkSession();
    }
  };

  const handleAddMovement = async () => {
    if (!moveForm.amount || !moveForm.description) return alert("Completa los campos");
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('caja_movimientos').insert([{
        sesion_id: session.id,
        usuario_id: user.id,
        tipo: moveForm.type,
        monto: parseFloat(moveForm.amount),
        descripcion: moveForm.description
    }]);

    if (error) alert("Error registrando movimiento");
    else {
        setShowMoveModal(false);
        setMoveForm({ type: 'ingreso', amount: '', description: '' });
        fetchSessionData(session.id); 
    }
  };

  const handleCloseSession = async () => {
    if (!closeAmount) return alert("Ingresa el monto real contado");
    
    const efectivoSistema = totals.inicio + totals.efectivo + totals.ingresos - totals.egresos;
    const real = parseFloat(closeAmount);
    const diferencia = real - efectivoSistema;

    const { error } = await supabase.from('caja_sesiones').update({
        fecha_cierre: new Date(),
        monto_esperado: efectivoSistema,
        monto_real: real,
        diferencia: diferencia,
        estado: 'cerrada',
        total_ventas: totals.totalVentas, 
        total_ingresos: totals.ingresos,
        total_egresos: totals.egresos
    }).eq('id', session.id);

    if (error) alert("Error al cerrar caja");
    else {
        // PASAMOS LOS MOVIMIENTOS (VENTAS CON DETALLE) AL REPORTE
        printSessionReport(totals, efectivoSistema, real, diferencia, movements);
        
        alert("Caja Cerrada Correctamente");
        setShowCloseModal(false);
        setCloseAmount('');
        setSession(null); 
    }
  };

  if (!loading && !session) {
    return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center">
            <div className="bg-slate-100 p-6 rounded-full mb-6"><Lock size={64} className="text-slate-400"/></div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Caja Cerrada</h2>
            <p className="text-slate-500 mb-8">Debes abrir una sesión para comenzar a vender.</p>
            <button onClick={() => setShowOpenModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-blue-700 transition-all flex items-center gap-3">
                <Unlock size={24}/> Abrir Caja
            </button>

            {showOpenModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-96">
                        <h3 className="text-xl font-bold mb-4 text-slate-800">Apertura de Caja</h3>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Monto Inicial (Sencillo)</label>
                        <div className="relative mb-6">
                            <DollarSign className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                            <input type="number" autoFocus value={initialAmount} onChange={e => setInitialAmount(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-lg outline-blue-500" placeholder="0.00" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowOpenModal(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancelar</button>
                            <button onClick={handleOpenSession} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Abrir Turno</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  }

  const efectivoEnCaja = (totals.inicio || 0) + totals.efectivo + totals.ingresos - totals.egresos;

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8 pt-2">
         <div>
            <h1 className="text-3xl font-bold text-slate-800">Caja Actual</h1>
            <div className="flex items-center gap-2 mt-1">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-sm text-green-600 font-bold uppercase tracking-wide">Turno Abierto</p>
                <span className="text-slate-300">|</span>
                <p className="text-slate-500 text-sm">Inicio: S/{(totals.inicio || 0).toFixed(2)}</p>
            </div>
         </div>
         <div className="flex gap-2">
            <button onClick={() => { setMoveForm({...moveForm, type: 'ingreso'}); setShowMoveModal(true); }} className="bg-green-100 text-green-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-green-200 transition-colors"><PlusCircle size={18}/> Ingreso</button>
            <button onClick={() => { setMoveForm({...moveForm, type: 'egreso'}); setShowMoveModal(true); }} className="bg-red-100 text-red-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-200 transition-colors"><MinusCircle size={18}/> Egreso</button>
            <button onClick={() => setShowCloseModal(true)} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-900 shadow-lg shadow-slate-200 transition-colors"><Lock size={18}/> Cerrar Caja</button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Efectivo en Caja (Teórico)" amount={efectivoEnCaja} icon={DollarSign} color="bg-emerald-500 text-white" dark />
        <StatCard title="Total Ventas" amount={totals.totalVentas} icon={TrendingUp} color="bg-blue-100 text-blue-600" />
        <StatCard title="Ingresos Manuales" amount={totals.ingresos} icon={PlusCircle} color="bg-green-100 text-green-600" />
        <StatCard title="Gastos / Salidas" amount={totals.egresos} icon={MinusCircle} color="bg-red-100 text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100"><h3 className="font-bold text-slate-800">Ventas del Turno</h3></div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr><th className="p-4">Hora</th><th className="p-4">Mesa</th><th className="p-4">Método</th><th className="p-4 text-right">Monto</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono text-slate-500">{new Date(mov.created_at).toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'})}</td>
                      <td className="p-4 font-bold text-slate-700">Mesa {mov.mesas?.name}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${mov.metodo_pago === 'efectivo' ? 'bg-green-100 text-green-700' : mov.metodo_pago === 'tarjeta' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>{mov.metodo_pago}</span></td>
                      <td className="p-4 text-right font-bold">S/{parseFloat(mov.total).toFixed(2)}</td>
                    </tr>
                  ))}
                  {movements.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-400">Sin ventas aún.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-800">Movimientos Manuales</h3></div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {manualMovements.map(m => (
                    <div key={m.id} className="p-4 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-slate-700 text-sm">{m.descripcion}</p>
                            <p className="text-xs text-slate-400 capitalize">{m.tipo}</p>
                        </div>
                        <span className={`font-bold ${m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                            {m.tipo === 'ingreso' ? '+' : '-'} S/{parseFloat(m.monto).toFixed(2)}
                        </span>
                    </div>
                ))}
                {manualMovements.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No hay movimientos extra.</div>}
            </div>
          </div>
      </div>

      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-3xl shadow-2xl w-96">
                <h3 className="text-lg font-bold mb-4 text-slate-800 capitalize">Registrar {moveForm.type}</h3>
                <input type="text" autoFocus placeholder="Descripción (ej. Compra hielo)" value={moveForm.description} onChange={e => setMoveForm({...moveForm, description: e.target.value})} className="w-full mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-blue-500"/>
                <div className="relative mb-6">
                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold">S/</span>
                    <input type="number" placeholder="0.00" value={moveForm.amount} onChange={e => setMoveForm({...moveForm, amount: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-lg outline-blue-500"/>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowMoveModal(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancelar</button>
                    <button onClick={handleAddMovement} className={`flex-1 py-3 text-white font-bold rounded-xl ${moveForm.type === 'ingreso' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Guardar</button>
                </div>
            </div>
        </div>
      )}

      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md relative">
                {/* BOTÓN FLOTANTE IMPRIMIR PRE-REPORTE */}
                <button 
                    onClick={() => printSessionReport(totals, efectivoEnCaja, null, 0, movements)}
                    className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Imprimir Pre-Cierre"
                >
                    <Printer size={20} />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3"><Lock size={32} className="text-slate-600"/></div>
                    <h3 className="text-2xl font-bold text-slate-800">Cierre de Caja</h3>
                    <p className="text-slate-500 text-sm">Resumen del turno y arqueo de efectivo.</p>
                </div>
                
                <div className="mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex justify-between items-center">
                    <span className="text-indigo-800 font-bold text-sm">Venta Total del Turno:</span>
                    <span className="text-indigo-900 font-bold text-xl">S/{totals.totalVentas.toFixed(2)}</span>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100 text-sm">
                    <div className="flex justify-between mb-2 font-bold text-slate-700 pb-2 border-b border-blue-200">
                        <span>DETALLE DE COBROS:</span>
                    </div>
                    <div className="flex justify-between mb-1 text-slate-600"><span>• Efectivo:</span> <span>S/{totals.efectivo.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-1 text-slate-600"><span>• Tarjeta:</span> <span>S/{totals.tarjeta.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-3 text-slate-600"><span>• Yape / Plin:</span> <span>S/{totals.yape.toFixed(2)}</span></div>
                    
                    <div className="flex justify-between mb-2 font-bold text-slate-700 pb-2 border-b border-blue-200 border-t border-blue-200 pt-2">
                        <span>ARQUEO DE EFECTIVO:</span>
                    </div>
                    <div className="flex justify-between mb-1 text-slate-600"><span>Base Inicial:</span> <span>S/{(totals.inicio || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between mb-1 text-slate-600"><span>(+) Ventas Efectivo:</span> <span>S/{totals.efectivo.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-1 text-slate-600"><span>(+) Ingresos Manuales:</span> <span>S/{totals.ingresos.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-3 text-slate-600"><span>(-) Gastos:</span> <span>S/{totals.egresos.toFixed(2)}</span></div>
                    
                    <div className="flex justify-between pt-3 border-t border-blue-200 font-bold text-slate-900 text-lg bg-blue-100/50 p-2 rounded-lg -mx-2">
                        <span>Debe haber en Caja:</span> <span>S/{efectivoEnCaja.toFixed(2)}</span>
                    </div>
                </div>

                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Dinero Real (Lo que contaste)</label>
                <div className="relative mb-8">
                    <DollarSign className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                    <input type="number" autoFocus value={closeAmount} onChange={e => setCloseAmount(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-xl outline-blue-500" placeholder="0.00" />
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setShowCloseModal(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancelar</button>
                    <button onClick={handleCloseSession} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg">Confirmar Cierre</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

const StatCard = ({ title, amount, icon: Icon, color, dark }) => (
    <div className={`${dark ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800'} p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dark ? 'bg-white/20 text-white' : color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider ${dark ? 'text-emerald-100' : 'text-slate-400'}`}>{title}</p>
        <p className="text-2xl font-bold">S/{amount.toFixed(2)}</p>
      </div>
    </div>
);

export default Caja;