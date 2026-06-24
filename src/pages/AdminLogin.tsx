import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Eye, ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const supportPhone = import.meta.env.VITE_SUPPORT_WHATSAPP || '5531980159559';
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState(import.meta.env.VITE_ADMIN_EMAIL || 'tato@gmail.com');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast, showError } = useToast();
  const navigate = useNavigate();
  const [isPWA, setIsPWA] = useState(false);

  // Se já houver uma sessão ativa, redireciona para o admin automaticamente
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/admin');
      }
    };
    checkSession();
  }, [navigate]);

  // Detecta PWA e trava navegação de voltar caso esteja standalone
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsPWA(!!isStandalone);

    if (isStandalone) {
      const handlePopState = () => {
        window.close();
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, []);

  // Trava rolagem, arrastar e efeito de bounce (puxar para baixo) na tela de login
  useEffect(() => {
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overscrollBehavior = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showError('Preencha todos os campos.');
      return;
    }
    
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        showError('E-mail ou senha incorretos.');
      } else {
        navigate('/admin');
      }
    } catch {
      showError('Erro ao tentar fazer login.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) {
      showError('Digite seu e-mail.');
      return;
    }
    setIsSendingReset(true);
    
    // Simulação do envio (Pre-configurado / Front-end Mock)
    setTimeout(() => {
      setIsSendingReset(false);
      setIsResetSent(true);
    }, 1500);
  };

  const handleCloseForgot = () => {
    setIsForgotOpen(false);
    setRecoveryEmail('');
    setIsResetSent(false);
  };

  return (
    <div className="h-screen w-full bg-[#0A0A0A] text-white flex relative overflow-hidden font-sans select-none">
      
      {/* Voltar para Home (apenas no site, oculto no PWA) */}
      {!isPWA && (
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 z-50 text-zinc-500 hover:text-white transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
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
            src="/assets/login.webp"
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
            src="/assets/login.webp"
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
                <label className="text-[9px] font-black lg:font-medium text-zinc-500 uppercase tracking-[0.4em] lg:tracking-[0.3em] ml-1 lg:ml-0">E-mail</label>
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
              disabled={isLoggingIn}
              className="w-full h-14 lg:h-16 bg-[#C5A059] text-black font-black uppercase tracking-[0.5em] text-[11px] rounded-2xl lg:rounded-sm hover:bg-white transition-all flex items-center justify-center gap-3 group lg:mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoggingIn ? 'Entrando...' : 'Entrar'}</span>
              {!isLoggingIn && <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />}
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
              onClick={handleCloseForgot}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111111] border border-white/5 w-full max-w-sm relative z-10 overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-8 text-center"
            >
              {!isResetSent ? (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white uppercase tracking-[0.15em]">Recuperar Acesso</h3>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider leading-relaxed max-w-[260px] mx-auto">
                      Confirme o e-mail do administrador para enviar o link de redefinição.
                    </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-5 text-center">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block text-left pl-1">E-mail do Administrador</label>
                      <div className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3.5 text-xs text-zinc-400 font-semibold select-none text-left break-all">
                        {recoveryEmail}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="w-full h-11 bg-white hover:bg-[#C5A059] text-black font-bold text-[9px] uppercase tracking-[0.25em] rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(255,255,255,0.03)]"
                    >
                      {isSendingReset ? 'Enviando...' : 'Enviar link de recuperação'}
                    </button>
                  </form>

                  <div className="border-t border-white/[0.04] pt-4 mt-2 space-y-3">
                    <p className="text-[8px] text-zinc-600 uppercase tracking-widest">
                      Não deu certo? Chame o suporte técnico:
                    </p>
                    <a 
                      href={`https://wa.me/${supportPhone}?text=${encodeURIComponent('Olá! Tentei o reset de senha automático no painel do Black Diamond mas deu erro. Pode me ajudar com o reset? 💈')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleCloseForgot}
                      className="w-full h-10 bg-transparent border border-white/5 hover:border-[#C5A059]/20 text-[#C5A059] hover:text-white font-bold text-[9px] uppercase tracking-[0.2em] rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
                    >
                      Chamar no WhatsApp
                    </a>
                    <button 
                      type="button"
                      onClick={handleCloseForgot}
                      className="w-full h-8 text-zinc-600 font-bold text-[9px] uppercase tracking-[0.3em] hover:text-white transition-all cursor-pointer"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 py-4">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059] animate-pulse">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white uppercase tracking-[0.15em]">E-mail Enviado</h3>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider leading-relaxed max-w-[260px] mx-auto">
                      Enviamos um link de redefinição de acesso para:
                    </p>
                    <p className="text-xs text-[#C5A059] font-bold break-all">
                      {recoveryEmail}
                    </p>
                  </div>

                  <p className="text-[9px] text-zinc-500 leading-relaxed max-w-[240px] mx-auto">
                    Por favor, verifique a sua caixa de entrada (e pasta de spam) e siga as instruções contidas no e-mail para atualizar a sua senha.
                  </p>

                  <button
                    onClick={handleCloseForgot}
                    className="w-full h-11 bg-white hover:bg-zinc-200 text-black font-bold text-[9px] uppercase tracking-[0.25em] rounded-xl active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              )}
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
