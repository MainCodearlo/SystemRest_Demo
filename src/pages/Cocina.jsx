import React from 'react';
import { Printer } from 'lucide-react';

const Cocina = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center p-6">
      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <Printer size={48} className="text-blue-500" />
      </div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">Comandas Impresas</h1>
      <p className="text-slate-500 max-w-md">
        El sistema de Pantalla de Cocina (KDS) está desactivado. 
        <br />
        Las órdenes se están imprimiendo automáticamente mediante tickets físicos.
      </p>
    </div>
  );
};

export default Cocina;