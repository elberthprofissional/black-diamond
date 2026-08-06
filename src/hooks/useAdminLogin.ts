import { useCallback, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useModalA11y } from './useModalA11y';
import { useRateLimit } from './useRateLimit';
import { useAuditLog } from './useAuditLog';
import { logError } from '../lib/logger';
import { checkLoginAllowed } from '../lib/api/blocked-users';

/**
 * Lógica completa de autenticação do administrador (Supabase Auth).
 * Extraída do AdminLogin para ser reutilizada pela tela de acesso único
 * (UniversalLogin) e pela rota legada /admin/login.
 */
export function useAdminLogin(options?: { initialEmail?: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(options?.initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { toast, showError } = useToast();
  const { isBlocked, attempts, maxAttempts, recordAttempt, getTimeUntilReset } = useRateLimit(
    'login',
    {
      maxAttempts: 5,
      windowMs: 900000,
    }
  ); // 15 minutos
  const { logLogin } = useAuditLog();
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);

  const handleCloseForgot = useCallback(() => {
    setIsForgotOpen(false);
    setRecoveryEmail('');
    setIsResetSent(false);
  }, []);

  const { dialogRef } = useModalA11y(isForgotOpen, handleCloseForgot);

  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setLoginError(null);

      if (!email.trim() || !password.trim()) {
        setLoginError('Preencha todos os campos.');
        return;
      }

      if (isBlocked) {
        const remaining = Math.ceil(getTimeUntilReset() / 60000);
        setLoginError(`Muitas tentativas. Tente novamente em ${remaining} minuto(s).`);
        return;
      }

      // Server-side rate limit check via Supabase RPC
      try {
        const { data: allowed, error: rateError } = await supabase.rpc('check_rate_limit', {
          p_key: 'admin_login',
          p_max_attempts: 5,
          p_window_seconds: 900,
        });
        if (rateError || allowed === false) {
          setLoginError('Muitas tentativas de login. Aguarde 15 minutos e tente novamente.');
          recordAttempt();
          setIsLoggingIn(false);
          return;
        }
      } catch (err) {
        logError(err);
        // Fallback: se RPC falhar, continua com rate limit client-side apenas
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
            setLoginError('Conta bloqueada temporariamente. Tente novamente mais tarde.');
          } else {
            setLoginError('E-mail ou senha incorretos.');
          }
        } else {
          const userEmail = email.trim().toLowerCase();
          logLogin(true, userEmail);

          // Verifica bloqueio por pagamento (server-side via RPC)
          try {
            const { allowed, reason } = await checkLoginAllowed(userEmail);
            if (!allowed) {
              await supabase.auth.signOut();
              setLoginError(reason || 'Conta bloqueada.');
              return;
            }
          } catch (err) {
            logError(err, 'checkLoginAllowed');
            // Se RPC falhar, permite login como fallback
          }

          navigate('/admin', { replace: true });
        }
      } catch (err) {
        logError(err);
        setLoginError('Erro ao tentar fazer login.');
      } finally {
        setIsLoggingIn(false);
      }
    },
    [email, password, isBlocked, getTimeUntilReset, recordAttempt, logLogin, navigate]
  );

  const handleResetPassword = useCallback(
    async (e: FormEvent) => {
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
      } catch (err) {
        logError(err);
        showError('Erro ao enviar e-mail. Tente novamente.');
      } finally {
        setIsSendingReset(false);
      }
    },
    [recoveryEmail, showError]
  );

  return {
    toast,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isLoggingIn,
    loginError,
    setLoginError,
    isBlocked,
    attempts,
    maxAttempts,
    handleLogin,
    isForgotOpen,
    onOpenForgot: () => setIsForgotOpen(true),
    handleCloseForgot,
    recoveryEmail,
    setRecoveryEmail,
    handleResetPassword,
    isSendingReset,
    isResetSent,
    dialogRef,
  };
}
