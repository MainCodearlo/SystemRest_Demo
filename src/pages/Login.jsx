import React, { useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, UtensilsCrossed, ArrowRight, AlertCircle, Star } from 'lucide-react';

// Imagen de fondo (puedes cambiarla por una importación local si prefieres)
const bgImageURL = "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=2077&auto=format&fit=crop";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error(error);
      setErrorMsg("Credenciales incorrectas. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      
      {/* SECCIÓN IZQUIERDA (IMAGEN ANIMADA) */}
      <div className="hidden lg:block relative w-1/2 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <motion.img 
            src={bgImageURL} 
            alt="Fondo Restaurante" 
            className="w-full h-full object-cover opacity-60"
            initial={{ scale: 1 }} 
            animate={{ 
                scale: 1.1,         
                x: ["0%", "-3%", "0%"], 
                y: ["0%", "-2%", "0%"]  
            }}
            transition={{ 
                duration: 25,
                ease: "easeInOut",  
                repeat: Infinity,   
                repeatType: "reverse" 
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-16 text-white z-10">
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="flex items-center gap-2 mb-4">
               <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50">
                 <UtensilsCrossed size={20} className="text-white"/>
               </div>
               <span className="font-bold text-xl tracking-wide">RestoSystem</span>
            </div>
            
            <div className="flex gap-1 text-yellow-400 mb-6">
               {[1,2,3,4,5].map(i => <Star key={i} size={20} fill="currentColor" />)}
            </div>

            <blockquote className="text-2xl font-light leading-relaxed mb-6 text-slate-100">
              "Este sistema transformó por completo la eficiencia de nuestra cocina y la atención al cliente. Es rápido, intuitivo y moderno."
            </blockquote>
            
            <div>
              <p className="font-bold text-lg">Pierre Thiam</p>
              <p className="text-slate-400 text-sm">Chef Ejecutivo & Dueño</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* SECCIÓN DERECHA (FORMULARIO) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative">
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-200"
            >
              <UtensilsCrossed size={32} />
            </motion.div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bienvenido</h1>
            <p className="text-slate-500 mt-2">Inicia sesión para gestionar tu restaurante</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-center gap-3 border border-red-100"
              >
                <AlertCircle size={18} /> {errorMsg}
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  placeholder="admin@restaurante.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">Recordarme</label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">¿Olvidaste tu contraseña?</a>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <>Iniciar Sesión <ArrowRight className="ml-2 h-5 w-5" /></>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;