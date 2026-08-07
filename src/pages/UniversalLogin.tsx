import { useEffect, useState, type FC, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  ArrowLeft,
  User,
  ShieldCheck,
  Smartphone,
  Scissors,
  Lock,
  KeyRound,
  Check,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getClientByPhone } from '../lib/api';
import { saveClientSession } from '../lib/clientSession';
import { useScrollLock } from '../hooks/useScrollLock';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { useAdminLogin } from '../hooks/useAdminLogin';
import {
  resolverLoginProfissional,
  buscarClientesPorNome,
  verificarSenhaCliente,
  criarSenhaCliente,
  type ClientMatch,
} from '../lib/api/clientAuth';
import LoginBackground from '../components/Admin/LoginBackground';
import LoginHeader from '../components/Admin/LoginHeader';
import LoginForm from '../components/Admin/LoginForm';
import ForgotPasswordModal from '../components/Admin/ForgotPasswordModal';
import LoginToast from '../components/Admin/LoginToast';
import { formatPhone } from '../lib/utils';

interface UniversalLoginProps {
  /** Abre direto no modo admin (usado pela rota legada /admin/login). */
  adminMode?: boolean;
  /** E-mail pré-preenchido (deep-link do modo admin). */
  initialEmail?: string;
}

/** Estágios do fluxo do cliente dentro da porta única. */
type ClientStage =
  | { kind: 'id' }
  | { kind: 'no-password'; phone: string; name: string }
  | { kind: 'password'; phone: string; name: string }
  | { kind: 'create'; phone: string; name: string };

/** Resultado da detecção do campo inteligente. */
type IdentifierKind = 'empty' | 'email' | 'phone' | 'name';

function detectKind(input: string): IdentifierKind {
  const trimmed = input.trim();
  if (!trimmed) return 'empty';
  if (trimmed.includes('@')) return 'email';
  if (trimmed.replace(/\D/g, '').length >= 11) return 'phone';
  return 'name';
}

/**
 * Porta Única v3.36 — acesso universal para cliente e admin.
 *
 * Campo inteligente que detecta o que você digitou:
 *   - Celular (11+ dígitos) → cliente. Se criou senha, pede a senha.
 *   - Nome            → resolve: barbeiro (→ painel) ou cliente(s).
 *   - E-mail          → área do profissional (Supabase Auth + senha).
 *
 * Segurança: o painel admin continua exigindo e-mail + senha.
 * Senha do cliente é opcional (bcrypt no banco via RPC).
 */
const UniversalLogin: FC<UniversalLoginProps> = ({ adminMode = false, initialEmail = '' }) => {
  const navigate = useNavigate();
  const [view, setView] = useState<'client' | 'admin'>(adminMode ? 'admin' : 'client');
  const [input, setInput] = useState(initialEmail);
  const [stage, setStage] = useState<ClientStage>({ kind: 'id' });
  const [nameMatches, setNameMatches] = useState<ClientMatch[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const kind = detectKind(input);

  const enterClient = async (phone: string, name: string, hasPassword: boolean) => {
    saveClientSession(phone, name, hasPassword);
    navigate('/cliente');
  };

  // ── Fluxo do cliente a partir de um telefone ──
  const handleClientPhone = async (digits: string) => {
    setClientLoading(true);
    setClientError('');
    try {
      // Cliente tem senha? (needs_password=true → senha criada; false → sem senha)
      // Fail-closed: se a verificação der erro, NUNCA deixar entrar sem senha.
      const status = await verificarSenhaCliente(digits, '');
      if (status?.needs_password) {
        setStage({ kind: 'password', phone: digits, name: status.name || 'Cliente' });
        return;
      }
      // Sem senha → oferece criar senha OU entrar direto (atrito zero).
      const lookup = await getClientByPhone(digits).catch(() => null);
      const name = (lookup as { name?: string } | null)?.name || 'Cliente';
      setStage({ kind: 'no-password', phone: digits, name });
    } catch {
      setClientError('Erro ao buscar seus dados. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  // ── Fluxo do cliente a partir de um match (nome ou desambiguação) ──
  const handleClientMatch = async (match: ClientMatch) => {
    setClientLoading(true);
    setClientError('');
    try {
      if (match.has_password) {
        setStage({ kind: 'password', phone: match.phone, name: match.name });
        return;
      }
      setStage({ kind: 'no-password', phone: match.phone, name: match.name });
    } catch {
      setClientError('Erro ao buscar seus dados. Tente novamente.');
      setClientLoading(false);
    }
  };

  // ── Submit do campo inteligente ──
  const handleUniversalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setClientError('');
    setNameMatches([]);

    // E-mail → modo admin (a senha é o muro)
    if (kind === 'email') {
      admin.setEmail(input.trim());
      setView('admin');
      return;
    }

    // Celular → cliente
    if (kind === 'phone') {
      await handleClientPhone(input.replace(/\D/g, ''));
      return;
    }

    // Nome → resolve identidade
    const name = input.trim();
    setClientLoading(true);
    try {
      const resolved = await resolverLoginProfissional(name).catch(() => null);
      if (resolved?.type === 'profissional') {
        admin.setEmail(resolved.email);
        setView('admin');
        return;
      }
      // Não é barbeiro → procura clientes com esse nome
      const matches = await buscarClientesPorNome(name).catch(() => [] as ClientMatch[]);
      if (matches.length === 0) {
        setClientError(
          'Não encontramos ninguém com esse nome ou celular. Tente com o celular ou agende sem login.'
        );
        return;
      }
      if (matches.length === 1) {
        const single = matches[0];
        if (single) {
          await handleClientMatch(single);
          return;
        }
      }
      setNameMatches(matches);
    } catch {
      setClientError('Erro ao buscar seus dados. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  // ── Login por senha do cliente ──
  const handleClientPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (stage.kind !== 'password') return;
    setClientLoading(true);
    setClientError('');
    try {
      const result = await verificarSenhaCliente(stage.phone, admin.password);
      if (result?.ok) {
        await enterClient(stage.phone, result.name || stage.name, true);
        return;
      }
      setClientError(result?.message || 'Senha incorreta.');
    } catch {
      setClientError('Erro ao verificar a senha. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  // ── Criar senha (cliente) ──
  const handleCreatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (stage.kind !== 'create') return;
    setClientError('');
    if (newPassword.length < 6) {
      setClientError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setClientError('As senhas não coincidem.');
      return;
    }
    setClientLoading(true);
    try {
      const result = await criarSenhaCliente(stage.phone, newPassword);
      if (result?.ok) {
        await enterClient(stage.phone, stage.name, true);
        return;
      }
      setClientError(result?.message || 'Não foi possível criar a senha.');
    } catch {
      setClientError('Erro ao criar a senha. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  const resetClient = () => {
    setInput('');
    setStage({ kind: 'id' });
    setNameMatches([]);
    setNewPassword('');
    setConfirmPassword('');
    setClientError('');
    setClientLoading(false);
    admin.setPassword('');
  };

  // ── Ícone vivo do campo ──
  const fieldIcon =
    kind === 'email' ? (
      <ShieldCheck size={15} className="text-gold" />
    ) : kind === 'phone' ? (
      <Smartphone size={15} className="text-gold" />
    ) : kind === 'name' ? (
      <Scissors size={15} className="text-gold" />
    ) : (
      <User size={15} className="text-zinc-600" />
    );

  const hintText =
    kind === 'email'
      ? 'Profissional detectado — sua senha abre o painel.'
      : kind === 'phone'
        ? 'Cliente — seu celular entra direto nos seus horários.'
        : kind === 'name'
          ? 'Procurando por esse nome...'
          : 'Celular, nome ou e-mail. Qualquer um funciona.';

  const renderClientView = () => {
    // ── Desambiguação por nome ──
    if (nameMatches.length > 1) {
      return (
        <motion.div
          key="name-matches"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-4"
        >
          <div className="text-center space-y-1.5">
            <p className="text-[14px] font-bold text-white">Qual é você?</p>
            <p className="text-[11px] text-zinc-500">
              Encontramos {nameMatches.length} pessoas com esse nome.
            </p>
          </div>
          <div className="space-y-2">
            {nameMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleClientMatch(m)}
                className="w-full flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 hover:border-gold/30 hover:bg-white/[0.05] transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <User size={15} className="text-gold" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[13px] font-semibold text-white group-hover:text-gold transition-colors">
                    {m.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 tabular-nums">{m.phone_masked}</p>
                </div>
                {m.has_password && <Lock size={12} className="text-zinc-600" />}
                <ChevronRight
                  size={14}
                  className="text-zinc-600 group-hover:text-gold transition-colors"
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setNameMatches([]);
              setInput('');
            }}
            className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-[0.1em]"
          >
            ← Voltar
          </button>
        </motion.div>
      );
    }

    // ── Cliente sem senha — entra direto ou cria senha ──
    if (stage.kind === 'no-password') {
      return (
        <motion.div
          key="no-password"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full space-y-4"
        >
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-3">
              <Smartphone size={20} className="text-gold" />
            </div>
            <p className="text-[15px] font-bold text-white">
              Bem-vindo{stage.name !== 'Cliente' ? `, ${stage.name}` : ''}! 👋
            </p>
            <p className="text-[11px] text-zinc-500 tabular-nums">{formatPhone(stage.phone)}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            data-testid="btn-enter-no-password"
            onClick={() => enterClient(stage.phone, stage.name, false)}
            className="w-full h-11 lg:h-12 text-black font-bold uppercase tracking-[0.15em] text-[12px] rounded-2xl lg:rounded-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: brandColor }}
          >
            <Smartphone size={14} /> Entrar agora
          </motion.button>
          <button
            type="button"
            data-testid="btn-go-create-password"
            onClick={() => setStage({ kind: 'create', phone: stage.phone, name: stage.name })}
            className="w-full h-11 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-white hover:border-gold/30 text-[10px] font-bold uppercase tracking-[0.15em] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <KeyRound size={13} /> Criar senha para proteger meu acesso
          </button>
          <button
            type="button"
            onClick={() => setStage({ kind: 'id' })}
            className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-[0.1em]"
          >
            ← Usar outro celular
          </button>
        </motion.div>
      );
    }

    // ── Criar senha (cliente novo) ──
    if (stage.kind === 'create') {
      return (
        <motion.form
          key="create"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleCreatePassword}
          className="w-full space-y-4"
        >
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-3">
              <KeyRound size={20} className="text-gold" />
            </div>
            <p className="text-[15px] font-bold text-white">Crie uma senha</p>
            <p className="text-[11px] text-zinc-500">
              {stage.name || 'Cliente'} — proteja seu acesso aos agendamentos.
            </p>
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)"
              data-testid="input-new-password"
              autoComplete="new-password"
              maxLength={128}
              className="w-full h-12 bg-transparent border border-zinc-800 rounded-xl pl-11 pr-5 text-sm text-zinc-100 outline-none focus:border-gold transition-all"
            />
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              data-testid="input-confirm-password"
              autoComplete="new-password"
              maxLength={128}
              className="w-full h-12 bg-transparent border border-zinc-800 rounded-xl pl-11 pr-5 text-sm text-zinc-100 outline-none focus:border-gold transition-all"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            data-testid="btn-create-password"
            disabled={clientLoading}
            className="w-full h-11 lg:h-12 text-black font-bold uppercase tracking-[0.15em] text-[12px] rounded-2xl lg:rounded-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: brandColor }}
          >
            {clientLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Check size={14} /> Criar senha e entrar
              </>
            )}
          </motion.button>
          <button
            type="button"
            onClick={() => setStage({ kind: 'id' })}
            className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-[0.1em]"
          >
            ← Voltar
          </button>
        </motion.form>
      );
    }

    // ── Senha do cliente (celular com senha criada) ──
    if (stage.kind === 'password') {
      return (
        <motion.form
          key="client-password"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleClientPassword}
          className="w-full space-y-4"
        >
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-3">
              <Lock size={20} className="text-gold" />
            </div>
            <p className="text-[15px] font-bold text-white">
              Bem-vindo de volta{stage.name ? `, ${stage.name}` : ''}!
            </p>
            <p className="text-[11px] text-zinc-500 tabular-nums">{formatPhone(stage.phone)}</p>
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type={admin.showPassword ? 'text' : 'password'}
              value={admin.password}
              onChange={(e) => admin.setPassword(e.target.value)}
              placeholder="Sua senha"
              data-testid="input-client-password"
              autoComplete="current-password"
              maxLength={128}
              autoFocus
              className="w-full h-12 bg-transparent border border-zinc-800 rounded-xl pl-11 pr-5 text-sm text-zinc-100 outline-none focus:border-gold transition-all"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            data-testid="btn-client-login"
            disabled={clientLoading}
            className="w-full h-11 lg:h-12 text-black font-bold uppercase tracking-[0.15em] text-[12px] rounded-2xl lg:rounded-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: brandColor }}
          >
            {clientLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <ShieldCheck size={14} /> Entrar
              </>
            )}
          </motion.button>
          <button
            type="button"
            onClick={() => setStage({ kind: 'id' })}
            className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-[0.1em]"
          >
            ← Usar outro celular
          </button>
        </motion.form>
      );
    }

    // ── Campo inteligente (padrão) ──
    return (
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
              Celular, nome ou e-mail
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">{fieldIcon}</div>
              <input
                id="universal-identifier"
                type="text"
                autoComplete="username"
                inputMode={kind === 'phone' ? 'tel' : 'text'}
                value={input}
                onChange={(e) => {
                  const v = e.target.value;
                  setInput(kind === 'phone' ? formatPhone(v) : v);
                  setClientError('');
                }}
                placeholder="(00) 00000-0000, seu nome ou seu@email.com"
                data-testid="input-universal"
                maxLength={120}
                autoFocus
                className="w-full h-12 bg-transparent border border-zinc-800 rounded-xl pl-11 pr-5 text-sm font-medium text-zinc-100 outline-none transition-all lg:h-14 lg:text-base focus:border-gold"
              />
            </div>
            <motion.p
              key={kind}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-zinc-600 leading-relaxed min-h-[24px]"
            >
              {hintText}
            </motion.p>
          </div>
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
          ) : kind === 'email' ? (
            <>
              <ShieldCheck size={14} /> Entrar como admin
            </>
          ) : kind === 'name' ? (
            <>
              <Scissors size={14} /> Continuar
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
    );
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

          <AnimatePresence mode="wait">
            {view === 'client' ? (
              <motion.div key="client" className="w-full">
                {renderClientView()}
              </motion.div>
            ) : (
              <motion.div
                key="admin"
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
                    resetClient();
                  }}
                  className="w-full mt-4 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer uppercase tracking-[0.1em] flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={10} /> Não é admin? Entre com seu celular
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
