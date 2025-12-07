import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Minus, Trash2, ChefHat, ShoppingBag, UtensilsCrossed, Beer, IceCream, Loader2, Lock, CheckCircle2, ChevronRight, Banknote, AlertTriangle, Check, FileText } from 'lucide-react';
import { supabase } from '../supabase/client';
import PaymentModal from './PaymentModal';

const categoryIcons = {
  'todos': <UtensilsCrossed size={16}/>,
  'fondos': <ChefHat size={16}/>,
  'bebidas': <Beer size={16}/>,
  'postres': <IceCream size={16}/>,
};

const PRODUCTS_PER_PAGE = 10;

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

const OrderModal = ({ isOpen, onClose, table, onUpdate }) => {
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
  const [isCashOpen, setIsCashOpen] = useState(false); 
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("¡Enviado!");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setOrder([]);
      setSavedOrder([]);
      setShowPaymentModal(false); 
      setActiveTab('menu');
      setSearch('');
      setSelectedCategory('todos');
      setShowToast(false);
      
      fetchInitialData(); 
      checkCashStatus(); 

      setProducts([]);
      setPage(0);
      setHasMore(true);
      fetchProducts(0, 'todos', '');
    }
  }, [isOpen, table?.id]); 

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
    const { data } = await supabase.from('caja_sesiones').select('id').eq('estado', 'abierta').maybeSingle();
    setIsCashOpen(!!data); 
  };

  const fetchInitialData = async () => {
    const { data: catData } = await supabase.from('categorias').select('*');
    setCategories(catData || []);

    if (table && (table.status === 'ocupada' || table.status === 'pagando') && table.current_order_id) {
        const { data: items } = await supabase.from('orden_items').select('*').eq('orden_id', table.current_order_id);
        if (items && items.length > 0) setSavedOrder(items);
    }
  };

  const fetchProducts = async (pageNumber, categoryId, searchTerm) => {
    setLoadingProducts(true);
    const from = pageNumber * PRODUCTS_PER_PAGE;
    const to = from + PRODUCTS_PER_PAGE - 1;
    let query = supabase.from('productos').select('*').range(from, to).gt('stock', 0);
    if (categoryId !== 'todos') query = query.eq('category_id', categoryId);
    if (searchTerm) query = query.ilike('name', `%${searchTerm}%`); 
    const { data, error } = await query;
    if (!error) {
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

  const handlePreCheck = async () => {
    // SIN IMPRESIÓN
    try {
        const { error } = await supabase
            .from('mesas')
            .update({ status: 'pagando' }) 
            .eq('id', table.id);

        if (error) throw error;
        onUpdate && await onUpdate(); 
        
        setToastMessage("Mesa en pago");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
        console.error("Error cambiando estado:", error);
    }
  };

  const handleFinalizePayment = async (paymentDetails) => {
    if (!isCashOpen) return alert("¡Caja Cerrada!");
    
    setSendingOrder(true);
    try {
        await supabase.from('ordenes').update({ 
            estado: 'pagado', 
            metodo_pago: paymentDetails.method, 
            total: paymentDetails.total 
        }).eq('id', table.current_order_id);

        await supabase.from('mesas').update({ status: 'libre', total: 0, current_order_id: null, time_opened: null }).eq('id', table.id);
        
        setShowPaymentModal(false);
        setToastMessage("¡Venta Exitosa!");
        setShowToast(true);
        onUpdate && await onUpdate(); 
        
        setTimeout(() => { onClose(); }, 1500);

    } catch (error) {
        alert("Error al procesar el pago");
        setSendingOrder(false);
    }
  };

  const handleSendOrder = async () => {
    if (!isCashOpen) return alert("¡Caja Cerrada! Abre la caja para comandar.");
    if (order.length === 0) return;
    
    setSendingOrder(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const itemsPayload = order.map(item => ({
        id: item.id, name: item.name, price: item.price, quantity: item.quantity
      }));

      // Llamada a la función corregida en SQL
      const { data, error } = await supabase.rpc('procesar_comanda', {
        p_mesa_id: table.id,
        p_user_id: user?.id || null,
        p_items: itemsPayload,
        p_orden_id: table.current_order_id || null
      });

      if (error) throw error;
      
      // Verificamos si la función SQL devolvió un error lógico
      if (data && data.success === false) {
        throw new Error(data.error || "Error desconocido en base de datos");
      }

      // --- SIN IMPRESIÓN ---
      
      setOrder([]); 
      fetchInitialData();

      setToastMessage("¡Enviado a Cocina!"); 
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      
      onUpdate && await onUpdate(); 

    } catch (error) {
      console.error("Error comanda:", error);
      alert("Error al procesar: " + error.message);
    } finally {
        setSendingOrder(false);
    }
  };

  const addToOrder = (product) => {
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

      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)}
        total={grandTotal}
        onConfirm={handleFinalizePayment}
      />

      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="relative w-full md:w-[95%] lg:w-[1100px] h-full md:h-[90vh] bg-[#F8FAFC] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        <AnimatePresence>
            {showToast && (
                <motion.div 
                    initial={{ opacity: 0, y: 50, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, y: 20, x: "-50%" }}
                    className="absolute bottom-10 left-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4"
                >
                    <div className="bg-green-500 rounded-full p-1"><Check size={16} strokeWidth={4} className="text-slate-900"/></div>
                    <div><p className="font-bold text-sm">{toastMessage}</p></div>
                </motion.div>
            )}
        </AnimatePresence>

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

        <div className={`flex-1 flex flex-col bg-white relative ${activeTab === 'menu' ? 'flex' : 'hidden md:flex'}`}>
          <div className="hidden md:block p-4 border-b border-slate-100">
             <div className="flex justify-between items-center mb-4">
                <div><h2 className="text-xl font-bold text-slate-800">Menú</h2><p className="text-xs text-slate-400 font-medium">Agrega productos</p></div>
                <button type="button" onClick={onClose}><X className="text-slate-400 hover:text-red-500"/></button>
             </div>
          </div>
          
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
          
          <AnimatePresence>
            {order.length > 0 && (
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

        <div className={`w-full md:w-[400px] bg-white md:border-l border-slate-200 flex flex-col ${activeTab === 'ticket' ? 'flex' : 'hidden md:flex'}`}>
            {!isCashOpen && <div className="bg-red-500 text-white p-3 text-center text-sm font-bold flex items-center justify-center gap-2"><AlertTriangle size={18} /> CAJA CERRADA</div>}
            
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
                                <div className="col-span-2 text-center font-bold text-sm text-slate-600">{parseFloat(item.precio_unitario * item.cantidad).toFixed(2)}</div>
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
                                    <button onClick={() => addToOrder(item)} className="w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 shadow-sm"><Plus size={14} /></button>
                                    <button onClick={() => removeFromOrder(item.id)} className="w-6 h-6 rounded bg-amber-400 text-white flex items-center justify-center hover:bg-amber-500 shadow-sm"><Minus size={14} /></button>
                                    <button onClick={() => deleteItem(item.id)} className="w-6 h-6 rounded bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-sm"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {savedOrder.length === 0 && order.length === 0 && <div className="h-64 flex flex-col items-center justify-center text-slate-400 opacity-60"><ShoppingBag size={48} strokeWidth={1} className="mb-2"/><p className="text-sm">Mesa sin pedidos</p></div>}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-500 font-bold">Total General:</span>
                    <span className="text-2xl font-bold text-slate-900">S/{grandTotal.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {order.length > 0 ? (
                        <>
                            <button onClick={onClose} className="py-3 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-100">Volver</button>
                            <button onClick={handleSendOrder} disabled={sendingOrder || !isCashOpen} className="py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300">
                                {sendingOrder ? <Loader2 className="animate-spin" /> : <ChefHat size={18}/>} Enviar Pedido
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={handlePreCheck} disabled={savedOrder.length === 0} className="py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-2 disabled:opacity-50">
                                <FileText size={18}/> Pre-cuenta
                            </button>
                            <button onClick={() => setShowPaymentModal(true)} disabled={savedOrder.length === 0 || !isCashOpen} className="flex-1 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300">
                                <Banknote size={18}/> Cobrar Mesa
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderModal;