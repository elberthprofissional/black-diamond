import { useEffect, useRef, useState, type FC, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '../lib/supabase';
import { saveClientSession } from '../lib/clientSession';
import { useScrollLock } from '../hooks/useScrollLock';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { useAdminLogin } from '../hooks/useAdminLogin';
import {
  resolverLoginProfissional,
  buscarClientesPorNome,
  verificarLoginCliente,
  criarSenhaCliente,
  criarContaCliente,
  solicitarRecuperacaoCliente,
  redefinirSenhaCliente,
  type ClientMatch,
} from '../lib/api/clientAuth';
import { openWhatsApp } from '../lib/whatsapp';
import LoginForm from '../components/Admin/LoginForm';
import ForgotPasswordModal from '../components/Admin/ForgotPasswordModal';
import LoginToast from '../components/Admin/LoginToast';
import { formatPhone } from '../lib/utils';
import { LoginLeftPanel, LoginMobileBackButton } from './UniversalLoginLeftPanel';
import { LoginMobileTitle, LoginBrand } from './UniversalLoginBrand';
import {
  LoginNameMatches,
  LoginNoPasswordStage,
  LoginCreatePasswordStage,
  LoginPasswordStage,
  LoginRecoverSendStage,
  LoginRecoverCodeStage,
  LoginCreateAccountStage,
  LoginIdentifierForm,
} from './UniversalLoginStages';

interface UniversalLoginProps {
  adminMode?: boolean;
  initialEmail?: string;
}

type ClientStage =
  | { kind: 'id' }
  | { kind: 'no-password'; phone: string; name: string }
  | { kind: 'password'; phone: string; name: string; isEmail?: boolean }
  | { kind: 'create'; phone: string; name: string }
  | { kind: 'create-account' }
  | { kind: 'recover-send'; phone?: string }
  | { kind: 'recover-code'; phone: string; name: string };

type IdentifierKind = 'empty' | 'email' | 'phone' | 'name';

function detectKind(input: string): IdentifierKind {
  const trimmed = input.trim();
  if (!trimmed) return 'empty';
  if (trimmed.includes('@')) return 'email';
  if (trimmed.replace(/\D/g, '').length >= 11) return 'phone';
  return 'name';
}

/**
 * Porta Única v3.41 — Two-Panel Layout (único DOM).
 *
 * Desktop (>=768px): dois painéis grandes lado a lado via CSS grid.
 *   Esquerda (~52%): imagem + texto contextual.
 *   Direita (~48%): form integrado ao painel escuro, SEM card externo.
 * Mobile (<768px): hero imagem no topo + form em fundo preto.
 */
const UniversalLogin: FC<UniversalLoginProps> = ({ adminMode = false, initialEmail = '' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillPhone = searchParams.get('phone') ?? '';
  const [view, setView] = useState<'client' | 'admin'>(adminMode ? 'admin' : 'client');
  const [input, setInput] = useState(initialEmail);
  const initialMode = searchParams.get('mode');
  const [stage, setStage] = useState<ClientStage>(
    initialMode === 'create' ? { kind: 'create-account' } : { kind: 'id' }
  );
  const [nameMatches, setNameMatches] = useState<ClientMatch[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [recoverEmailMasked, setRecoverEmailMasked] = useState('');
  const [recoverCode, setRecoverCode] = useState('');
  const [accountForm, setAccountForm] = useState({ name: '', email: '', phone: '' });
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);

  const admin = useAdminLogin({ initialEmail });
  const { barberPhone, brandLogo, brandName, barberName } = useBarberSettings();
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone;

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) navigate('/admin', { replace: true });
    };
    checkSession();
  }, [navigate]);

  useScrollLock();

  const kind = detectKind(input);

  const displayName = brandName || barberName || 'Black Diamond';
  const words = displayName.split(' ');
  const firstName = words[0] || 'Black';
  const restName = words.slice(1).join(' ') || 'Diamond';

  const enterClient = async (phone: string, name: string, hasPassword: boolean) => {
    saveClientSession(phone, name, hasPassword);
    navigate('/cliente');
  };

  const handleClientIdentifier = async (identifier: string) => {
    setClientLoading(true);
    setClientError('');
    try {
      const isEmail = identifier.includes('@');
      const status = await verificarLoginCliente(identifier, '');
      if (status?.needs_password) {
        setStage({
          kind: 'password',
          phone: isEmail ? identifier : status.phone || identifier,
          name: status.name || 'Cliente',
          isEmail,
        });
        return;
      }
      if (status?.ok === false && !status.needs_password) {
        if (!isEmail || status.phone) {
          setStage({
            kind: 'no-password',
            phone: status.phone || identifier.replace(/\D/g, ''),
            name: status.name || 'Cliente',
          });
          return;
        }
      }
      setClientError(status?.message || 'Não encontramos uma conta com esse telefone/e-mail.');
    } catch {
      setClientError('Erro ao buscar seus dados. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  const prefillRan = useRef(false);
  useEffect(() => {
    if (prefillRan.current || adminMode || !prefillPhone || stage.kind !== 'id' || input) return;
    prefillRan.current = true;
    setInput(formatPhone(prefillPhone));
    void handleClientIdentifier(prefillPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && view === 'client') {
        const email = session.user.email;
        const fullName = session.user.user_metadata?.full_name || '';

        if (email) {
          setClientLoading(true);
          try {
            const { data, error } = await supabase.rpc('buscar_cliente_por_email_auth', {
              p_email: email,
            });

            if (!error && data && data.length > 0) {
              const client = data[0];
              saveClientSession(client.phone, client.name, true);

              if (adminMode) {
                navigate('/admin');
              } else if (prefillPhone) {
                navigate(`/agendar?phone=${client.phone}`);
              } else {
                navigate('/cliente');
              }
            } else {
              setStage({ kind: 'create-account' });
              setIsGoogleAuth(true);
              setAccountForm((prev) => ({ ...prev, email, name: fullName }));
              setClientError('Finalize seu cadastro informando seu WhatsApp.');
            }
          } catch (err) {
            console.error('Erro ao verificar email do google:', err);
          } finally {
            setClientLoading(false);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [view, adminMode, navigate, prefillPhone]);

  useEffect(() => {
    if (!isPWA) return;
    const handlePopState = () => window.close();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isPWA]);

  const handleClientPhone = async (digits: string) => {
    await handleClientIdentifier(digits);
  };

  const handleClientMatch = async (match: ClientMatch) => {
    setClientLoading(true);
    setClientError('');
    try {
      if (match.has_password) {
        setStage({ kind: 'password', phone: match.phone, name: match.name });
        return;
      }
      setStage({ kind: 'no-password', phone: match.phone, name: match.name });
    } finally {
      setClientLoading(false);
    }
  };

  const handleCreatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (stage.kind !== 'create') return;
    if (newPassword.length < 6) {
      setClientError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setClientError('As senhas não coincidem.');
      return;
    }
    setClientLoading(true);
    setClientError('');
    try {
      const res = await criarSenhaCliente(stage.phone, newPassword);
      if (res.ok) {
        await enterClient(stage.phone, stage.name, true);
      } else {
        setClientError(res.message || 'Erro ao criar senha.');
      }
    } catch {
      setClientError('Erro ao criar senha. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  const handleClientPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (stage.kind !== 'password') return;
    if (!admin.password.trim()) {
      setClientError('Digite sua senha.');
      return;
    }
    setClientLoading(true);
    setClientError('');
    try {
      const res = await verificarLoginCliente(stage.phone, admin.password);
      if (res.ok) {
        await enterClient(res.phone || stage.phone, res.name || stage.name, true);
      } else {
        setClientError(res.message || 'Senha incorreta.');
      }
    } catch {
      setClientError('Erro ao verificar senha.');
    } finally {
      setClientLoading(false);
    }
  };

  const handleRecoverSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!recoverIdentifier.trim()) {
      setClientError('Informe seu e-mail ou celular.');
      return;
    }
    setClientLoading(true);
    setClientError('');
    try {
      const res = await solicitarRecuperacaoCliente(recoverIdentifier);
      if (res.ok) {
        setRecoverEmailMasked(res.email_masked || '');
        setStage({
          kind: 'recover-code',
          phone: res.phone || recoverIdentifier,
          name: res.name || 'Cliente',
        });
      } else {
        setClientError(res.message || 'Não foi possível solicitar a recuperação.');
      }
    } catch {
      setClientError('Erro ao solicitar código. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  const handleRecoverSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (stage.kind !== 'recover-code') return;
    if (recoverCode.trim().length !== 6) {
      setClientError('O código deve conter 6 dígitos.');
      return;
    }
    if (newPassword.length < 6) {
      setClientError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setClientError('As senhas não coincidem.');
      return;
    }
    setClientLoading(true);
    setClientError('');
    try {
      const res = await redefinirSenhaCliente(stage.phone, recoverCode.trim(), newPassword);
      if (res.ok) {
        await enterClient(stage.phone, stage.name, true);
      } else {
        setClientError(res.message || 'Código inválido ou expirado.');
      }
    } catch {
      setClientError('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    const { name, email, phone } = accountForm;
    if (!name.trim()) {
      setClientError('Informe seu nome completo.');
      return;
    }
    const rawPhone = phone.replace(/\D/g, '');
    if (rawPhone.length < 10) {
      setClientError('Informe um celular válido com DDD.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setClientError('Informe um e-mail válido para segurança.');
      return;
    }

    let finalPassword = newPassword;
    if (isGoogleAuth) {
      finalPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    } else {
      if (newPassword.length < 6) {
        setClientError('A senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setClientError('As senhas não coincidem.');
        return;
      }
    }

    setClientLoading(true);
    setClientError('');
    try {
      const res = await criarContaCliente({
        name: name.trim(),
        email: email.trim(),
        phone: rawPhone,
        password: finalPassword,
      });
      if (res.ok) {
        await enterClient(rawPhone, name.trim(), true);
      } else {
        setClientError(res.message || 'Erro ao criar conta.');
      }
    } catch {
      setClientError('Erro ao criar conta. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  const handleUniversalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;
    setClientError('');
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 10 && !raw.includes('@')) {
      await handleClientPhone(digits);
      return;
    }
    setClientLoading(true);
    try {
      const prof = await resolverLoginProfissional(raw);
      if (prof.type === 'profissional') {
        admin.setEmail(prof.email);
        setView('admin');
        return;
      }
      if (raw.includes('@')) {
        await handleClientIdentifier(raw);
        return;
      }
      const matches = await buscarClientesPorNome(raw);
      if (matches.length === 0) {
        setClientError('Não encontramos ninguém com esse nome. Digite seu celular com DDD.');
        return;
      }
      if (matches.length === 1 && matches[0]) {
        await handleClientMatch(matches[0]);
        return;
      }
      setNameMatches(matches);
    } catch {
      setClientError('Erro ao buscar dados. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(kind === 'phone' ? formatPhone(value) : value);
    setClientError('');
  };

  const resetClient = () => {
    setInput('');
    setStage({ kind: 'id' });
    setNameMatches([]);
    setClientError('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoverCode('');
    setRecoverEmailMasked('');
    admin.setPassword('');
  };

  const openRecoveryWhatsApp = () => {
    const msg =
      'Oi! Perdi minha senha da Black Diamond e o e-mail de recuperação não chegou. Pode me ajudar?';
    if (barberPhone) openWhatsApp(barberPhone, msg);
    else window.open('https://wa.me', '_blank');
  };

  const handleGoogleLogin = async () => {
    setClientLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/entrar`,
      },
    });
    if (error) {
      setClientError('Erro ao conectar com o Google.');
      setClientLoading(false);
    }
  };

  const handleForgotFromPassword = () => {
    if (stage.kind !== 'password') return;
    setRecoverIdentifier(stage.phone);
    setStage({ kind: 'recover-send', phone: stage.phone });
  };

  const handleResendRecover = () => {
    if (stage.kind !== 'recover-code') return;
    setStage({ kind: 'recover-send', phone: stage.phone });
  };

  const goToCreateAccount = () => {
    setClientError('');
    setStage({ kind: 'create-account' });
  };

  const goToLogin = () => {
    setClientError('');
    setStage({ kind: 'id' });
  };

  /* ══════════════════════════════════════════════════════════════════════
   *  RENDER — stage do cliente
   * ══════════════════════════════════════════════════════════════════════ */
  const renderClientStage = () => {
    if (nameMatches.length > 0) {
      return (
        <LoginNameMatches
          matches={nameMatches}
          query={input.trim()}
          onSelect={handleClientMatch}
          onReset={resetClient}
        />
      );
    }

    switch (stage.kind) {
      case 'no-password':
        return (
          <LoginNoPasswordStage
            name={stage.name}
            phone={stage.phone}
            onEnter={() => enterClient(stage.phone, stage.name, false)}
            onCreatePassword={() =>
              setStage({ kind: 'create', phone: stage.phone, name: stage.name })
            }
            onReset={resetClient}
          />
        );
      case 'create':
        return (
          <LoginCreatePasswordStage
            name={stage.name}
            newPassword={newPassword}
            onNewPasswordChange={setNewPassword}
            confirmPassword={confirmPassword}
            onConfirmPasswordChange={setConfirmPassword}
            error={clientError}
            loading={clientLoading}
            onSubmit={handleCreatePassword}
            onBack={goToLogin}
          />
        );
      case 'password':
        return (
          <LoginPasswordStage
            name={stage.name}
            identifier={stage.phone}
            isEmail={!!stage.isEmail}
            password={admin.password}
            onPasswordChange={admin.setPassword}
            showPassword={admin.showPassword}
            error={clientError}
            loading={clientLoading}
            onSubmit={handleClientPassword}
            onForgot={handleForgotFromPassword}
            onBack={goToLogin}
          />
        );
      case 'recover-send':
        return (
          <LoginRecoverSendStage
            value={recoverIdentifier}
            onChange={setRecoverIdentifier}
            error={clientError}
            loading={clientLoading}
            onSubmit={handleRecoverSend}
            onBack={goToLogin}
          />
        );
      case 'recover-code':
        return (
          <LoginRecoverCodeStage
            emailMasked={recoverEmailMasked}
            code={recoverCode}
            onCodeChange={setRecoverCode}
            newPassword={newPassword}
            onNewPasswordChange={setNewPassword}
            confirmPassword={confirmPassword}
            onConfirmPasswordChange={setConfirmPassword}
            error={clientError}
            loading={clientLoading}
            onSubmit={handleRecoverSubmit}
            onResend={handleResendRecover}
            onWhatsAppHelp={openRecoveryWhatsApp}
            onBack={goToLogin}
          />
        );
      case 'create-account':
        return (
          <LoginCreateAccountStage
            name={accountForm.name}
            email={accountForm.email}
            phone={accountForm.phone}
            onNameChange={(v) => setAccountForm({ ...accountForm, name: v })}
            onEmailChange={(v) => setAccountForm({ ...accountForm, email: v })}
            onPhoneChange={(v) => setAccountForm({ ...accountForm, phone: formatPhone(v) })}
            newPassword={newPassword}
            onNewPasswordChange={setNewPassword}
            confirmPassword={confirmPassword}
            onConfirmPasswordChange={setConfirmPassword}
            error={clientError}
            loading={clientLoading}
            isGoogleAuth={isGoogleAuth}
            onSubmit={handleCreateAccount}
            onBack={goToLogin}
          />
        );
      default:
        return (
          <LoginIdentifierForm
            kind={kind}
            input={input}
            onInputChange={handleInputChange}
            error={clientError}
            loading={clientLoading}
            onSubmit={handleUniversalSubmit}
            onGoogleLogin={handleGoogleLogin}
            onForgotHome={() => {
              setRecoverIdentifier('');
              setRecoverEmailMasked('');
              setRecoverCode('');
              setStage({ kind: 'recover-send' });
            }}
            onNavigateAgendar={() => navigate('/agendar')}
          />
        );
    }
  };

  /* ══════════════════════════════════════════════════════════════════════
   *  RENDER
   * ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-dvh min-h-[100dvh] w-full bg-[#090909] text-white font-sans relative overflow-x-hidden">
      {/* ── Wrapper grid responsivo ── */}
      <div className="min-h-dvh min-h-[100dvh] flex flex-col lg:grid lg:grid-cols-[52fr_48fr]">
        {/* ═══════════════════════════════════════════════════════════
         *  PAINEL ESQUERDO — Imagem + Texto contextual
         * ═══════════════════════════════════════════════════════════ */}
        <LoginLeftPanel view={view} isPWA={isPWA} onBack={() => navigate('/')} />

        {/* ═══════════════════════════════════════════════════════════
         *  PAINEL DIREITO — Form integrado ao fundo escuro
         * ═══════════════════════════════════════════════════════════ */}
        <div
          className="relative bg-[#090909] flex flex-col items-center justify-center
          /* mobile: tela toda, padding app-like */
          min-h-dvh min-h-[100dvh] px-6 pt-14 pb-12
          /* desktop: full-height, centrado */
          lg:min-h-0 lg:px-0 lg:py-0"
        >
          {/* Glow dourado sutil + textura de profundidade */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(212,175,55,0.04) 0%, rgba(212,175,55,0.01) 45%, transparent 70%)',
            }}
            aria-hidden
          />
          {/* Sutileza de profundidade — gradiente vertical muito discreto */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.012) 0%, transparent 30%, rgba(0,0,0,0.08) 100%)',
            }}
            aria-hidden
          />

          {/* Botão voltar — mobile */}
          <LoginMobileBackButton isPWA={isPWA} onBack={() => navigate('/')} />

          {/* Área do form */}
          <div className="relative z-10 w-full max-w-[420px] lg:max-w-[500px] lg:px-10 xl:px-14">
            {/* Título da área — mobile */}
            <LoginMobileTitle view={view} />

            {/* Brand */}
            <LoginBrand
              brandLogo={brandLogo}
              displayName={displayName}
              firstName={firstName}
              restName={restName}
              onLogoClick={() => navigate('/')}
            />

            {/* Tabs */}
            {view === 'client' && (stage.kind === 'id' || stage.kind === 'create-account') && (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6 lg:mb-7">
                <button
                  type="button"
                  onClick={goToLogin}
                  className={`py-2.5 lg:py-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${stage.kind !== 'create-account' ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  data-testid="btn-go-create-account"
                  onClick={goToCreateAccount}
                  className={`py-2.5 lg:py-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${stage.kind === 'create-account' ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Criar conta
                </button>
              </div>
            )}

            {/* ── CONTEÚDO DO FORM ── */}
            {view === 'client' ? (
              renderClientStage()
            ) : (
              /* ADMIN VIEW */
              <div className="w-full space-y-5">
                <div className="text-left space-y-2">
                  <span className="font-cinzel tracking-[0.28em] uppercase text-[12px] font-bold text-gold/90">
                    Área do Barbeiro
                  </span>
                  <p className="text-[15px] text-zinc-400">
                    Entre com seu e-mail e senha para gerenciar a agenda
                  </p>
                </div>
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
              </div>
            )}
          </div>
        </div>
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
