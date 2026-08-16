import { useEffect, useRef, useState, type FC, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Loader2, ArrowLeft, ChevronRight, Check } from 'lucide-react';
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
      const res = await criarContaCliente({
        name: name.trim(),
        email: email.trim(),
        phone: rawPhone,
        password: newPassword,
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

  const inputClass =
    'w-full h-[54px] bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.18] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 rounded-xl px-4 text-[15px] text-white placeholder:text-zinc-500/60 outline-none transition-all duration-200';
  const labelClass =
    'block text-[13px] font-semibold text-zinc-300 mb-2 uppercase tracking-[0.1em]';

  /* ══════════════════════════════════════════════════════════════════════
   *  RENDER
   * ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-dvh min-h-[100dvh] w-full bg-[#090909] text-white font-sans relative overflow-x-hidden">
      {/* ── Wrapper grid responsivo ── */}
      <div className="min-h-dvh min-h-[100dvh] flex flex-col lg:grid lg:grid-cols-[52fr_48fr]">
        {/* ═══════════════════════════════════════════════════════════
         *  PAINEL ESQUERDO — Imagem + Texto contextual
         *  Mobile: hero imagem ~30vh no topo
         *  Desktop: painel grande com imagem cover + texto sobre
         * ═══════════════════════════════════════════════════════════ */}
        <div
          className="relative overflow-hidden
          /* mobile: escondido — mobile usa só o painel direito */
          hidden
          /* desktop: painel grande visível */
          lg:block lg:h-auto lg:min-h-0 lg:col-span-1"
        >
          {/* Foto */}
          <img
            src="/assets/cadastrar-logar.webp"
            alt=""
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50
            lg:bg-gradient-to-r lg:from-transparent lg:via-black/15 lg:to-[#090909]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.45) 100%)',
            }}
          />
          <div className="absolute inset-0 film-grain" />

          {/* Gradiente de transição — borda direita (desktop) — estreito, só suaviza a borda */}
          <div
            className="hidden lg:block absolute inset-y-0 right-0 w-14 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent, #090909)' }}
            aria-hidden
          />

          {/* Gradiente de transição — borda inferior (mobile) */}
          <div
            className="lg:hidden absolute inset-x-0 bottom-0 h-20 pointer-events-none"
            style={{ background: 'linear-gradient(to top, #090909, transparent)' }}
            aria-hidden
          />

          {/* Botão voltar */}
          {!isPWA && (
            <button
              onClick={() => navigate('/')}
              aria-label="Voltar"
              className="absolute top-4 left-4 z-20 text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-2 cursor-pointer py-2 px-3 rounded-xl border border-white/[0.08] bg-black/30 hover:bg-black/50 tracking-wider uppercase backdrop-blur-sm lg:top-6 lg:px-3.5"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          )}

          {/* Texto contextual — só desktop, posição premium no terço inferior */}
          <div className="hidden lg:flex absolute inset-0 flex-col justify-end pl-14 xl:pl-20 pr-24 pb-20">
            <div className="max-w-[400px]">
              {/* Linha dourada sutil */}
              <div className="w-8 h-px bg-gold/40 mb-5" aria-hidden />
              {view === 'admin' ? (
                <>
                  <h1 className="text-[26px] xl:text-[30px] leading-[1.1] font-black text-white/90 tracking-[0.04em] uppercase mb-3">
                    Área do Barbeiro
                  </h1>
                  <p className="text-[14px] xl:text-[15px] text-zinc-400/85 leading-[1.7]">
                    Sua agenda, seus clientes e seus atendimentos em um só lugar.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-[26px] xl:text-[30px] leading-[1.1] font-black text-white/90 tracking-[0.04em] uppercase mb-3">
                    Área do Cliente
                  </h1>
                  <p className="text-[14px] xl:text-[15px] text-zinc-400/85 leading-[1.7]">
                    Agende seu horário e cuide do seu estilo com quem entende.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
         *  PAINEL DIREITO — Form integrado ao fundo escuro
         *  SEM card externo — o form vive direto no painel.
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
          {!isPWA && (
            <button
              onClick={() => navigate('/')}
              aria-label="Voltar"
              className="lg:hidden absolute top-4 left-4 z-20 text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-2 cursor-pointer py-2 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] tracking-wider uppercase backdrop-blur-sm"
            >
              <ArrowLeft size={13} />
            </button>
          )}

          {/* Área do form */}
          <div className="relative z-10 w-full max-w-[420px] lg:max-w-[500px] lg:px-10 xl:px-14">
            {/* Título da área — mobile */}
            <div className="lg:hidden mb-7 text-center">
              <span className="font-cinzel tracking-[0.25em] uppercase text-[12px] font-bold text-gold/85">
                {view === 'admin' ? 'Área do Barbeiro' : 'Área do Cliente'}
              </span>
              <p className="text-[14px] text-zinc-400/90 mt-2.5 leading-relaxed">
                {view === 'admin'
                  ? 'Entre com seu e-mail e senha para gerenciar a agenda.'
                  : 'Entre para agendar e acompanhar seu atendimento.'}
              </p>
            </div>

            {/* Brand */}
            <div className="mb-4 lg:mb-5 text-center">
              <div
                className="relative mb-2 lg:mb-2.5 inline-block cursor-pointer"
                onClick={() => navigate('/')}
              >
                <div className="logo-ring" aria-hidden />
                <div className="w-14 h-14 lg:w-[72px] lg:h-[72px] rounded-2xl bg-[#111] border border-white/[0.08] p-1.5 lg:p-2 flex items-center justify-center overflow-hidden">
                  {brandLogo ? (
                    <img
                      src={brandLogo}
                      alt={displayName}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <img
                      src="/assets/logo.webp"
                      alt={displayName}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  )}
                </div>
              </div>
              <h2 className="text-[26px] lg:text-[32px] leading-none font-black text-white tracking-[0.08em] lg:tracking-[0.1em] uppercase">
                {firstName}
              </h2>
              <h2 className="gold-engraved font-cinzel text-[20px] lg:text-[26px] font-bold leading-none mt-1 lg:mt-1.5 tracking-[0.08em] lg:tracking-[0.1em] uppercase">
                {restName}
              </h2>
              {/* Linha dourada — mobile: simples; desktop: ornament divider */}
              <div className="mt-3 w-8 h-px bg-gold/50 mx-auto lg:hidden" aria-hidden />
              <div className="mt-3.5 hidden lg:block ornament-divider">
                <span className="ornament-divider__line" />
                <span className="ornament-divider__gem" />
                <span className="ornament-divider__line ornament-divider__line--r" />
              </div>
            </div>

            {/* Tabs */}
            {view === 'client' && (stage.kind === 'id' || stage.kind === 'create-account') && (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6 lg:mb-7">
                <button
                  type="button"
                  onClick={() => {
                    setClientError('');
                    setStage({ kind: 'id' });
                  }}
                  className={`py-2.5 lg:py-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${stage.kind !== 'create-account' ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClientError('');
                    setStage({ kind: 'create-account' });
                  }}
                  className={`py-2.5 lg:py-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${stage.kind === 'create-account' ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Criar conta
                </button>
              </div>
            )}

            {/* ── CONTEÚDO DO FORM ── */}
            {view === 'client' ? (
              /* CLIENT VIEW */
              (() => {
                if (nameMatches.length > 0) {
                  return (
                    <div className="w-full space-y-4">
                      <div className="text-left space-y-1">
                        <h2 className="text-lg font-bold text-white tracking-tight">
                          Qual é você?
                        </h2>
                        <p className="text-xs text-zinc-400">
                          Encontramos mais de um cliente com o nome &quot;{input.trim()}&quot;.
                          Escolha o seu:
                        </p>
                      </div>
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                        {nameMatches.map((match) => (
                          <button
                            key={match.id}
                            type="button"
                            onClick={() => handleClientMatch(match)}
                            className="w-full p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-gold/25 text-left transition-all group flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <p className="text-sm font-semibold text-white group-hover:text-[#d4af37] transition-colors">
                                {match.name}
                              </p>
                              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                                {match.phone_masked}
                              </p>
                            </div>
                            <ChevronRight
                              size={16}
                              className="text-zinc-600 group-hover:text-white"
                            />
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={resetClient}
                        className="w-full text-center text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer pt-1"
                      >
                        ← Digitar número completo
                      </button>
                    </div>
                  );
                }

                if (stage.kind === 'no-password') {
                  return (
                    <div className="w-full space-y-5">
                      <div className="space-y-1 text-left">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                          Olá, {stage.name || 'Cliente'}
                        </h2>
                        <p className="text-xs text-zinc-400 font-mono">
                          {formatPhone(stage.phone)}
                        </p>
                      </div>
                      <div className="space-y-2.5">
                        <button
                          type="button"
                          data-testid="btn-enter-no-password"
                          onClick={() => enterClient(stage.phone, stage.name, false)}
                          className="w-full h-14 bg-gradient-to-r from-[#f0d060] via-[#d4af37] to-[#b8923f] hover:brightness-110 text-black font-bold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/25 cursor-pointer active:scale-[0.99]"
                        >
                          <span>Entrar no painel</span>
                        </button>
                        <button
                          type="button"
                          data-testid="btn-go-create-password"
                          onClick={() =>
                            setStage({ kind: 'create', phone: stage.phone, name: stage.name })
                          }
                          className="w-full h-14 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.15] text-sm font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span>Criar uma senha para proteger meu acesso</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={resetClient}
                        className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        ← Entrar com outro número
                      </button>
                    </div>
                  );
                }

                if (stage.kind === 'create') {
                  return (
                    <form onSubmit={handleCreatePassword} className="w-full space-y-4">
                      <div className="text-left space-y-1">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                          Criar uma senha
                        </h2>
                        <p className="text-xs text-zinc-400">
                          {stage.name || 'Cliente'} — defina uma senha para proteger seu acesso.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5 text-left">
                          <label className={labelClass}>Nova senha</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo de 6 caracteres"
                            data-testid="input-new-password"
                            autoComplete="new-password"
                            maxLength={128}
                            className={inputClass}
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className={labelClass}>Confirmar senha</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repita sua nova senha"
                            data-testid="input-confirm-password"
                            autoComplete="new-password"
                            maxLength={128}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      {clientError && (
                        <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                          {clientError}
                        </p>
                      )}
                      <button
                        type="submit"
                        data-testid="btn-create-password"
                        disabled={clientLoading}
                        className="w-full h-14 bg-gradient-to-r from-[#f0d060] via-[#d4af37] to-[#b8923f] hover:brightness-110 text-black font-bold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                      >
                        {clientLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <span>Criar senha e entrar</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStage({ kind: 'id' })}
                        className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        ← Voltar
                      </button>
                    </form>
                  );
                }

                if (stage.kind === 'password') {
                  return (
                    <form onSubmit={handleClientPassword} className="w-full space-y-4">
                      <div className="text-left space-y-1">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                          Bem-vindo{stage.name ? `, ${stage.name}` : ''}
                        </h2>
                        <p className="text-xs text-zinc-400 font-mono">
                          {stage.isEmail ? stage.phone : formatPhone(stage.phone)}
                        </p>
                      </div>
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-center justify-between">
                          <label className={labelClass}>Sua senha</label>
                          <button
                            type="button"
                            onClick={() => {
                              setRecoverIdentifier(stage.phone);
                              setStage({ kind: 'recover-send', phone: stage.phone });
                            }}
                            className="text-xs text-[#d4af37] hover:underline transition-all cursor-pointer font-medium"
                          >
                            Esqueci minha senha
                          </button>
                        </div>
                        <input
                          type={admin.showPassword ? 'text' : 'password'}
                          value={admin.password}
                          onChange={(e) => admin.setPassword(e.target.value)}
                          placeholder="Sua senha"
                          data-testid="input-client-password"
                          autoComplete="current-password"
                          maxLength={128}
                          autoFocus
                          className={inputClass}
                        />
                      </div>
                      {clientError && (
                        <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                          {clientError}
                        </p>
                      )}
                      <button
                        type="submit"
                        data-testid="btn-client-login"
                        disabled={clientLoading}
                        className="w-full h-14 bg-gradient-to-r from-[#f0d060] via-[#d4af37] to-[#b8923f] hover:brightness-110 text-black font-bold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                      >
                        {clientLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <span>Entrar</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStage({ kind: 'id' })}
                        className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        ← Usar outro telefone/e-mail
                      </button>
                    </form>
                  );
                }

                if (stage.kind === 'recover-send') {
                  return (
                    <form onSubmit={handleRecoverSend} className="w-full space-y-4">
                      <div className="text-left space-y-1">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                          Recuperar senha
                        </h2>
                        <p className="text-xs text-zinc-400">
                          Enviaremos um código para o e-mail cadastrado na sua conta.
                        </p>
                      </div>
                      <div className="space-y-1.5 text-left">
                        <label className={labelClass}>Celular ou E-mail</label>
                        <input
                          type="text"
                          value={recoverIdentifier}
                          onChange={(e) => setRecoverIdentifier(e.target.value)}
                          placeholder="Seu e-mail ou celular com DDD"
                          data-testid="input-recover-identifier"
                          autoComplete="username"
                          maxLength={120}
                          autoFocus
                          className={inputClass}
                        />
                      </div>
                      {clientError && (
                        <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                          {clientError}
                        </p>
                      )}
                      <button
                        type="submit"
                        data-testid="btn-recover-send"
                        disabled={clientLoading || !recoverIdentifier.trim()}
                        className="w-full h-14 bg-gradient-to-r from-[#f0d060] via-[#d4af37] to-[#b8923f] hover:brightness-110 text-black font-bold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                      >
                        {clientLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <span>Enviar código por e-mail</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStage({ kind: 'id' })}
                        className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        ← Voltar para o login
                      </button>
                    </form>
                  );
                }

                if (stage.kind === 'recover-code') {
                  return (
                    <form onSubmit={handleRecoverSubmit} className="w-full space-y-4">
                      <div className="text-left space-y-1">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                          Código de verificação
                        </h2>
                        <p className="text-xs text-zinc-400">
                          Enviamos um código de 6 dígitos para{' '}
                          <span className="text-white font-semibold">
                            {recoverEmailMasked || 'seu e-mail'}
                          </span>
                          .
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5 text-left">
                          <label className={labelClass}>Código de 6 dígitos</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={recoverCode}
                            onChange={(e) =>
                              setRecoverCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                            }
                            placeholder="000000"
                            data-testid="input-recover-code"
                            maxLength={6}
                            autoFocus
                            className="w-full h-[52px] bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.18] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/25 rounded-xl text-center text-lg tracking-widest font-mono font-bold text-white placeholder:text-zinc-600 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className={labelClass}>Nova senha</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nova senha (mín. 6 caracteres)"
                            data-testid="input-recover-new-password"
                            autoComplete="new-password"
                            maxLength={128}
                            className={inputClass}
                          />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className={labelClass}>Confirmar nova senha</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repita a nova senha"
                            data-testid="input-recover-confirm-password"
                            autoComplete="new-password"
                            maxLength={128}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      {clientError && (
                        <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                          {clientError}
                        </p>
                      )}
                      <button
                        type="submit"
                        data-testid="btn-recover-submit"
                        disabled={
                          clientLoading || recoverCode.length !== 6 || newPassword.length < 6
                        }
                        className="w-full h-14 bg-gradient-to-r from-[#f0d060] via-[#d4af37] to-[#b8923f] hover:brightness-110 text-black font-bold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                      >
                        {clientLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <span>Redefinir senha</span>
                        )}
                      </button>
                      <div className="space-y-2 pt-2 text-center text-xs">
                        <button
                          type="button"
                          onClick={() => setStage({ kind: 'recover-send', phone: stage.phone })}
                          className="text-[#d4af37] hover:underline transition-all cursor-pointer font-medium"
                        >
                          Reenviar código
                        </button>
                        <button
                          type="button"
                          onClick={openRecoveryWhatsApp}
                          className="text-zinc-400 hover:text-white transition-colors cursor-pointer block mx-auto"
                        >
                          Precisa de ajuda? Fale no WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => setStage({ kind: 'id' })}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer block w-full pt-1"
                        >
                          ← Voltar
                        </button>
                      </div>
                    </form>
                  );
                }

                if (stage.kind === 'create-account') {
                  return (
                    <form onSubmit={handleCreateAccount} className="w-full space-y-5">
                      <div className="text-left space-y-1.5">
                        <h1 className="text-xl font-bold text-white tracking-tight">
                          Criar uma conta
                        </h1>
                        <p className="text-[13px] text-zinc-400">
                          Cadastre-se para agendar horários e acompanhar seu histórico.
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1.5 text-left">
                          <label className={labelClass}>Nome completo</label>
                          <input
                            type="text"
                            value={accountForm.name}
                            onChange={(e) =>
                              setAccountForm({ ...accountForm, name: e.target.value })
                            }
                            placeholder="Seu nome completo"
                            data-testid="input-account-name"
                            autoComplete="name"
                            maxLength={80}
                            autoFocus
                            className={inputClass}
                          />
                        </div>
                        <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4">
                          <div className="space-y-1.5 text-left">
                            <label className={labelClass}>WhatsApp</label>
                            <input
                              type="tel"
                              value={accountForm.phone}
                              onChange={(e) =>
                                setAccountForm({
                                  ...accountForm,
                                  phone: formatPhone(e.target.value),
                                })
                              }
                              placeholder="(00) 90000-0000"
                              data-testid="input-account-phone"
                              autoComplete="tel"
                              maxLength={15}
                              className={inputClass}
                            />
                          </div>
                          <div className="space-y-1.5 text-left">
                            <label className={labelClass}>E-mail</label>
                            <input
                              type="email"
                              value={accountForm.email}
                              onChange={(e) =>
                                setAccountForm({ ...accountForm, email: e.target.value })
                              }
                              placeholder="seu@email.com"
                              data-testid="input-account-email"
                              autoComplete="email"
                              maxLength={120}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4">
                          <div className="space-y-1.5 text-left">
                            <label className={labelClass}>Senha</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Mín. 6 dígitos"
                              data-testid="input-account-password"
                              autoComplete="new-password"
                              maxLength={128}
                              className={inputClass}
                            />
                          </div>
                          <div className="space-y-1.5 text-left">
                            <label className={labelClass}>Confirmar</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repita a senha"
                              data-testid="input-account-confirm"
                              autoComplete="new-password"
                              maxLength={128}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                      {clientError && (
                        <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                          {clientError}
                        </p>
                      )}
                      <button
                        type="submit"
                        data-testid="btn-account-submit"
                        disabled={clientLoading}
                        className="w-full h-14 bg-gradient-to-r from-[#f0d060] via-[#d4af37] to-[#b8923f] hover:brightness-110 text-black font-bold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-1 active:scale-[0.99]"
                      >
                        {clientLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Criar minha conta</span>
                          </>
                        )}
                      </button>
                      <div className="pt-1 text-center">
                        <button
                          type="button"
                          onClick={() => setStage({ kind: 'id' })}
                          className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Já possui conta?{' '}
                          <span className="text-[#d4af37] hover:underline font-semibold">
                            Entrar
                          </span>
                        </button>
                      </div>
                    </form>
                  );
                }

                // ── Campo inteligente (padrão) ──
                return (
                  <form onSubmit={handleUniversalSubmit} className="w-full space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label htmlFor="universal-identifier" className={labelClass}>
                        Celular ou E-mail
                      </label>
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
                        placeholder="(00) 00000-0000 ou seu@email.com"
                        data-testid="input-universal"
                        maxLength={120}
                        autoFocus
                        className={inputClass}
                      />
                    </div>
                    {clientError && (
                      <p className="text-xs font-medium text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                        {clientError}
                      </p>
                    )}
                    <button
                      type="submit"
                      data-testid="btn-continuar"
                      disabled={clientLoading || !input.trim()}
                      className="w-full h-14 bg-gradient-to-r from-[#f0d060] via-[#d4af37] to-[#b8923f] hover:brightness-110 text-black font-bold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                    >
                      {clientLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <span>Continuar</span>
                      )}
                    </button>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        data-testid="btn-go-create-account"
                        onClick={() => setStage({ kind: 'create-account' })}
                        className="text-[#d4af37] hover:underline font-semibold transition-all cursor-pointer"
                      >
                        Criar conta
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
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer font-medium"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="pt-3 border-t border-white/5 text-center">
                      <button
                        type="button"
                        onClick={() => navigate('/agendar')}
                        className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Agendar sem login →
                      </button>
                    </div>
                  </form>
                );
              })()
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
