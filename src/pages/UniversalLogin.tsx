import { useEffect, useRef, useState, type FC, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  ArrowLeft,
  User,
  ShieldCheck,
  Smartphone,
  Lock,
  KeyRound,
  Check,
  ChevronRight,
} from 'lucide-react';
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
  // Convite pós-agendamento → /entrar?phone=... pré-preenche e dispara o fluxo.
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
  // ── Conta do cliente v2 ──
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [recoverEmailMasked, setRecoverEmailMasked] = useState('');
  const [recoverCode, setRecoverCode] = useState('');
  const [accountForm, setAccountForm] = useState({ name: '', email: '', phone: '' });

  const admin = useAdminLogin({ initialEmail });
  const { barberPhone } = useBarberSettings();
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

  useScrollLock();

  const kind = detectKind(input);

  const enterClient = async (phone: string, name: string, hasPassword: boolean) => {
    saveClientSession(phone, name, hasPassword);
    navigate('/cliente');
  };

  // ── Fluxo do cliente a partir de um identificador (telefone OU e-mail) ──
  const handleClientIdentifier = async (identifier: string) => {
    setClientLoading(true);
    setClientError('');
    try {
      const isEmail = identifier.includes('@');
      // Cliente tem senha? (needs_password=true → senha criada; false → sem senha)
      // Fail-closed: se a verificação der erro, NUNCA deixar entrar sem senha.
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
        // Sem senha → tela intermediária (entrar direto ou criar senha).
        // Telefone desconhecido ainda entra (atrito zero); e-mail desconhecido
        // sem conta (status sem phone) mostra erro honesto.
        if (!isEmail || status.phone) {
          setStage({
            kind: 'no-password',
            phone: status.phone || identifier.replace(/\D/g, ''),
            name: status.name || 'Cliente',
          });
          return;
        }
      }
      setClientError(status?.message || 'Não encontramos esse cadastro.');
    } catch {
      setClientError('Erro ao buscar seus dados. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  // Pré-preenchimento vindo do convite pós-agendamento (?phone=): preenche o
  // campo e dispara o fluxo automaticamente (senha ou entrada direta).
  // Só roda no modo cliente, uma única vez (flag) — seguro em StrictMode.
  const prefillRan = useRef(false);
  useEffect(() => {
    if (prefillRan.current || adminMode || !prefillPhone || stage.kind !== 'id' || input) return;
    prefillRan.current = true;
    setInput(formatPhone(prefillPhone));
    void handleClientIdentifier(prefillPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Fluxo do cliente a partir de um telefone ──
  const handleClientPhone = async (digits: string) => {
    await handleClientIdentifier(digits);
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

  // ── Enviar código de recuperação (edge function envia o e-mail) ──
  const handleRecoverSend = async (e: FormEvent) => {
    e.preventDefault();
    const prefilled = stage.kind === 'recover-send' ? (stage.phone ?? '') : '';
    const identifier = recoverIdentifier.trim() || prefilled;
    setClientLoading(true);
    setClientError('');
    setRecoverEmailMasked('');
    try {
      const result = await solicitarRecuperacaoCliente(identifier);
      if (result.ok) {
        setStage({
          kind: 'recover-code',
          phone: result.phone || identifier.replace(/\D/g, ''),
          name: result.name || 'Cliente',
        });
        setRecoverEmailMasked(result.email_masked || '');
        return;
      }
      if (result.needs_password === false && result.phone) {
        // Cliente sem senha → entra direto
        await enterClient(result.phone, result.name || 'Cliente', false);
        return;
      }
      setClientError(
        result.message ||
          (result.no_email
            ? 'Este cadastro ainda não tem e-mail. Use a opção abaixo.'
            : 'Não foi possível enviar o código.')
      );
    } catch {
      setClientError('Erro ao enviar o código. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  // ── Validar código + definir nova senha ──
  const handleRecoverSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (stage.kind !== 'recover-code') return;
    setClientLoading(true);
    setClientError('');
    if (recoverCode.length !== 6) {
      setClientError('Digite o código de 6 dígitos.');
      setClientLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      setClientError('A nova senha precisa ter pelo menos 6 caracteres.');
      setClientLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setClientError('As senhas não coincidem.');
      setClientLoading(false);
      return;
    }
    try {
      const result = await redefinirSenhaCliente(stage.phone, recoverCode, newPassword);
      if (result.ok) {
        await enterClient(stage.phone, stage.name, true);
        return;
      }
      setClientError(result.message || 'Código inválido ou expirado.');
    } catch {
      setClientError('Erro ao redefinir a senha. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  // ── Criar conta completa (nome + e-mail + telefone + senha) ──
  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setClientLoading(true);
    setClientError('');
    if (accountForm.name.trim().length < 2) {
      setClientError('Informe seu nome.');
      setClientLoading(false);
      return;
    }
    const cleanPhone = accountForm.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setClientError('Informe um celular válido com DDD.');
      setClientLoading(false);
      return;
    }
    if (newPassword.length < 6 || newPassword !== confirmPassword) {
      setClientError(
        newPassword.length < 6
          ? 'A senha precisa ter pelo menos 6 caracteres.'
          : 'As senhas não coincidem.'
      );
      setClientLoading(false);
      return;
    }
    try {
      // 1. Tenta criar conta no Supabase Auth em segundo plano se houver e-mail
      if (accountForm.email.includes('@') && typeof supabase.auth?.signUp === 'function') {
        void Promise.resolve(
          supabase.auth.signUp({
            email: accountForm.email.trim(),
            password: newPassword,
            options: {
              data: { name: accountForm.name.trim(), phone: cleanPhone },
            },
          })
        )
          .then(({ data }) => {
            if (data?.user) {
              void Promise.resolve(
                supabase.rpc('sync_client_user', {
                  p_name: accountForm.name.trim(),
                  p_phone: cleanPhone,
                  p_email: accountForm.email.trim(),
                })
              ).catch(() => {});
            }
          })
          .catch(() => {});
      }

      // 2. RPC de criação de conta (persiste dados, aplica senha e gera sessão)
      const result = await criarContaCliente({
        name: accountForm.name.trim(),
        email: accountForm.email.trim(),
        phone: cleanPhone,
        password: newPassword,
      });

      if (result.ok) {
        await enterClient(result.phone || cleanPhone, result.name || accountForm.name, true);
        return;
      }
      setClientError(result.message || 'Não foi possível criar a conta.');
    } catch {
      setClientError('Erro ao criar a conta. Tente novamente.');
    } finally {
      setClientLoading(false);
    }
  };

  // ── Submit do campo inteligente ──
  const handleUniversalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setClientError('');
    setNameMatches([]);

    // E-mail → profissional (admin) ou cliente (conta v2)
    if (kind === 'email') {
      setClientLoading(true);
      try {
        const resolved = await resolverLoginProfissional(input.trim()).catch(() => null);
        if (resolved?.type === 'profissional') {
          admin.setEmail(input.trim());
          setView('admin');
          return;
        }
        // Não é profissional → tenta conta de cliente (login por e-mail)
        await handleClientIdentifier(input.trim());
        return;
      } catch {
        setClientError('Erro ao buscar seus dados. Tente novamente.');
      } finally {
        setClientLoading(false);
      }
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

  // ── Login por senha do cliente (telefone OU e-mail) ──
  const handleClientPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (stage.kind !== 'password') return;
    setClientLoading(true);
    setClientError('');
    try {
      const result = await verificarLoginCliente(stage.phone, admin.password);
      if (result?.ok) {
        const phone = result.phone || stage.phone.replace(/\D/g, '');
        await enterClient(phone, result.name || stage.name, true);
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
    setRecoverIdentifier('');
    setRecoverEmailMasked('');
    setRecoverCode('');
    setAccountForm({ name: '', email: '', phone: '' });
    admin.setPassword('');
  };

  /** Abre o WhatsApp do barbeiro como fallback de recuperação. */
  const openRecoveryWhatsApp = () => {
    const msg = `Oi! Perdi minha senha da Black Diamond e o e-mail de recuperação não chegou. Pode me ajudar?`;
    if (barberPhone) {
      openWhatsApp(barberPhone, msg);
    } else {
      window.open('https://wa.me', '_blank');
    }
  };

  // ── Ícone e texto de apoio do campo (fixos: a visão do cliente é por celular) ──
  const fieldIcon = <Smartphone size={16} className="text-gold" />;

  const hintText = 'Sem senha? Você entra do mesmo jeito.';

  const renderClientView = () => {
    // ── Seleção entre múltiplos clientes com o mesmo nome ──
    if (nameMatches.length > 0) {
      return (
        <motion.div
          key="client-matches"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full space-y-4"
        >
          <div className="text-center space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
              Desambiguação
            </p>
            <h2 className="text-lg font-bold text-white tracking-tight">Qual é você?</h2>
            <p className="text-[11px] text-zinc-500">
              Encontramos mais de um cliente com o nome &quot;{input.trim()}&quot;. Escolha o seu:
            </p>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {nameMatches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => handleClientMatch(match)}
                className="w-full p-3.5 rounded-xl bg-white/[0.03] hover:bg-gold/10 border border-white/[0.06] hover:border-gold/30 text-left transition-all group flex items-center justify-between cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-gold transition-colors">
                    {match.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono tracking-wider">
                    {match.phone_masked}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                  Selecionar →
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={resetClient}
            className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer uppercase tracking-[0.1em] pt-2"
          >
            ← Digitar meu número completo
          </button>
        </motion.div>
      );
    }

    // ── Cliente sem senha: pode entrar direto OU criar senha ──
    if (stage.kind === 'no-password') {
      return (
        <motion.div
          key="no-password"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-4 text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-2">
            <User size={20} className="text-gold" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-white">Olá, {stage.name || 'Cliente'}!</p>
            <p className="text-[11px] text-zinc-500 font-mono">{formatPhone(stage.phone)}</p>
          </div>

          <div className="space-y-2.5 pt-2">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              data-testid="btn-enter-no-password"
              onClick={() => enterClient(stage.phone, stage.name, false)}
              className="w-full h-12 text-black font-extrabold uppercase tracking-[0.15em] text-[12px] rounded-xl transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-gold via-amber-400 to-gold shadow-lg shadow-gold/20 hover:shadow-gold/30 cursor-pointer"
            >
              Entrar direto no painel <ChevronRight size={16} />
            </motion.button>

            <button
              type="button"
              data-testid="btn-go-create-password"
              onClick={() => setStage({ kind: 'create', phone: stage.phone, name: stage.name })}
              className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              🔒 Criar uma senha para proteger meu acesso
            </button>
          </div>

          <button
            type="button"
            onClick={resetClient}
            className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-[0.1em] pt-2 cursor-pointer"
          >
            ← Entrar com outro número
          </button>
        </motion.div>
      );
    }

    // ── Criar senha pela primeira vez ──
    if (stage.kind === 'create') {
      return (
        <motion.form
          key="client-create-password"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreatePassword}
          className="w-full space-y-4"
        >
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-2">
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
              className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-5 text-sm text-zinc-100 outline-none transition-all focus:border-gold focus:bg-white/[0.05]"
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
              className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-5 text-sm text-zinc-100 outline-none transition-all focus:border-gold focus:bg-white/[0.05]"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            data-testid="btn-create-password"
            disabled={clientLoading}
            className="w-full h-12 text-black font-extrabold uppercase tracking-[0.15em] text-[12px] rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-gold via-amber-400 to-gold shadow-lg shadow-gold/20 hover:shadow-gold/30 cursor-pointer"
          >
            {clientLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Check size={16} /> Criar senha e entrar
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleClientPassword}
          className="w-full space-y-4"
        >
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-2">
              <Lock size={20} className="text-gold" />
            </div>
            <p className="text-[15px] font-bold text-white">
              Bem-vindo de volta{stage.name ? `, ${stage.name}` : ''}!
            </p>
            <p className="text-[11px] text-zinc-500 tabular-nums">
              {stage.isEmail ? stage.phone : formatPhone(stage.phone)}
            </p>
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
              className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-5 text-sm text-zinc-100 outline-none transition-all focus:border-gold focus:bg-white/[0.05]"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            data-testid="btn-client-login"
            disabled={clientLoading}
            className="w-full h-12 text-black font-extrabold uppercase tracking-[0.15em] text-[12px] rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-gold via-amber-400 to-gold shadow-lg shadow-gold/20 hover:shadow-gold/30 cursor-pointer"
          >
            {clientLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <ShieldCheck size={16} /> Entrar
              </>
            )}
          </motion.button>
          <button
            type="button"
            onClick={() => setStage({ kind: 'id' })}
            className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-[0.1em]"
          >
            ← Usar outro telefone/e-mail
          </button>
          <button
            type="button"
            onClick={() => {
              setRecoverIdentifier(stage.phone);
              setStage({ kind: 'recover-send', phone: stage.phone });
            }}
            className="w-full text-center text-[10px] text-zinc-500 hover:text-gold transition-colors cursor-pointer uppercase tracking-[0.1em]"
          >
            Esqueci minha senha
          </button>
        </motion.form>
      );
    }

    // ── Recuperar senha (solicitar código) ──
    if (stage.kind === 'recover-send') {
      return (
        <motion.form
          key="recover-send"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleRecoverSend}
          className="w-full space-y-4"
        >
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-2">
              <KeyRound size={20} className="text-gold" />
            </div>
            <p className="text-[15px] font-bold text-white">Recuperar minha senha</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Enviaremos um código para o e-mail cadastrado na sua conta.
            </p>
          </div>
          <div className="relative">
            <ShieldCheck
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
            />
            <input
              type="text"
              value={recoverIdentifier}
              onChange={(e) => setRecoverIdentifier(e.target.value)}
              placeholder="Seu e-mail ou celular com DDD"
              data-testid="input-recover-identifier"
              autoComplete="username"
              maxLength={120}
              autoFocus
              className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-5 text-sm text-zinc-100 outline-none transition-all focus:border-gold focus:bg-white/[0.05]"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            data-testid="btn-recover-send"
            disabled={clientLoading || !recoverIdentifier.trim()}
            className="w-full h-12 text-black font-extrabold uppercase tracking-[0.15em] text-[12px] rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-gold via-amber-400 to-gold shadow-lg shadow-gold/20 hover:shadow-gold/30 cursor-pointer"
          >
            {clientLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <ChevronRight size={16} /> Enviar código por e-mail
              </>
            )}
          </motion.button>
          {clientError && <p className="text-[12px] text-red-400 text-center">{clientError}</p>}
          <button
            type="button"
            onClick={() => setStage({ kind: 'id' })}
            className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer uppercase tracking-[0.1em]"
          >
            ← Voltar para o login
          </button>
        </motion.form>
      );
    }

    // ── Recuperar senha (código recebido por e-mail) ──
    if (stage.kind === 'recover-code') {
      return (
        <motion.form
          key="recover-code"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleRecoverSubmit}
          className="w-full space-y-4"
        >
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-2">
              <KeyRound size={20} className="text-gold" />
            </div>
            <p className="text-[15px] font-bold text-white">Código de verificação</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Enviamos um código de 6 dígitos para{' '}
              <b className="text-gold font-mono">{recoverEmailMasked || 'seu e-mail'}</b>.
            </p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              value={recoverCode}
              onChange={(e) => setRecoverCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              data-testid="input-recover-code"
              maxLength={6}
              autoFocus
              className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl text-center text-xl tracking-[0.5em] font-mono font-bold text-gold outline-none transition-all focus:border-gold focus:bg-white/[0.05]"
            />
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha (mín. 6 caracteres)"
                data-testid="input-recover-new-password"
                autoComplete="new-password"
                maxLength={128}
                className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-5 text-sm text-zinc-100 outline-none transition-all focus:border-gold focus:bg-white/[0.05]"
              />
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                data-testid="input-recover-confirm-password"
                autoComplete="new-password"
                maxLength={128}
                className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-5 text-sm text-zinc-100 outline-none transition-all focus:border-gold focus:bg-white/[0.05]"
              />
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            data-testid="btn-recover-submit"
            disabled={clientLoading || recoverCode.length !== 6 || newPassword.length < 6}
            className="w-full h-12 text-black font-extrabold uppercase tracking-[0.15em] text-[12px] rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-gold via-amber-400 to-gold shadow-lg shadow-gold/20 hover:shadow-gold/30 cursor-pointer"
          >
            {clientLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <ShieldCheck size={16} /> Redefinir senha
              </>
            )}
          </motion.button>
          {clientError && <p className="text-[12px] text-red-400 text-center">{clientError}</p>}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setStage({ kind: 'recover-send', phone: stage.phone })}
              className="w-full text-center text-[10px] text-zinc-500 hover:text-gold transition-colors cursor-pointer uppercase tracking-[0.1em]"
            >
              ↻ Reenviar código
            </button>
            <button
              type="button"
              onClick={openRecoveryWhatsApp}
              className="w-full text-center text-[10px] text-zinc-500 hover:text-gold transition-colors cursor-pointer uppercase tracking-[0.1em]"
            >
              💬 Fale com a barbearia no WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setStage({ kind: 'id' })}
              className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer uppercase tracking-[0.1em]"
            >
              ← Voltar
            </button>
          </div>
        </motion.form>
      );
    }

    // ── Criar conta de cliente ──
    if (stage.kind === 'create-account') {
      return (
        <motion.form
          key="client-create-account"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          onSubmit={handleCreateAccount}
          className="w-full space-y-6"
        >
          <div className="text-center space-y-1.5 mb-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Criar sua conta</h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Cadastre-se para agendar, reagendar e acompanhar seu histórico.
            </p>
          </div>

          <div className="space-y-4">
            {/* Bloco: Dados Pessoais */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Nome completo
                </label>
                <div className="relative group">
                  <User
                    size={15}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors"
                  />
                  <input
                    type="text"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    placeholder="Seu nome"
                    data-testid="input-account-name"
                    autoComplete="name"
                    maxLength={80}
                    autoFocus
                    className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-5 text-sm text-white placeholder:text-zinc-600 outline-none transition-all focus:border-amber-400/80 focus:bg-white/[0.05]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    WhatsApp
                  </label>
                  <div className="relative group">
                    <Smartphone
                      size={15}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors"
                    />
                    <input
                      type="tel"
                      value={accountForm.phone}
                      onChange={(e) =>
                        setAccountForm({ ...accountForm, phone: formatPhone(e.target.value) })
                      }
                      placeholder="(00) 90000-0000"
                      data-testid="input-account-phone"
                      autoComplete="tel"
                      maxLength={15}
                      className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-all focus:border-amber-400/80 focus:bg-white/[0.05]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    E-mail
                  </label>
                  <div className="relative group">
                    <ShieldCheck
                      size={15}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors"
                    />
                    <input
                      type="email"
                      value={accountForm.email}
                      onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                      placeholder="seu@email.com"
                      data-testid="input-account-email"
                      autoComplete="email"
                      maxLength={120}
                      className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-all focus:border-amber-400/80 focus:bg-white/[0.05]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco: Senha de Acesso */}
            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    Criar Senha
                  </label>
                  <div className="relative group">
                    <Lock
                      size={15}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mín. 6 caracteres"
                      data-testid="input-account-password"
                      autoComplete="new-password"
                      maxLength={128}
                      className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-all focus:border-amber-400/80 focus:bg-white/[0.05]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    Confirmar Senha
                  </label>
                  <div className="relative group">
                    <Lock
                      size={15}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      data-testid="input-account-confirm"
                      autoComplete="new-password"
                      maxLength={128}
                      className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-all focus:border-amber-400/80 focus:bg-white/[0.05]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {clientError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[12px] font-medium text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg p-2.5"
            >
              {clientError}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            data-testid="btn-account-submit"
            disabled={clientLoading}
            className="w-full h-12 text-black font-extrabold uppercase tracking-[0.15em] text-[12px] rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-400/10 cursor-pointer"
          >
            {clientLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Check size={16} /> Criar minha conta
              </>
            )}
          </motion.button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setStage({ kind: 'id' })}
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Já possui conta? <span className="text-amber-400 font-bold underline">Entrar →</span>
            </button>
          </div>
        </motion.form>
      );
    }

    // ── Campo inteligente (padrão - Entrar na Barbearia) ──
    return (
      <motion.form
        key="client-view"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25 }}
        onSubmit={handleUniversalSubmit}
        className="w-full space-y-6"
      >
        <div className="text-center space-y-1.5 mb-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Acesse sua conta</h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Digite seu WhatsApp ou E-mail para visualizar e gerenciar seus horários.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="universal-identifier"
            className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400"
          >
            Seu celular ou e-mail
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-zinc-500 group-focus-within:text-amber-400">
              {fieldIcon}
            </div>
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
              placeholder="(00) 90000-0000 ou seu e-mail"
              data-testid="input-universal"
              maxLength={120}
              autoFocus
              className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-5 text-sm font-medium text-white outline-none transition-all focus:border-amber-400/80 focus:bg-white/[0.05] placeholder:text-zinc-600"
            />
          </div>
          <motion.p
            key={kind}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-zinc-500 text-center min-h-[16px]"
          >
            {hintText}
          </motion.p>
        </div>

        {clientError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[12px] font-medium text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg p-2.5"
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
          className="w-full h-12 text-black font-extrabold uppercase tracking-[0.15em] text-[12px] rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-400/10 cursor-pointer"
        >
          {clientLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Continuar <ChevronRight size={16} />
            </>
          )}
        </motion.button>

        <div className="border-t border-white/[0.06] pt-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <button
              type="button"
              data-testid="btn-go-create-account"
              onClick={() => setStage({ kind: 'create-account' })}
              className="text-amber-400 hover:underline transition-colors cursor-pointer"
            >
              Criar uma conta →
            </button>
            <button
              type="button"
              data-testid="btn-go-recover-home"
              onClick={() => {
                setRecoverIdentifier('');
                setRecoverEmailMasked('');
                setRecoverCode('');
                setStage({ kind: 'recover-send' });
              }}
              className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Esqueci minha senha
            </button>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => navigate('/agendar')}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              Agendar sem login →
            </button>
          </div>
        </div>
      </motion.form>
    );
  };

  return (
    <div className="h-screen w-full bg-[#080808] text-white flex relative overflow-hidden font-sans select-none">
      <LoginBackground subtitle="Agende seu horário, consulte ou cancele — tudo em um só lugar." />

      {/* --- ACCESS SECTION --- */}
      <div className="flex-1 h-full flex flex-col items-center justify-center p-4 sm:p-8 lg:p-24 relative bg-[#080808] overflow-y-auto">
        {/* Mobile Background Ambient Scrim */}
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
          <img
            src="/assets/login.webp"
            alt="Background"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover grayscale opacity-[0.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080808] via-[#080808]/90 to-[#080808]" />
        </div>

        <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-400/5 rounded-full blur-[120px]" />
        </div>

        {/* --- FORM CONTAINER --- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[400px] sm:max-w-[440px] lg:max-w-[420px] relative z-10 my-auto"
        >
          <div className="w-full rounded-2xl lg:rounded-none bg-white/[0.03] sm:bg-white/[0.04] lg:bg-transparent border border-white/[0.08] lg:border-none backdrop-blur-md lg:backdrop-blur-none p-5 sm:p-8 lg:p-0 shadow-xl lg:shadow-none flex flex-col items-center">
            <LoginHeader isPWA={isPWA} />

            {/* Sleek Line Tabs (Entrar | Criar Conta) */}
            {view === 'client' && (stage.kind === 'id' || stage.kind === 'create-account') && (
              <div className="w-full flex border-b border-white/10 mt-6 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setClientError('');
                    setStage({ kind: 'id' });
                  }}
                  className={`flex-1 py-3 text-[12px] font-bold tracking-wider uppercase transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                    stage.kind !== 'create-account'
                      ? 'text-amber-400 border-amber-400'
                      : 'text-zinc-500 hover:text-zinc-300 border-transparent'
                  }`}
                >
                  <Smartphone size={14} /> Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClientError('');
                    setStage({ kind: 'create-account' });
                  }}
                  className={`flex-1 py-3 text-[12px] font-bold tracking-wider uppercase transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                    stage.kind === 'create-account'
                      ? 'text-amber-400 border-amber-400'
                      : 'text-zinc-500 hover:text-zinc-300 border-transparent'
                  }`}
                >
                  <User size={14} /> Criar Conta
                </button>
              </div>
            )}

            <div className="w-full">
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
                    <div className="text-center space-y-2 mb-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
                        Barbearia
                      </p>
                      <h1 className="text-2xl font-bold text-white tracking-tight">
                        Acesso da Barbearia
                      </h1>
                      <p className="text-[11px] lg:text-xs text-zinc-400 leading-relaxed">
                        Entre com seu e-mail e senha para gerenciar sua agenda.
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

                    <button
                      type="button"
                      onClick={() => {
                        setView('client');
                        resetClient();
                      }}
                      className="w-full mt-6 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer uppercase tracking-[0.1em] flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft size={12} /> Não é admin? Voltar para o agendamento
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
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
