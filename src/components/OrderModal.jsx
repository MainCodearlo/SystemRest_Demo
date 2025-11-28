import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Minus, Trash2, ChefHat, ShoppingBag, UtensilsCrossed, Beer, IceCream, Loader2, Lock, CheckCircle2, ChevronRight, CreditCard, Banknote, Smartphone, ArrowLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabase/client';

const categoryIcons = {
  'todos': <UtensilsCrossed size={16}/>,
  'fondos': <ChefHat size={16}/>,
  'bebidas': <Beer size={16}/>,
  'postres': <IceCream size={16}/>,
};

const PRODUCTS_PER_PAGE = 10;

// --- FUNCIÓN DE IMPRESIÓN ---
const printOrderTicket = (tableName, items, waiterName = "Mesero") => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PE');
  const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const ticketContent = `
    <html>
      <head>
        <title>Ticket de Comanda</title>
        <style>
          body { font-family: 'Courier New', monospace; width: 280px; font-size: 14px; margin: 0; padding: 5px; color: #000; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .meta { font-size: 12px; margin-bottom: 2px; }
          .item { display: flex; margin-bottom: 5px; font-size: 14px; }
          .qty { font-weight: bold; width: 30px; }
          .name { flex: 1; }
          .footer { margin-top: 15px; border-top: 1px dashed #000; padding-top: 5px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">COMANDA COCINA</div>
          <div class="meta">Mesa: <strong>${tableName}</strong></div>
          <div class="meta">Fecha: ${dateStr} - ${timeStr}</div>
          <div class="meta">Atiende: ${waiterName}</div>
        </div>
        <div class="items">
          ${items.map(item => `
            <div class="item">
              <span class="qty">${item.quantity}</span>
              <span class="name">${item.name}</span>
            </div>
          `).join('')}
        </div>
        <div class="footer">*** FIN DE ORDEN ***</div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(ticketContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
};

const ProductAvatar = ({ src, name }) => {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-2xl shadow-inner select-none">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return <img src={src} alt={name} className="w-full h-full object-cover select-none" onError={() => setHasError(true)} />;
};

const OrderModal = ({ isOpen, onClose, table }) => {
  const [activeTab, setActiveTab] = useState('menu');
  
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [search, setSearch] = useState('');
  
  const [order, setOrder] = useState([]); 
  const [savedOrder, setSavedOrder] = useState([]); 

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hasMore, setHasMore] = useState(true); 
  const [page, setPage] = useState(0); 
  
  const [sendingOrder, setSendingOrder] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const [isCashOpen, setIsCashOpen] = useState(false); 

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setOrder([]);
      setSavedOrder([]);
      setShowPayment(false);
      setActiveTab('menu');
      setSearch('');
      setSelectedCategory('todos');
      
      fetchInitialData(); 
      checkCashStatus(); 

      setProducts([]);
      setPage(0);
      setHasMore(true);
      fetchProducts(0, 'todos', '');
    }
  }, [isOpen, table]);

  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = setTimeout(() => {
      setProducts([]); 
      setPage(0);      
      setHasMore(true);
      setLoadingProducts(true);
      fetchProducts(0, selectedCategory, search);
    }, 300); 
    return () => clearTimeout(timeoutId);
  }, [selectedCategory, search]);

  const checkCashStatus = async () => {
    const { data } = await supabase
        .from('caja_sesiones')
        .select('id')
        .eq('estado', 'abierta')
        .maybeSingle();
    
    setIsCashOpen(!!data); 
  };

  const fetchInitialData = async () => {
    const { data: catData } = await supabase.from('categorias').select('*');
    setCategories(catData || []);

    if (table && table.status === 'ocupada' && table.current_order_id) {
        const { data: items } = await supabase
            .from('orden_items')
            .select('*')
            .eq('orden_id', table.current_order_id);
        
        if (items && items.length > 0) {
            setSavedOrder(items);
        }
    }
  };

  const fetchProducts = async (pageNumber, categoryId, searchTerm) => {
    setLoadingProducts(true);
    const from = pageNumber * PRODUCTS_PER_PAGE;
    const to = from + PRODUCTS_PER_PAGE - 1;

    // AQUI FILTRAMOS SOLO LOS QUE TIENEN STOCK > 0
    let query = supabase.from('productos').select('*').range(from, to).gt('stock', 0);

    if (categoryId !== 'todos') query = query.eq('category_id', categoryId);
    if (searchTerm) query = query.ilike('name', `%${searchTerm}%`); 

    const { data, error } = await query;

    if (error) {
      console.error("Error cargando productos:", error);
    } else {
      if (data.length < PRODUCTS_PER_PAGE) setHasMore(false); 
      setProducts(prev => pageNumber === 0 ? data : [...prev, ...data]);
    }
    setLoadingProducts(false);
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight - scrollTop <= clientHeight + 50 && !loadingProducts && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchProducts(nextPage, selectedCategory, search);
      }
    }
  };

  const handlePayment = async (method) => {
    if (!isCashOpen) return alert("¡Caja Cerrada! No se puede cobrar.");

    if (!confirm(`¿Confirmar pago de S/${grandTotal.toFixed(2)} con ${method.toUpperCase()}?`)) return;
    setSendingOrder(true);
    try {
        await supabase.from('ordenes').update({ estado: 'pagado', metodo_pago: method, total: grandTotal }).eq('id', table.current_order_id);
        await supabase.from('mesas').update({ status: 'libre', total: 0, current_order_id: null, time_opened: null }).eq('id', table.id);
        alert("¡Mesa cobrada y liberada!");
        onClose();
    } catch (error) {
        alert("Error al procesar el pago");
    } finally {
        setSendingOrder(false);
    }
  };

  // --- LÓGICA DE ENVÍO OPTIMIZADA (RPC - SEGURA Y ATÓMICA) ---
  const handleSendOrder = async () => {
    // 1. Validaciones básicas frontend
    if (!isCashOpen) return alert("¡Caja Cerrada! Abre la caja para comandar.");
    if (order.length === 0) return;
    
    setSendingOrder(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Preparamos los datos para enviar a la RPC
      // Mapeamos 'order' para que coincida con el JSON que espera SQL
      const itemsPayload = order.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      // Llamamos a la función segura en base de datos
      const { data: newOrderId, error } = await supabase.rpc('procesar_comanda', {
        p_mesa_id: table.id,
        p_user_id: user?.id || null, // Manejo seguro si no hay usuario
        p_items: itemsPayload,
        p_orden_id: table.current_order_id || null // Null si es mesa nueva, ID si ya existe
      });

      if (error) throw error;

      // Imprimir Ticket (tu función existente)
      const waiterName = user?.email?.split('@')[0] || "Mesero";
      printOrderTicket(table.name, order, waiterName);
      
      onClose(); // Cerrar modal
      alert("¡Pedido enviado correctamente!");

    } catch (error) {
      console.error("Error en comanda:", error);
      // Mensaje amigable si es error de stock (viene desde el RAISE EXCEPTION de SQL)
      if (error.message && error.message.includes("Stock insuficiente")) {
         alert("⚠️ Error: " + error.message);
      } else {
         alert("Ocurrió un error al procesar el pedido: " + (error.message || "Error desconocido"));
      }
    } finally {
      setSendingOrder(false);
    }
  };

  const addToOrder = (product) => {
    // Validar stock visualmente al agregar
    const currentQtyInOrder = order.find(i => i.id === product.id)?.quantity || 0;
    if (currentQtyInOrder + 1 > product.stock) {
        alert("No puedes agregar más de lo que hay en stock.");
        return;
    }

    const existing = order.find(item => item.id === product.id);
    if (existing) {
      setOrder(order.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setOrder([...order, { ...product, quantity: 1 }]);
    }
  };

  const removeFromOrder = (productId) => {
    const existing = order.find(item => item.id === productId);
    if (existing.quantity === 1) {
      setOrder(order.filter(item => item.id !== productId));
    } else {
      setOrder(order.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item));
    }
  };

  const deleteItem = (productId) => {
    setOrder(order.filter(item => item.id !== productId));
  };

  const getProductQty = (id) => {
    const item = order.find(i => i.id === id);
    return item ? item.quantity : 0;
  };

  const totalNew = order.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalSaved = savedOrder.reduce((acc, item) => acc + (parseFloat(item.precio_unitario) * item.cantidad), 0);
  const grandTotal = totalNew + totalSaved;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"/>

      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="relative w-full md:w-[95%] lg:w-[1100px] h-full md:h-[90vh] bg-[#F8FAFC] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* HEADER MÓVIL */}
        <div className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-20">
            <div className="flex justify-between items-center p-4 pb-2">
                <h2 className="text-xl font-bold text-slate-800">Mesa {table?.name}</h2>
                <button type="button" onClick={onClose}><X className="text-slate-400"/></button>
            </div>
            <div className="flex px-4 gap-4">
                <button type="button" onClick={() => setActiveTab('menu')} className={`pb-3 text-sm font-bold border-b-2 transition-colors flex-1 ${activeTab === 'menu' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>Productos</button>
                <button type="button" onClick={() => setActiveTab('ticket')} className={`pb-3 text-sm font-bold border-b-2 transition-colors flex-1 flex justify-between ${activeTab === 'ticket' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>
                    <span>Pedido</span>
                    <span className="bg-blue-100 text-blue-700 px-2 rounded-full text-xs">S/{grandTotal.toFixed(2)}</span>
                </button>
            </div>
        </div>

        {/* IZQUIERDA: MENÚ */}
        <div className={`flex-1 flex flex-col bg-white relative ${activeTab === 'menu' && !showPayment ? 'flex' : 'hidden md:flex'}`}>
          <div className="hidden md:block p-4 border-b border-slate-100">
             <div className="flex justify-between items-center mb-4">
                <div><h2 className="text-xl font-bold text-slate-800">Menú</h2><p className="text-xs text-slate-400 font-medium">Agrega productos</p></div>
                <button type="button" onClick={onClose}><X className="text-slate-400 hover:text-red-500"/></button>
             </div>
          </div>
          
          {/* BUSCADOR */}
          <div className="p-4 border-b border-slate-50 space-y-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar..." className="w-full bg-slate-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {categories.map(cat => (
                    <button type="button" key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                        {categoryIcons[cat.id] || <UtensilsCrossed size={16}/>} {cat.name}
                    </button>
                ))}
            </div>
          </div>
          
          {/* LISTA PRODUCTOS */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 pb-24" ref={scrollContainerRef} onScroll={handleScroll}>
            <div className="space-y-3">
                {products.map(product => {
                    const qty = getProductQty(product.id);
                    return (
                        <div key={product.id} onClick={() => addToOrder(product)} className={`flex items-center gap-3 bg-white p-3 rounded-xl border transition-all shadow-sm cursor-pointer select-none active:scale-[0.98] ${qty > 0 ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'border-slate-200'}`}>
                            <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-100"><ProductAvatar src={product.image_url} name={product.name} /></div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 text-sm truncate">{product.name}</h3>
                                <p className="text-xs text-slate-500">S/{product.price}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Stock: {product.stock}</p>
                            </div>
                            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                {qty === 0 ? (
                                    <button type="button" onClick={() => addToOrder(product)} className="w-9 h-9 rounded-full bg-slate-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"><Plus size={18} /></button>
                                ) : (
                                    <div className="flex items-center bg-white rounded-full border border-slate-200 shadow-sm overflow-hidden h-9">
                                        <button type="button" onClick={() => removeFromOrder(product.id)} className="w-9 h-full flex items-center justify-center text-red-500 hover:bg-red-50"><Minus size={16} /></button>
                                        <span className="w-8 text-center font-bold text-sm text-slate-800">{qty}</span>
                                        <button type="button" onClick={() => addToOrder(product)} className="w-9 h-full flex items-center justify-center text-blue-600 hover:bg-blue-50"><Plus size={16} /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {loadingProducts && <div className="py-4 flex justify-center text-slate-400 text-sm items-center"><Loader2 className="animate-spin mr-2 w-5 h-5"/> Cargando más...</div>}
                {!loadingProducts && products.length === 0 && <div className="text-center py-10 text-slate-400"><ShoppingBag size={40} className="mx-auto mb-2 opacity-50"/><p>No se encontraron productos</p></div>}
            </div>
          </div>
          
          {/* BARRA FLOTANTE */}
          <AnimatePresence>
            {order.length > 0 && !showPayment && (
                <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="absolute bottom-4 left-4 right-4 z-30 md:hidden">
                    <button type="button" onClick={() => setActiveTab('ticket')} className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">{order.reduce((a,b)=>a+b.quantity,0)}</span>
                            <div className="flex flex-col items-start"><span className="text-xs text-slate-400">Por enviar</span><span className="text-lg font-bold leading-none">S/{totalNew.toFixed(2)}</span></div>
                        </div>
                        <div className="flex items-center gap-2 font-bold">Ver Pedido <ChevronRight size={18} /></div>
                    </button>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DERECHA: TICKET / PAGO */}
        <div className={`w-full md:w-[400px] bg-white md:border-l border-slate-200 flex flex-col ${activeTab === 'ticket' || showPayment ? 'flex' : 'hidden md:flex'}`}>
            
            {/* --- ALERTA CAJA CERRADA --- */}
            {!isCashOpen && (
                <div className="bg-red-500 text-white p-3 text-center text-sm font-bold flex items-center justify-center gap-2">
                    <AlertTriangle size={18} /> 
                    CAJA CERRADA - Solo lectura
                </div>
            )}

            {showPayment ? (
                <div className="flex flex-col h-full relative">
                    {!isCashOpen && <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center font-bold text-slate-500">Función deshabilitada</div>}

                    <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                        <button onClick={() => setShowPayment(false)} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} className="text-slate-600"/></button>
                        <h3 className="font-bold text-lg text-slate-800">Método de Pago</h3>
                    </div>
                    <div className="flex-1 p-6 flex flex-col gap-4 justify-center">
                        <div className="text-center mb-6">
                            <p className="text-slate-400 text-sm uppercase font-bold tracking-wider">Total a Cobrar</p>
                            <p className="text-5xl font-bold text-slate-900 mt-2">S/{grandTotal.toFixed(2)}</p>
                        </div>
                        <button disabled={!isCashOpen} onClick={() => handlePayment('efectivo')} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-green-500 hover:bg-green-50 transition-all group disabled:opacity-50">
                            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Banknote size={24}/></div>
                            <div className="text-left"><h4 className="font-bold text-slate-800">Efectivo</h4><p className="text-xs text-slate-400">Pago directo</p></div>
                        </button>
                        <button disabled={!isCashOpen} onClick={() => handlePayment('tarjeta')} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group disabled:opacity-50">
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform"><CreditCard size={24}/></div>
                            <div className="text-left"><h4 className="font-bold text-slate-800">Tarjeta</h4><p className="text-xs text-slate-400">Visa / Mastercard</p></div>
                        </button>
                        <button disabled={!isCashOpen} onClick={() => handlePayment('yape')} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 transition-all group disabled:opacity-50">
                            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Smartphone size={24}/></div>
                            <div className="text-left"><h4 className="font-bold text-slate-800">Yape / Plin</h4><p className="text-xs text-slate-400">QR Digital</p></div>
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="hidden md:flex p-5 border-b border-slate-100 justify-between items-center bg-white">
                        <div><h3 className="font-bold text-lg text-slate-800">Pedido Actual</h3><div className="flex items-center gap-2"><span className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Mesa {table?.name}</span></div></div>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-white">
                        {savedOrder.length > 0 && (
                            <div className="bg-slate-50 border-b border-slate-200">
                                <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 bg-slate-100">
                                    <Lock size={12}/> Enviado a Cocina
                                </div>
                                {savedOrder.map((item) => (
                                    <div key={item.id} className="grid grid-cols-12 items-center py-3 px-2 opacity-70">
                                        <div className="col-span-6 pl-2 pr-1"><p className="text-xs font-bold text-slate-700">{item.nombre_producto}</p></div>
                                        <div className="col-span-2 text-center font-bold text-sm text-slate-600">{item.cantidad}</div>
                                        <div className="col-span-2 text-center font-bold text-sm text-slate-600">{parseFloat(item.subtotal).toFixed(2)}</div>
                                        <div className="col-span-2 flex justify-center"><CheckCircle2 size={16} className="text-green-500"/></div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {order.length > 0 && (
                            <div>
                                <div className="px-4 py-2 text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border-y border-blue-100">Nuevo (Por enviar)</div>
                                {order.map((item, index) => (
                                    <div key={item.id} className={`grid grid-cols-12 items-center py-3 px-2 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <div className="col-span-6 pl-2 pr-1"><p className="text-xs font-bold text-slate-800">{item.name}</p><p className="text-[10px] text-slate-400">PU: S/{item.price}</p></div>
                                        <div className="col-span-2 text-center font-bold text-sm text-slate-700">{item.quantity}</div>
                                        <div className="col-span-2 text-center font-bold text-sm text-slate-900">{(item.price * item.quantity).toFixed(2)}</div>
                                        <div className="col-span-2 flex flex-col gap-1 items-center justify-center">
                                            <button type="button" onClick={() => addToOrder(item)} className="w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 shadow-sm"><Plus size={14} /></button>
                                            <button type="button" onClick={() => removeFromOrder(item.id)} className="w-6 h-6 rounded bg-amber-400 text-white flex items-center justify-center hover:bg-amber-500 shadow-sm"><Minus size={14} /></button>
                                            <button type="button" onClick={() => deleteItem(item.id)} className="w-6 h-6 rounded bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-sm"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {savedOrder.length === 0 && order.length === 0 && (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 opacity-60"><ShoppingBag size={48} strokeWidth={1} className="mb-2"/><p className="text-sm">Mesa sin pedidos</p></div>
                        )}
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-500 font-bold">Total General:</span>
                            <span className="text-2xl font-bold text-slate-900">S/{grandTotal.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {order.length > 0 ? (
                                <>
                                    <button type="button" onClick={onClose} className="py-3 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-100">Volver</button>
                                    <button 
                                        type="button" 
                                        disabled={sendingOrder || !isCashOpen} 
                                        onClick={handleSendOrder} 
                                        className="py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        {sendingOrder ? <Loader2 className="animate-spin" /> : <ChefHat size={18}/>} Enviar Pedido
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button type="button" onClick={onClose} className="py-3 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-100">Cerrar</button>
                                    <button 
                                        type="button" 
                                        disabled={savedOrder.length === 0 || !isCashOpen} 
                                        onClick={() => setShowPayment(true)} 
                                        className="py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        <Banknote size={18}/> Cobrar Mesa
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
      </motion.div>
    </div>
  );
};

export default OrderModal;