import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, EyeOff, Eye, ChevronRight } from 'lucide-react';
import { getAdminSettings } from '../lib/api';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [adminConfig, setAdminConfig] = useState<any>({
    email: 'admin@gmail.com',
    password: 'admin123',
    recovery_pin: '000000'
  });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getAdminSettings();
        if (data) {
          setAdminConfig(data);
        }
      } catch (err) {
        console.warn('Usando credenciais padrão do código (tabela admin_settings ainda não criada).');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === adminConfig.email && password === adminConfig.password) {
      localStorage.setItem('admin_authenticated', 'true');
      navigate('/admin');
    } else {
      setToast({ message: 'Email ou senha incorretos.', type: 'error' });
    }
  };

  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    );
  }, []);

  return (
    <div className="h-screen w-full bg-[#0A0A0A] text-white flex relative overflow-hidden font-sans touch-none">
      
      {/* --- TOP HEADER (Back Button Only) --- */}
      {!isStandalone && (
        <div className="absolute top-6 lg:top-10 left-4 lg:left-12 z-50 flex items-center gap-6">
          <motion.button 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ x: 3 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-zinc-600 hover:text-white transition-all group"
          >
            <div className="w-8 h-8 lg:rounded-full lg:border lg:border-white/5 flex items-center justify-center lg:group-hover:bg-white/5 transition-all">
              <ArrowLeft size={18} className="lg:w-[14px] lg:h-[14px]" />
            </div>
          </motion.button>
        </div>
      )}

      {/* --- DESKTOP SIDE IMAGE --- */}
      <div className="hidden lg:flex lg:w-[55%] h-full relative overflow-hidden bg-[#0A0A0A] border-r border-white/5">
        <motion.div 
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img 
            src="/assets/Tela de Login.webp" 
            alt="Barbershop" 
            className="w-full h-full object-cover grayscale opacity-20"
          />
        </motion.div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-transparent to-transparent" />
        
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-16 xl:p-24">
          <div />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
            className="space-y-8 max-w-xl"
          >
            <div className="w-12 h-[2px] bg-[#C5A059]" />
            <h2 className="flex flex-col gap-2">
              <span className="text-2xl xl:text-3xl font-bebas tracking-[0.3em] text-white uppercase">Gestão</span>
              <span className="text-6xl xl:text-7xl font-bebas leading-[0.9] tracking-widest text-[#C5A059] italic pr-4 uppercase">Black Diamond</span>
            </h2>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500 leading-relaxed max-w-md">
              Sua barbearia na palma da mão. Acompanhe sua agenda, clientes e faturamento de forma simples.
            </p>
          </motion.div>
        </div>
      </div>

      {/* --- LOGIN SECTION --- */}
      <div className="flex-1 h-full flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 relative bg-[#0A0A0A] sm:bg-[#121212]">
        
        <div className="absolute inset-0 lg:hidden overflow-hidden hidden md:block">
          <img 
            src="/assets/Tela de Login.webp" 
            alt="Background" 
            className="w-full h-full object-cover grayscale opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/80 to-[#0A0A0A]" />
        </div>

        <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#C5A059]/5 rounded-full blur-[120px]" />
        </div>

        {/* --- FORM CARD --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[340px] lg:max-w-[420px] relative z-10 flex flex-col items-center"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <img src="/assets/logo.webp" alt="Logo" className="w-28 h-28" />
          </div>

          {/* Header Desktop */}
          <div className="hidden lg:block mb-16 space-y-4 w-full text-left">
            <h1 className="text-5xl font-bebas tracking-widest text-white">BEM-VINDO</h1>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">Insira seus dados para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-6 lg:space-y-12">
            <div className="space-y-4 lg:space-y-10">
              {/* Email */}
              <div className="space-y-2 lg:space-y-4">
                <label className="text-[9px] font-black lg:font-medium text-zinc-500 uppercase tracking-[0.4em] lg:tracking-[0.3em] ml-1 lg:ml-0">E-mail de acesso</label>
                <div className="relative group">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-2xl px-6 text-sm font-medium outline-none focus:border-[#C5A059]/30 transition-all lg:bg-transparent lg:border-0 lg:border-b lg:border-white/10 lg:rounded-none lg:px-0 lg:h-12 lg:font-light lg:text-lg lg:focus:border-[#C5A059] placeholder:text-zinc-700 lg:placeholder:text-zinc-800"
                    placeholder="email@blackdiamond.com"
                    required
                  />
                  <div className="absolute bottom-0 left-6 right-6 lg:hidden h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/0 to-transparent group-focus-within:via-[#C5A059]/40 transition-all duration-500" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2 lg:space-y-4">
                <label className="text-[9px] font-black lg:font-medium text-zinc-500 uppercase tracking-[0.4em] lg:tracking-[0.3em] ml-1 lg:ml-0">Senha</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-2xl px-6 pr-14 text-sm font-medium outline-none focus:border-[#C5A059]/30 transition-all lg:bg-transparent lg:border-0 lg:border-b lg:border-white/10 lg:rounded-none lg:px-0 lg:pr-10 lg:h-12 lg:font-light lg:text-lg lg:focus:border-[#C5A059] placeholder:text-zinc-700 lg:placeholder:text-zinc-800"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 lg:right-0 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <div className="absolute bottom-0 left-6 right-6 lg:hidden h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/0 to-transparent group-focus-within:via-[#C5A059]/40 transition-all duration-500" />
                </div>
                <div className="flex justify-end lg:pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsForgotOpen(true)}
                    className="text-[8px] lg:text-[9px] font-black lg:font-medium text-[#C5A059]/70 uppercase tracking-widest hover:text-[#C5A059] transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              className="w-full h-14 lg:h-16 bg-[#C5A059] text-black font-black uppercase tracking-[0.5em] text-[11px] rounded-2xl lg:rounded-sm hover:bg-white transition-all flex items-center justify-center gap-3 group lg:mt-8"
            >
              <span>Entrar</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </form>
        </motion.div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      <AnimatePresence>
        {isForgotOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsForgotOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111111] border border-white/5 w-full max-w-sm relative z-10 overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-8 text-center"
            >
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white uppercase tracking-[0.15em]">Recuperar Acesso</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed max-w-[260px] mx-auto uppercase">
                    Como este painel é de uso exclusivo do administrador da barbearia, para redefinir ou recuperar sua senha, entre em contato diretamente com o suporte técnico.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <a 
                    href="https://wa.me/5531980159559?text=Ol%C3%A1%21%20Esqueci%20minha%20senha%20de%20acesso%20ao%20painel%20do%20Black%20Diamond.%20Pode%20me%20ajudar%20com%20o%20reset%3F%20%F0%9F%92%88"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsForgotOpen(false)}
                    className="w-full h-11 bg-[#C5A059] text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#A68233] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
                  >
                    Chamar Suporte no WhatsApp
                  </a>
                  <button 
                    onClick={() => setIsForgotOpen(false)}
                    className="w-full h-10 text-zinc-550 font-bold text-[9px] uppercase tracking-[0.3em] hover:text-white transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[100] px-6 py-4 rounded-2xl lg:rounded-sm border bg-[#0A0A0A] border-white/5 backdrop-blur-3xl shadow-2xl flex items-center gap-4 ${
              toast.type === 'error' ? 'text-red-500' : 'text-[#C5A059]'
            }`}
          >
            <div className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#C5A059]'}`} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLogin;
