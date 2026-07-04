import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Eye, ChevronRight, ArrowLeft, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { useModalA11y } from '../hooks/useModalA11y';
import { useRateLimit } from '../hooks/useRateLimit';
import { useAuditLog } from '../hooks/useAuditLog';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState(import.meta.env.VITE_ADMIN_EMAIL || '');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast, showError } = useToast();
  const navigate = useNavigate();
  const [isPWA, setIsPWA] = useState(false);
  const { isBlocked, attempts, recordAttempt, getTimeUntilReset } = useRateLimit('login', {
    maxAttempts: 5,
    windowMs: 900000,
  }); // 15 minutos
  const { logLogin } = useAuditLog();

  // Se já houver uma sessão ativa, redireciona para o admin automaticamente
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate('/admin');
      }
    };
    checkSession();
  }, [navigate]);

  // Detecta PWA e trava navegação de voltar caso esteja standalone
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
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

    if (isBlocked) {
      const remaining = Math.ceil(getTimeUntilReset() / 60000);
      showError(`Muitas tentativas. Tente novamente em ${remaining} minuto(s).`);
      return;
    }

    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        const allowed = recordAttempt();
        logLogin(false, email.trim());
        if (!allowed) {
          showError('Conta bloqueada temporariamente. Tente novamente mais tarde.');
        } else {
          showError('E-mail ou senha incorretos.');
        }
      } else {
        logLogin(true, email.trim());
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

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });

      if (error) {
        showError('Erro ao enviar e-mail. Tente novamente.');
      } else {
        setIsResetSent(true);
      }
    } catch {
      showError('Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleCloseForgot = () => {
    setIsForgotOpen(false);
    setRecoveryEmail('');
    setIsResetSent(false);
  };

  const { dialogRef } = useModalA11y(isForgotOpen, handleCloseForgot);

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
          transition={{ duration: 2, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <img
            src="/assets/login.webp"
            alt="Barbershop"
            loading="lazy"
            decoding="async"
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
              <span className="text-2xl xl:text-3xl font-bebas tracking-[0.3em] text-white uppercase">
                Gestão
              </span>
              <span className="text-6xl xl:text-7xl font-bebas leading-[0.9] tracking-widest text-[#C5A059] italic pr-4 uppercase">
                Black Diamond
              </span>
            </h2>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500 leading-relaxed max-w-md">
              Sua barbearia na palma da mão. Acompanhe sua agenda, clientes e faturamento de forma
              simples.
            </p>
          </motion.div>
        </div>
      </div>

      {/* --- LOGIN SECTION --- */}
      <div className="flex-1 h-full flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 relative bg-[#0A0A0A] sm:bg-[#121212]">
        <div className="absolute inset-0 hidden md:block lg:hidden overflow-hidden">
          <img
            src="/assets/login.webp"
            alt="Background"
            loading="lazy"
            decoding="async"
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
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">
              Insira seus dados para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-6 lg:space-y-12">
            <div className="space-y-4 lg:space-y-10">
              {/* Email */}
              <div className="space-y-2 lg:space-y-4">
                <label
                  htmlFor="login-email"
                  className="text-[9px] font-black lg:font-medium text-zinc-500 uppercase tracking-[0.4em] lg:tracking-[0.3em] ml-1 lg:ml-0"
                >
                  E-mail
                </label>
                <div className="relative group">
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 bg-[#1a1a1a] border border-white/[0.08] rounded-2xl px-6 text-sm font-medium text-white outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-all placeholder:text-zinc-600 lg:h-12 lg:font-light lg:text-lg"
                    placeholder="seu@email.com"
                    required
                  />
                  <div className="absolute bottom-0 left-6 right-6 lg:hidden h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/0 to-transparent group-focus-within:via-[#C5A059]/40 transition-all duration-500" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2 lg:space-y-4">
                <label
                  htmlFor="login-password"
                  className="text-[9px] font-black lg:font-medium text-zinc-500 uppercase tracking-[0.4em] lg:tracking-[0.3em] ml-1 lg:ml-0"
                >
                  Senha
                </label>
                <div className="relative group">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 bg-[#1a1a1a] border border-white/[0.08] rounded-2xl px-6 pr-14 text-sm font-medium text-white outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-all placeholder:text-zinc-600 lg:h-12 lg:font-light lg:text-lg"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                    className="absolute right-6 lg:right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
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

            {attempts >= 3 && !isBlocked && (
              <p className="text-[10px] text-amber-500/70 text-center">
                Atenção: {5 - attempts} tentativa(s) restante(s) antes do bloqueio temporário.
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoggingIn || isBlocked}
              className="w-full h-14 lg:h-16 bg-[#C5A059] text-black font-black uppercase tracking-[0.5em] text-[11px] rounded-2xl lg:rounded-sm hover:bg-white transition-all flex items-center justify-center gap-3 group lg:mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoggingIn ? 'Entrando...' : isBlocked ? 'Bloqueado' : 'Entrar'}</span>
              {!isLoggingIn && !isBlocked && (
                <ChevronRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      <AnimatePresence>
        {isForgotOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseForgot}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Recuperação de senha"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111111] border border-white/10 w-full max-w-[400px] relative z-10 overflow-hidden rounded-2xl shadow-2xl"
            >
              {!isResetSent ? (
                <>
                  <button
                    onClick={handleCloseForgot}
                    className="absolute top-4 left-4 z-10 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    aria-label="Fechar"
                  >
                    <X size={16} />
                  </button>
                  <div className="p-6 sm:p-8 pb-5 sm:pb-6 text-center border-b border-white/5">
                    <h2 className="text-base sm:text-lg font-semibold text-white mb-1">
                      Encontre sua conta
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-400">
                      Insira seu email para redefinir sua senha.
                    </p>
                  </div>
                  <div className="p-6 sm:p-8 space-y-3 sm:space-y-4">
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full h-11 sm:h-12 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 text-sm text-white outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-colors placeholder:text-zinc-600"
                      placeholder="Insira seu email"
                    />
                    <button
                      onClick={handleResetPassword}
                      disabled={isSendingReset || !recoveryEmail.trim()}
                      className="w-full h-11 bg-[#C5A059] hover:bg-[#b8923f] text-black font-semibold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingReset ? 'Enviando...' : 'Enviar link de recuperação'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCloseForgot}
                    className="absolute top-4 left-4 z-10 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    aria-label="Fechar"
                  >
                    <X size={16} />
                  </button>
                  <div className="p-6 sm:p-8 pb-5 sm:pb-6 text-center border-b border-white/5">
                    <div className="w-14 sm:w-16 h-14 sm:h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-white mb-1">
                      Email enviado!
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-400">
                      Enviamos um link de recuperação para{' '}
                      <span className="font-medium text-white">{recoveryEmail}</span>. Verifique sua
                      caixa de entrada.
                    </p>
                  </div>
                </>
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
            <div
              className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#C5A059]'}`}
            />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLogin;
