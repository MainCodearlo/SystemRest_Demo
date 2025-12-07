import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Printer, Mail, CreditCard, Banknote, Smartphone, Receipt } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, total, onConfirm }) => {
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [tenderedAmount, setTenderedAmount] = useState(''); // Monto con el que paga
  const [tipAmount, setTipAmount] = useState('');
  const [hasTip, setHasTip] = useState(false);
  const [receiptType, setReceiptType] = useState('ticket'); // ticket, boleta, factura
  const [email, setEmail] = useState('');
  const [observation, setObservation] = useState('');
  const [isCourtesy, setIsCourtesy] = useState(false);

  // Lógica de cálculos
  const taxRate = 0.18; // IGV 18% (Ajustable)
  
  // Total final considerando propina o cortesía
  const calculatedTip = hasTip ? (parseFloat(tipAmount) || 0) : 0;
  const finalTotal = isCourtesy ? 0 : (total + calculatedTip);
  
  // Desglose (Base + Impuesto)
  const baseAmount = finalTotal / (1 + taxRate);
  const taxAmount = finalTotal - baseAmount;

  // Vuelto
  const change = (parseFloat(tenderedAmount) || 0) - finalTotal;

  useEffect(() => {
    if (isOpen) {
      // Al abrir, sugerimos el monto exacto
      setTenderedAmount(total.toFixed(2));
      setTipAmount('');
      setHasTip(false);
      setIsCourtesy(false);
      setPaymentMethod('efectivo');
    }
  }, [isOpen, total]);

  const handleConfirm = () => {
    // Validación básica
    if (paymentMethod === 'efectivo' && change < 0 && !isCourtesy) {
      alert("El monto recibido es menor al total a pagar.");
      return;
    }

    onConfirm({
      method: paymentMethod,
      total: finalTotal,
      tendered: parseFloat(tenderedAmount) || 0,
      change: change > 0 ? change : 0,
      receiptType,
      email,
      observation
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-5xl bg-[#F1F5F9] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* HEADER AZUL */}
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white shadow-md">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Banknote size={24} /> Tipo de Pago
              </h2>
              <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* BODY CON GRID */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. MONTO (IZQUIERDA) */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 border-b pb-2">Monto</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Sub-Total:</span>
                      <span>{baseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Impuesto (18%):</span>
                      <span>{taxAmount.toFixed(2)}</span>
                    </div>
                    {hasTip && (
                        <div className="flex justify-between text-green-600 font-medium">
                            <span>Propina:</span>
                            <span>+{calculatedTip.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-100">
                        <input type="checkbox" checked={isCourtesy} onChange={e => setIsCourtesy(e.target.checked)} className="w-4 h-4 rounded text-blue-600"/>
                        <label className="text-slate-700 font-bold text-xs uppercase">Cortesía (Gratis)</label>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2 bg-blue-50 p-2 rounded-lg">
                      <span className="font-bold text-slate-800">Total Bruto:</span>
                      <span className="font-bold text-blue-700 text-xl">S/{finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. MÉTODOS DE PAGO */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 border-b pb-2">Métodos de pago</h3>
                  <div className="space-y-3">
                    <PaymentRadio id="efectivo" label="Efectivo" icon={Banknote} selected={paymentMethod} onSelect={setPaymentMethod} />
                    <PaymentRadio id="tarjeta" label="Tarjeta Crédito" icon={CreditCard} selected={paymentMethod} onSelect={setPaymentMethod} />
                    <PaymentRadio id="yape" label="Yape / Plin" icon={Smartphone} selected={paymentMethod} onSelect={setPaymentMethod} />
                    <PaymentRadio id="credito" label="Crédito Personal" icon={Receipt} selected={paymentMethod} onSelect={setPaymentMethod} />
                  </div>
                </div>

                {/* 3. DETALLE DE PAGO (Vuelto y Propina) */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 border-b pb-2">Detalle de Pago</h3>
                  
                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input type="checkbox" checked={hasTip} onChange={e => setHasTip(e.target.checked)} className="w-4 h-4 rounded text-blue-600"/>
                        <span className="text-sm font-bold text-slate-700">Propina</span>
                    </label>
                    {hasTip && (
                        <input 
                            type="number" 
                            className="w-full p-2 border rounded text-right" 
                            placeholder="0.00" 
                            value={tipAmount} 
                            onChange={e => setTipAmount(e.target.value)}
                        />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-slate-700">Pago con:</label>
                        <input 
                            type="number" 
                            value={tenderedAmount} 
                            onChange={e => setTenderedAmount(e.target.value)} 
                            className="w-24 p-2 border border-slate-300 rounded-lg text-right font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <label className="text-sm font-bold text-slate-500">Vuelto:</label>
                        <span className={`text-lg font-bold ${change < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                            S/{change.toFixed(2)}
                        </span>
                    </div>
                  </div>
                </div>

                {/* 4. COMPROBANTE */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 border-b pb-2">Comprobante</h3>
                  <div className="space-y-2 mb-4">
                     <CompRadio id="factura" label="Factura" selected={receiptType} onSelect={setReceiptType} />
                     <CompRadio id="boleta" label="Boleta" selected={receiptType} onSelect={setReceiptType} />
                     <CompRadio id="ticket" label="S/C (Ticket)" selected={receiptType} onSelect={setReceiptType} />
                  </div>
                  <div className="mt-2">
                      <label className="text-xs font-bold text-slate-400">Tipo de Documento:</label>
                      <select className="w-full mt-1 p-2 border rounded text-sm bg-slate-50">
                          <option>DNI / RUC</option>
                      </select>
                  </div>
                </div>

                {/* 5. OBSERVACIÓN */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 md:col-span-2">
                   <h3 className="text-sm font-bold text-slate-500 uppercase mb-2 border-b pb-2">Observación</h3>
                   <div className="flex items-center gap-4 mb-2">
                        <label className="text-xs font-bold flex items-center gap-1">
                            <span className="w-4 h-4 bg-slate-200 block rounded"></span> Cortesía
                        </label>
                        <label className="text-xs font-bold flex items-center gap-1">
                            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded"/> Imprimir
                        </label>
                   </div>
                   <textarea 
                      className="w-full h-20 p-2 border border-slate-300 rounded resize-none text-sm focus:outline-blue-500"
                      placeholder="Observación..."
                      value={observation}
                      onChange={e => setObservation(e.target.value)}
                   ></textarea>
                </div>

                {/* 6. ENVIAR COMPROBANTE */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 md:col-span-2">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 border-b pb-2">Enviar el comprobante</h3>
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-bold text-slate-700 w-20">Email:</label>
                        <input 
                            type="email" 
                            className="flex-1 p-2 border border-slate-300 rounded text-sm focus:outline-blue-500" 
                            placeholder="cliente@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>

              </div>
            </div>

            {/* FOOTER */}
            <div className="bg-white p-4 border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold transition-colors"
              >
                Cerrar
              </button>
              <button 
                onClick={handleConfirm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-colors"
              >
                <Check size={18} /> Finalizar
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Componentes pequeños para los Radio Buttons bonitos
const PaymentRadio = ({ id, label, icon: Icon, selected, onSelect }) => (
    <div onClick={() => onSelect(id)} className={`flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50 ${selected === id ? 'text-blue-600' : 'text-slate-600'}`}>
        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected === id ? 'border-blue-600' : 'border-slate-300'}`}>
            {selected === id && <div className="w-3 h-3 bg-blue-600 rounded-full"></div>}
        </div>
        {Icon && <Icon size={18} />}
        <span className="font-bold text-sm">{label}</span>
    </div>
);

const CompRadio = ({ id, label, selected, onSelect }) => (
    <div onClick={() => onSelect(id)} className="flex items-center gap-3 cursor-pointer p-1">
        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected === id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-slate-100'}`}>
            {selected === id && <Check size={12}/>}
        </div>
        <span className="text-sm font-bold text-slate-700">{label}</span>
    </div>
);

export default PaymentModal;