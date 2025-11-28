import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { supabase } from '../supabase/client';
import { printOrderUSB } from '../utils/printService'; // <--- IMPORTANTE: Importamos el servicio
import { 
  DollarSign, CreditCard, Smartphone, TrendingUp, Loader2, 
  Lock, Unlock, PlusCircle, MinusCircle, AlertTriangle, Printer,
  Trash2, ShieldAlert, Eye, FileText, X // <--- Iconos nuevos
} from 'lucide-react';

// --- FUNCIÓN DE IMPRESIÓN DE REPORTE DE CIERRE (Mantenemos esta igual) ---
const printSessionReport = (totals, cashExpected, realCount, diff, salesDetail, userEmail = "Administrador") => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PE');
  const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const salesRows = salesDetail.map(sale => {
    const timeSale = new Date(sale.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
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
        <div style="font-size: 10px; margin-bottom: 4px;">${itemsHtml}</div>
        <div style="text-align: right; font-weight: bold;">Total: S/${parseFloat(sale.total).toFixed(2)}</div>
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
        <div class="row"><span>Efectivo:</span> <span>S/${totals.efectivo.toFixed(2)}</span></div>
        <div class="row"><span>Tarjeta:</span> <span>S/${totals.tarjeta.toFixed(2)}</span></div>
        <div class="row"><span>Yape / Plin:</span> <span>S/${totals.yape.toFixed(2)}</span></div>
        <span class="subtitle">ARQUEO DE EFECTIVO</span>
        <div class="row"><span>Base Inicial:</span> <span>S/${(totals.inicio || 0).toFixed(2)}</span></div>
        <div class="row"><span>(+) Ventas Efec.:</span> <span>S/${totals.efectivo.toFixed(2)}</span></div>
        <div class="row"><span>(+) Ingresos:</span> <span>S/${totals.ingresos.toFixed(2)}</span></div>
        <div class="row"><span>(-) Gastos:</span> <span>S/${totals.egresos.toFixed(2)}</span></div>
        <div class="total-row"><span>SISTEMA (TEÓRICO):</span> <span>S/${cashExpected.toFixed(2)}</span></div>
        ${realCount !== null ? `<div class="row" style="margin-top:5px;"><span>CONTEO REAL:</span> <span>S/${parseFloat(realCount).toFixed(2)}</span></div><div class="row"><span>DIFERENCIA:</span> <span>S/${parseFloat(diff).toFixed(2)}</span></div>` : ''}
        <span class="subtitle">DETALLE DE VENTAS</span>
        <div style="font-size: 11px;">${salesRows}</div>
        <div class="footer">__________________________<br/>Firma del Responsable</div>
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

const Caja = () => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null); 
  
  const [movements, setMovements] = useState([]);
  const [manualMovements, setManualMovements] = useState([]);
  
  const [totals, setTotals] = useState({ 
      efectivo: 0, tarjeta: 0, yape: 0, totalVentas: 0, 
      ingresos: 0, egresos: 0, inicio: 0
  });

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  
  // --- ESTADOS PARA ANULACIÓN ---
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [ticketToVoid, setTicketToVoid] = useState(null);
  const [adminPin, setAdminPin] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  // --- ESTADOS PARA DETALLE DE TICKET ---
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [ticketDetail, setTicketDetail] = useState(null);

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
    
    const { data: sales } = await supabase
      .from('ordenes')
      .select(`
        id, created_at, total, metodo_pago, mesas(name),
        orden_items ( producto_id, nombre_producto, cantidad, precio_unitario ) 
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

  // --- LÓGICA DE REIMPRESIÓN ---
  const handleReprint = async (ticket) => {
    if (!confirm("¿Deseas reimprimir este ticket?")) return;
    
    // Formatear items para el servicio de impresión
    const itemsFormatted = ticket.orden_items.map(item => ({
        name: item.nombre_producto,
        quantity: item.cantidad,
        price: item.precio_unitario
    }));

    await printOrderUSB(
        ticket.mesas?.name || "Mesa",
        itemsFormatted,
        "Copia Reimpresa",
        "COPIA DE TICKET"
    );
  };

  // --- LÓGICA DE VER DETALLE ---
  const openDetailModal = (ticket) => {
      setTicketDetail(ticket);
      setShowDetailModal(true);
  };

  // --- LÓGICA DE ANULACIÓN DE VENTA ---
  const handleVoidSale = async () => {
    if (adminPin !== '1234') { 
        alert("PIN Incorrecto");
        return;
    }

    if (!ticketToVoid) return;
    setVoidLoading(true);

    try {
        // Devolver stock
        for (const item of ticketToVoid.orden_items) {
            if (item.producto_id) {
                const { data: prod } = await supabase.from('productos').select('stock').eq('id', item.producto_id).single();
                if (prod) {
                    await supabase.from('productos').update({ stock: prod.stock + item.cantidad }).eq('id', item.producto_id);
                }
            }
        }

        const { error } = await supabase
            .from('ordenes')
            .update({ estado: 'anulado' })
            .eq('id', ticketToVoid.id);

        if (error) throw error;

        alert(`Ticket anulado correctamente.`);
        setShowVoidModal(false);
        setTicketToVoid(null);
        setAdminPin('');
        fetchSessionData(session.id);

    } catch (error) {
        console.error("Error anulando:", error);
        alert("Error al anular: " + error.message);
    } finally {
        setVoidLoading(false);
    }
  };

  const openVoidModal = (ticket) => {
      setTicketToVoid(ticket);
      setAdminPin('');
      setShowVoidModal(true);
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
                  <tr>
                      <th className="p-4">Hora</th>
                      <th className="p-4">Mesa</th>
                      <th className="p-4">Método</th>
                      <th className="p-4 text-right">Monto</th>
                      <th className="p-4 text-center">Acciones</th> {/* Columna unificada */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50 group">
                      <td className="p-4 font-mono text-slate-500">{new Date(mov.created_at).toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'})}</td>
                      <td className="p-4 font-bold text-slate-700">Mesa {mov.mesas?.name}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${mov.metodo_pago === 'efectivo' ? 'bg-green-100 text-green-700' : mov.metodo_pago === 'tarjeta' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>{mov.metodo_pago}</span></td>
                      <td className="p-4 text-right font-bold">S/{parseFloat(mov.total).toFixed(2)}</td>
                      
                      {/* --- NUEVAS ACCIONES --- */}
                      <td className="p-4 text-center">
                          <div className="flex justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openDetailModal(mov)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Ver Detalle">
                                  <Eye size={16}/>
                              </button>
                              <button onClick={() => handleReprint(mov)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200" title="Reimprimir">
                                  <Printer size={16}/>
                              </button>
                              <button onClick={() => openVoidModal(mov)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100" title="Anular Venta">
                                  <Trash2 size={16}/>
                              </button>
                          </div>
                      </td>
                    </tr>
                  ))}
                  {movements.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400">Sin ventas aún.</td></tr>}
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

      {/* MODAL MOVIMIENTO MANUAL */}
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

      {/* MODAL DE CIERRE DE CAJA */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md relative">
                <button onClick={() => printSessionReport(totals, efectivoEnCaja, null, 0, movements)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition-colors" title="Imprimir Pre-Cierre"><Printer size={20} /></button>
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
                    <div className="flex justify-between mb-2 font-bold text-slate-700 pb-2 border-b border-blue-200"><span>DETALLE DE COBROS:</span></div>
                    <div className="flex justify-between mb-1 text-slate-600"><span>• Efectivo:</span> <span>S/{totals.efectivo.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-1 text-slate-600"><span>• Tarjeta:</span> <span>S/{totals.tarjeta.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-3 text-slate-600"><span>• Yape / Plin:</span> <span>S/{totals.yape.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-2 font-bold text-slate-700 pb-2 border-b border-blue-200 border-t border-blue-200 pt-2"><span>ARQUEO DE EFECTIVO:</span></div>
                    <div className="flex justify-between mb-1 text-slate-600"><span>Base Inicial:</span> <span>S/{(totals.inicio || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between mb-1 text-slate-600"><span>(+) Ventas Efectivo:</span> <span>S/{totals.efectivo.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-1 text-slate-600"><span>(+) Ingresos Manuales:</span> <span>S/{totals.ingresos.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-3 text-slate-600"><span>(-) Gastos:</span> <span>S/{totals.egresos.toFixed(2)}</span></div>
                    <div className="flex justify-between pt-3 border-t border-blue-200 font-bold text-slate-900 text-lg bg-blue-100/50 p-2 rounded-lg -mx-2"><span>Debe haber en Caja:</span> <span>S/{efectivoEnCaja.toFixed(2)}</span></div>
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

      {/* MODAL DE ANULACIÓN */}
      {showVoidModal && ticketToVoid && (
        <div className="fixed inset-0 bg-red-900/40 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert size={32} className="text-red-600"/>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Anulación de Venta</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Estás anulando el ticket <b>#{ticketToVoid.id.toString().slice(0,8)}</b> por 
                        <span className="font-bold text-slate-800 ml-1">S/{ticketToVoid.total.toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-red-500 font-bold mt-2 bg-red-50 px-3 py-1 rounded-full">
                        ⚠️ Se devolverá el stock automáticamente
                    </p>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">PIN DE ADMINISTRADOR</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                        <input 
                            type="password" 
                            autoFocus 
                            maxLength={4}
                            value={adminPin} 
                            onChange={e => setAdminPin(e.target.value)} 
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-center text-xl tracking-[0.5em] outline-red-500 text-slate-800" 
                            placeholder="••••" 
                        />
                    </div>
                    <p className="text-[10px] text-center text-slate-400 mt-2">PIN por defecto: 1234</p>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setShowVoidModal(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancelar</button>
                    <button 
                        onClick={handleVoidSale} 
                        disabled={voidLoading || adminPin.length < 4}
                        className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {voidLoading ? <Loader2 className="animate-spin"/> : <Trash2 size={18}/>} 
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- NUEVO: MODAL DETALLE DE TICKET --- */}
      {showDetailModal && ticketDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 relative">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Detalle de Consumo</h3>
                        <p className="text-xs text-slate-500">Mesa: {ticketDetail.mesas?.name}</p>
                    </div>
                    <button onClick={() => setShowDetailModal(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400"><X size={20}/></button>
                </div>
                
                <div className="p-0 max-h-[400px] overflow-y-auto">
                    {ticketDetail.orden_items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">{item.cantidad}</span>
                                <div>
                                    <p className="text-sm font-bold text-slate-700">{item.nombre_producto}</p>
                                    <p className="text-xs text-slate-400">PU: S/{item.precio_unitario}</p>
                                </div>
                            </div>
                            <span className="font-bold text-slate-800 text-sm">S/{(item.cantidad * item.precio_unitario).toFixed(2)}</span>
                        </div>
                    ))}
                </div>

                <div className="p-5 bg-slate-50 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-slate-500">TOTAL PAGADO</span>
                        <span className="text-2xl font-bold text-slate-900">S/{parseFloat(ticketDetail.total).toFixed(2)}</span>
                    </div>
                    <button onClick={() => { setShowDetailModal(false); handleReprint(ticketDetail); }} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800">
                        <Printer size={18}/> Reimprimir Ticket
                    </button>
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