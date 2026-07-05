import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { useModalA11y } from '../hooks/useModalA11y';
import { useRateLimit } from '../hooks/useRateLimit';
import { useAuditLog } from '../hooks/useAuditLog';
import LoginBackground from '../components/Admin/LoginBackground';
import LoginHeader from '../components/Admin/LoginHeader';
import LoginForm from '../components/Admin/LoginForm';
import ForgotPasswordModal from '../components/Admin/ForgotPasswordModal';
import LoginToast from '../components/Admin/LoginToast';

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
  const { isBlocked, attempts, maxAttempts, recordAttempt, getTimeUntilReset } = useRateLimit(
    'login',
    {
      maxAttempts: 5,
      windowMs: 900000,
    }
  ); // 15 minutos
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
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevWidth = document.body.style.width;
    const prevHeight = document.body.style.height;

    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      document.documentElement.style.overscrollBehavior = prevOverscroll;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.width = prevWidth;
      document.body.style.height = prevHeight;
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
      <LoginHeader isPWA={isPWA} />
      <LoginBackground />

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
          <LoginForm
            email={email}
            onEmailChange={setEmail}
            password={password}
            onPasswordChange={setPassword}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            onSubmit={handleLogin}
            onForgotPassword={() => setIsForgotOpen(true)}
            isLoggingIn={isLoggingIn}
            isBlocked={isBlocked}
            attempts={attempts}
            maxAttempts={maxAttempts}
          />
        </motion.div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={handleCloseForgot}
        recoveryEmail={recoveryEmail}
        onEmailChange={setRecoveryEmail}
        onResetPassword={handleResetPassword}
        isSendingReset={isSendingReset}
        isResetSent={isResetSent}
        dialogRef={dialogRef}
      />

      <LoginToast toast={toast} />
    </div>
  );
};

export default AdminLogin;
