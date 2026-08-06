import { useEffect, useState, type FC, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, User, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getClientByPhone } from '../lib/api';
import { saveClientSession } from '../lib/clientSession';
import { useScrollLock } from '../hooks/useScrollLock';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { useAdminLogin } from '../hooks/useAdminLogin';
import LoginBackground from '../components/Admin/LoginBackground';
import LoginHeader from '../components/Admin/LoginHeader';
import LoginForm from '../components/Admin/LoginForm';
import ForgotPasswordModal from '../components/Admin/ForgotPasswordModal';
import LoginToast from '../components/Admin/LoginToast';

interface UniversalLoginProps {
  /** Abre direto no modo admin (usado pela rota legada /admin/login). */
  adminMode?: boolean;
  /** E-mail pré-preenchido (deep-link do modo admin). */
  initialEmail?: string;
}

/**
 * Porta Única (v3.35) — acesso universal para cliente e admin.
 *
 * Um único campo inteligente:
 *   - Celular (11 dígitos) → entra como CLIENTE no dashboard (sem senha)
 *   - E-mail → revela a senha e entra como ADMINISTRADOR
 *
 * Segurança: o painel admin continua exigindo e-mail + senha (Supabase Auth).
 * Celular NUNCA dá acesso administrativo.
 */
const UniversalLogin: FC<UniversalLoginProps> = ({ adminMode = false, initialEmail = '' }) => {
  const navigate = useNavigate();
  const [view, setView] = useState<'client' | 'admin'>(adminMode ? 'admin' : 'client');
  const [input, setInput] = useState(initialEmail);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState('');

  const admin = useAdminLogin({ initialEmail });
  const { brandColor } = useBarberSettings();
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone;

  // Se já houver sessão de admin ativa, redireciona para o painel
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate('/admin', { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  // PWA: trava navegação de voltar caso esteja standalone
  useEffect(() => {
    if (!isPWA) return;
    const handlePopState = () => {
      window.close();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isPWA]);

  useScrollLock();

  const looksLikeEmail = /@/.test(input.trim());

  const handleUniversalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setClientError('');

    // E-mail → modo admin (a senha é o muro)
    if (looksLikeEmail) {
      admin.setEmail(input.trim());
      setView('admin');
      return;
    }

    // Celular → entra como cliente no dashboard
    const digits = input.replace(/\D/g, '');
    if (digits.length < 11) {
      setClientError('Digite um celular com DDD (11 dígitos) ou um e-mail.');
      return;
    }

    setClientLoading(true);
    try {
      // Busca o nome real (RPC com rate limit) para a sessão do dashboard
      const lookup = await getClientByPhone(digits).catch(() => null);
      const name = (lookup as { name?: string } | null)?.name || 'Cliente';
      saveClientSession(digits, name);
      navigate('/cliente');
    } catch {
      setClientError('Erro ao buscar seus dados. Tente novamente.');
      setClientLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0A0A] text-white flex relative overflow-hidden font-sans select-none">
      <LoginBackground subtitle="Agende seu horário, consulte ou cancele — tudo em um só lugar." />

      {/* --- ACCESS SECTION --- */}
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
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px]" />
        </div>

        {/* --- FORM CARD --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[340px] lg:max-w-[420px] relative z-10 flex flex-col items-center"
        >
          <LoginHeader isPWA={isPWA} />

          {view === 'client' ? (
            <motion.form
              key="client-view"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleUniversalSubmit}
              className="w-full space-y-6 lg:space-y-8"
            >
              <div className="space-y-4 lg:space-y-6">
                <div className="space-y-1.5 lg:space-y-2">
                  <label
                    htmlFor="universal-identifier"
                    className="block text-[10px] lg:text-xs font-medium uppercase tracking-[0.1em] text-zinc-500"
                  >
                    Celular ou e-mail
                  </label>
                  <div className="relative">
                    <User
                      size={15}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                    />
                    <input
                      id="universal-identifier"
                      type="text"
                      autoComplete="username"
                      inputMode="tel"
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        setClientError('');
                      }}
                      placeholder="(00) 00000-0000 ou seu@email.com"
                      data-testid="input-universal"
                      maxLength={120}
                      autoFocus
                      className="w-full h-12 bg-transparent border border-zinc-800 rounded-xl pl-11 pr-5 text-sm font-medium text-zinc-100 outline-none transition-all lg:h-14 lg:text-base focus:border-gold"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
                  Cliente: seu celular entra direto nos seus horários.
                  <br />
                  Admin: seu e-mail abre o painel.
                </p>
              </div>

              {clientError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[12px] text-red-400 text-center"
                >
                  {clientError}
                </motion.p>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                data-testid="btn-continuar"
                disabled={clientLoading || !input.trim()}
                className="w-full h-11 lg:h-12 text-black font-bold uppercase tracking-[0.15em] text-[12px] rounded-2xl lg:rounded-sm hover:opacity-90 transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: brandColor }}
              >
                {clientLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : looksLikeEmail ? (
                  <>
                    <ShieldCheck size={14} /> Entrar como admin
                  </>
                ) : (
                  'Continuar'
                )}
              </motion.button>

              <div className="flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/agendar')}
                  className="text-[10px] font-medium uppercase tracking-[0.1em] transition-colors cursor-pointer opacity-70 hover:opacity-100"
                  style={{ color: brandColor }}
                >
                  Prefere agendar sem login? Agendar agora →
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer uppercase tracking-[0.1em]"
                >
                  ← Voltar ao início
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <LoginForm
                email={admin.email}
                onEmailChange={(v) => {
                  admin.setEmail(v);
                  admin.setLoginError(null);
                }}
                password={admin.password}
                onPasswordChange={(v) => {
                  admin.setPassword(v);
                  admin.setLoginError(null);
                }}
                showPassword={admin.showPassword}
                onTogglePassword={() => admin.setShowPassword(!admin.showPassword)}
                onSubmit={admin.handleLogin}
                onForgotPassword={admin.onOpenForgot}
                isLoggingIn={admin.isLoggingIn}
                isBlocked={admin.isBlocked}
                attempts={admin.attempts}
                maxAttempts={admin.maxAttempts}
                error={admin.loginError}
              />

              <button
                type="button"
                onClick={() => {
                  setView('client');
                  setInput('');
                  setClientError('');
                }}
                className="w-full mt-4 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer uppercase tracking-[0.1em] flex items-center justify-center gap-1"
              >
                <ArrowLeft size={10} /> Não é admin? Entre com seu celular
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      <ForgotPasswordModal
        isOpen={admin.isForgotOpen}
        onClose={admin.handleCloseForgot}
        recoveryEmail={admin.recoveryEmail}
        onEmailChange={admin.setRecoveryEmail}
        onResetPassword={admin.handleResetPassword}
        isSendingReset={admin.isSendingReset}
        isResetSent={admin.isResetSent}
        dialogRef={admin.dialogRef}
      />

      <LoginToast toast={admin.toast} />
    </div>
  );
};

export default UniversalLogin;
