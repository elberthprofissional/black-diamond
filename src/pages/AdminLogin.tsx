import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isError, setIsError] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica de Autenticação Mockada
    if (email === 'admin@gmail.com' && password === 'admin123') {
      navigate('/admin');
    } else {
      setIsError(true);
      setMessage('Credenciais inválidas. Tente novamente.');
      setTimeout(() => setIsError(false), 3000);
    }
  };

  const handleForgotPassword = () => {
    alert('Uma senha temporária foi enviada para o seu WhatsApp/E-mail registrado.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] relative overflow-hidden px-6 font-sans">
      
      {/* Cinematic Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 opacity-40 scale-110" 
        style={{ backgroundImage: 'url("/assets/img/Fundo - Login.webp")' }}
      />
      
      {/* Deep Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#09090B] via-[#09090B]/80 to-transparent z-[1]" />

      {/* Voltar ao Site - Top Left */}
      <div className="absolute top-8 left-8 z-20">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center space-x-3 text-gray-400 hover:text-gold-600 transition-all duration-500 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-2 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Voltar ao Site</span>
        </button>
      </div>

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
        <div className="flex flex-col items-center mb-10">
          <img src="/assets/logo.webp" alt="Black Diamond" className="w-32 md:w-40 object-contain mb-4" />
          <span className="text-[10px] tracking-[0.4em] text-gold-600 font-bold uppercase opacity-80">Painel Administrativo</span>
        </div>

        {/* Login Card (Real Glassmorphism - Light Layer) */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] relative overflow-hidden rounded-2xl p-8 sm:p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400 tracking-widest uppercase block ml-1">NOME DE USUÁRIO OU E-MAIL</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#D4AF37] transition-colors duration-300 z-10" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-black/40 border border-white/10 text-white pl-12 pr-4 rounded-xl outline-none transition-all duration-300 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] placeholder:text-neutral-500"
                  placeholder="admin@gmail.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400 tracking-widest uppercase block ml-1">SENHA</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#D4AF37] transition-colors duration-300 z-10" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-black/40 border border-white/10 text-white pl-12 pr-12 rounded-xl outline-none transition-all duration-300 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] placeholder:text-neutral-500"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors z-10"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex justify-end px-1">
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-gold-600 transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>

            {/* Error Message */}
            {isError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center py-2"
              >
                {message}
              </motion.div>
            )}

            <button 
              type="submit"
              className="mt-4 h-12 w-full bg-white text-black font-bold uppercase tracking-wider rounded-xl hover:bg-neutral-200 hover:scale-[1.02] transition-all shadow-lg"
            >
              Entrar no Painel
            </button>
          </form>
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
