import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Lock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminLogin: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      navigate('/admin');
    } else {
      setIsError(true);
      setTimeout(() => setIsError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] relative overflow-hidden px-6">
      
      {/* Cinematic Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 opacity-40 scale-110 animate-slow-zoom" 
        style={{ backgroundImage: 'url("/assets/img/Fundo - Login.webp")' }}
      />
      
      {/* Deep Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#09090B] via-[#09090B]/80 to-transparent z-[1]" />

      {/* Decorative Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-600 opacity-[0.03] rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold-600 opacity-[0.03] rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 border border-white/10 flex items-center justify-center mb-6 bg-black/40 backdrop-blur-md rounded-md">
            <Scissors className="text-gold-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase text-center leading-none">
            BLACK DIAMOND
          </h1>
          <span className="text-[10px] tracking-[0.3em] text-gold-600 font-bold mt-4 uppercase">Painel Administrativo</span>
        </div>

        {/* Login Card */}
        <div className="bg-[#141414] border border-white/5 p-10 md:p-12 shadow-2xl relative overflow-hidden rounded-lg">
          <form onSubmit={handleLogin} className="space-y-10">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Chave de Acesso</label>
                {isError && (
                  <motion.span 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-red-500 text-[9px] font-bold uppercase tracking-widest"
                  >
                    Senha Incorreta
                  </motion.span>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-gold-600/40 group-focus-within:text-gold-600 transition-colors duration-500" size={18} />
                <input 
                  type="password" 
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-transparent border-b border-white/10 text-white py-4 pl-10 outline-none transition-all duration-700 text-lg font-light tracking-[0.5em] focus:border-gold-600 ${isError ? 'border-red-900 focus:border-red-500' : ''}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full flex items-center justify-center bg-white hover:bg-zinc-200 text-black px-8 py-4 transition-all duration-300 rounded-md font-bold text-xs uppercase tracking-[0.2em]"
            >
              Entrar no Painel
            </button>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="mt-12 flex justify-center">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 text-gray-600 hover:text-gold-600 transition-all duration-500 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-2 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Voltar ao Site</span>
          </button>
        </div>

      </motion.div>
      
      {/* Decorative vertical indicators */}
      <div className="absolute left-10 top-1/2 -translate-y-1/2 hidden lg:flex flex-col space-y-6 opacity-20">
         {[1,2,3].map(i => <div key={i} className="w-[1px] h-12 bg-white" />)}
      </div>
      <div className="absolute right-10 bottom-10 hidden lg:block opacity-20 text-[9px] font-bold tracking-[1em] uppercase rotate-90 origin-right">
        Security Layer
      </div>

    </div>
  );
};

export default AdminLogin;
