import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Eye, ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

const AdminResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast, showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        return;
      }
      if (!session) {
        showError('Link de recuperação inválido ou expirado.');
        setTimeout(() => navigate('/admin/login'), 2500);
      }
    });

    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          showError('Link de recuperação inválido ou expirado.');
          setTimeout(() => navigate('/admin/login'), 2500);
        }
      });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate, showError]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsPWA(!!isStandalone);
  }, []);

  // Trava rolagem, arrastar e efeito de bounce (puxar para baixo) na tela de redefinir senha
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !confirmPassword.trim()) {
      showError('Preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      showError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      showError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) {
        showError('Erro ao atualizar a senha. Tente novamente.');
      } else {
        showSuccess('Senha alterada com sucesso!');
        setTimeout(() => navigate('/admin'), 1500);
      }
    } catch {
      showError('Erro ao tentar atualizar a senha.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0A0A] text-white flex relative overflow-hidden font-sans select-none">
      
      {!isPWA && (
        <button
          onClick={() => navigate('/admin/login')}
          className="absolute top-6 left-6 z-50 text-zinc-500 hover:text-white transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      <div className="hidden lg:flex lg:w-[55%] h-full relative overflow-hidden bg-[#0A0A0A] border-r border-white/5">
        <motion.div 
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img
            src="/assets/resetar_senha.webp"
            alt="Barbershop"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover grayscale opacity-10"
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
              <span className="text-2xl xl:text-3xl font-bebas tracking-[0.3em] text-white uppercase">Segurança</span>
              <span className="text-6xl xl:text-7xl font-bebas leading-[0.9] tracking-widest text-[#C5A059] italic pr-4 uppercase">Black Diamond</span>
            </h2>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500 leading-relaxed max-w-md">
              Proteja sua conta com uma nova senha segura. Mantenha seu painel de gestão sempre protegido.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 h-full flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 relative bg-[#0A0A0A] sm:bg-[#121212]">
        
        <div className="absolute inset-0 hidden md:block lg:hidden overflow-hidden">
          <img
            src="/assets/resetar_senha.webp"
            alt="Background"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover grayscale opacity-5"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/80 to-[#0A0A0A]" />
        </div>

        <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#C5A059]/5 rounded-full blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[340px] lg:max-w-[440px] relative z-10 flex flex-col items-center"
        >
          <div className="lg:hidden flex flex-col items-center mb-6">
            <img src="/assets/logo.webp" alt="Logo" className="w-28 h-28" />
          </div>

          <div className="hidden lg:block mb-16 space-y-4 w-full text-left">
            <h1 className="text-5xl font-bebas tracking-widest text-white">
              REDEFINIR <span className="text-[#C5A059]">SENHA</span>
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">Crie uma nova senha de acesso para o seu painel</p>
          </div>

          <form onSubmit={handleUpdate} className="w-full space-y-6 lg:space-y-8">
            <div className="space-y-4 lg:space-y-8">
              
              <div className="space-y-2 lg:space-y-3">
                <label htmlFor="reset-password" className="text-[9px] font-black lg:font-medium text-zinc-500 uppercase tracking-[0.4em] lg:tracking-[0.3em] ml-1 lg:ml-0">Nova Senha</label>
                <div className="relative group">
                  <input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 bg-[#1a1a1a] border border-white/[0.08] rounded-2xl px-6 pr-14 text-sm font-medium text-white outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-all placeholder:text-zinc-600 lg:h-14 lg:font-light lg:text-base"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                    className="absolute right-5 lg:right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <div className="absolute bottom-0 left-6 right-6 lg:hidden h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/0 to-transparent group-focus-within:via-[#C5A059]/40 transition-all duration-500" />
                </div>
              </div>

              <div className="space-y-2 lg:space-y-3">
                <label htmlFor="reset-confirm-password" className="text-[9px] font-black lg:font-medium text-zinc-500 uppercase tracking-[0.4em] lg:tracking-[0.3em] ml-1 lg:ml-0">Confirmar Senha</label>
                <div className="relative group">
                  <input
                    id="reset-confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-14 bg-[#1a1a1a] border border-white/[0.08] rounded-2xl px-6 pr-14 text-sm font-medium text-white outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-all placeholder:text-zinc-600 lg:h-14 lg:font-light lg:text-base"
                    placeholder="Repita a nova senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                    className="absolute right-5 lg:right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <div className="absolute bottom-0 left-6 right-6 lg:hidden h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/0 to-transparent group-focus-within:via-[#C5A059]/40 transition-all duration-500" />
                </div>
              </div>

            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isUpdating}
              className="w-full h-14 lg:h-14 bg-[#C5A059] text-black font-black uppercase tracking-[0.5em] text-[11px] rounded-2xl lg:rounded-xl hover:bg-white transition-all flex items-center justify-center gap-3 group lg:mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isUpdating ? 'Salvando...' : 'Salvar'}</span>
              {!isUpdating && <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />}
            </motion.button>
          </form>
        </motion.div>
      </div>

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

export default AdminResetPassword;
