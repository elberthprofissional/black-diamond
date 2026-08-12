import { useState, useEffect, memo, type FC, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import {
  Loader2,
  ArrowLeft,
  Phone,
  ShieldCheck,
  Smartphone,
  Lock,
  KeyRound,
  Mail,
} from 'lucide-react';
import {
  getBookingsByPhone,
  getClientByPhone,
  cancelBooking,
  getServices,
  getClientDashboard,
} from '../lib/api';
import {
  verificarSenhaCliente,
  criarSenhaCliente,
  atualizarEmailCliente,
  alterarSenhaCliente,
} from '../lib/api/clientAuth';
import { getMensalistaPlanName, getMensalistaPlanServices } from '../lib/api/mensalista';
import { formatPhone } from '../lib/utils';
import { logError } from '../lib/logger';
import { getClientSession, saveClientSession, clearClientSession } from '../lib/clientSession';
import type { BookingEntry, ClientStats, MensalistaInfo, Step } from './ClientProfileTypes';
import ClientProfileDashboard from './ClientProfileDashboard';

// ─── Phone Step Component ───
// v3.34: acesso simplificado — digita o telefone e entra direto no dashboard.
// O código de acesso falso (gerado e digitado na própria tela) foi removido.

const PhoneStep: FC<{
  phone: string;
  onPhoneChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  needsPassword: boolean;
  loading: boolean;
  error: string;
  onSubmit: (e: FormEvent) => void;
}> = memo(
  ({
    phone,
    onPhoneChange,
    password,
    onPasswordChange,
    needsPassword,
    loading,
    error,
    onSubmit,
  }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
            {needsPassword ? (
              <Lock size={28} className="text-gold" />
            ) : (
              <Smartphone size={28} className="text-gold" />
            )}
          </div>
          <p className="text-[14px] text-zinc-400 leading-relaxed">
            {needsPassword
              ? 'Este telefone tem senha de proteção. Digite-a para continuar.'
              : 'Digite seu telefone para acessar seus agendamentos.'}
          </p>
        </div>
        {!needsPassword && (
          <div className="relative">
            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              maxLength={15}
              autoFocus
              className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-[16px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
            />
          </div>
        )}
        {needsPassword && (
          <div className="relative">
            <KeyRound
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Sua senha"
              maxLength={128}
              autoFocus
              className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-[16px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
            />
          </div>
        )}
        <button
          type="submit"
          disabled={loading || (!needsPassword && phone.replace(/\D/g, '').length < 11)}
          className="btn-gold w-full h-11 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <ShieldCheck size={14} /> Entrar
            </>
          )}
        </button>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-[12px] text-red-400/80 text-center">{error}</p>
          </div>
        )}
      </form>
    </motion.div>
  )
);
PhoneStep.displayName = 'PhoneStep';

// ─── Main Component ───

const ClientProfile: FC = () => {
  const navigate = useNavigate();
  const [initialSession] = useState(() => getClientSession());
  const [step, setStep] = useState<Step>(initialSession ? 'dashboard' : 'phone');
  const [phone, setPhone] = useState(initialSession?.phone ?? '');
  const [clientName, setClientName] = useState(initialSession?.name ?? '');
  const [needsPassword, setNeedsPassword] = useState(initialSession?.hasPassword ?? false);
  const [password, setPassword] = useState('');
  // ── Conta (e-mail + trocar senha) ──
  const [clientEmail, setClientEmail] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountMsg, setAccountMsg] = useState('');
  const [accountErr, setAccountErr] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [protectOpen, setProtectOpen] = useState(false);
  const [protectPassword, setProtectPassword] = useState('');
  const [protectConfirm, setProtectConfirm] = useState('');
  const [protectLoading, setProtectLoading] = useState(false);
  const [protectMessage, setProtectMessage] = useState('');
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [mensalistaInfo, setMensalistaInfo] = useState<MensalistaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<BookingEntry | null>(null);
  const [historyBookings, setHistoryBookings] = useState<BookingEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── API calls ──

  const fetchClientStats = async (phoneNumber: string): Promise<ClientStats | null> => {
    try {
      // RPC segura (SECURITY DEFINER) — evita expor a tabela clients publicamente.
      const dashboard = await getClientDashboard(phoneNumber);
      if (!dashboard.stats) return null;
      const s = dashboard.stats;
      setClientEmail(s.email || '');
      setAccountEmail(s.email || '');
      if (s.is_mensalista && s.mensalista_plan_id) {
        try {
          const [planName, planServiceIds] = await Promise.all([
            getMensalistaPlanName(s.mensalista_plan_id),
            getMensalistaPlanServices(s.mensalista_plan_id),
          ]);
          if (planName && planServiceIds.length > 0) {
            const allServices = await getServices();
            const serviceNames = planServiceIds
              .map((sid) => allServices.find((sv) => sv.id === sid)?.name)
              .filter(Boolean) as string[];
            const expiresAt = s.mensalista_expires_at;
            let daysLeft = 0;
            if (expiresAt) {
              daysLeft = Math.max(
                0,
                Math.ceil(
                  (new Date(expiresAt + 'T23:59:59').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
              );
            }
            setMensalistaInfo({ planName, services: serviceNames, expiresAt, daysLeft });
          }
        } catch {
          /* silent */
        }
      } else setMensalistaInfo(null);
      return {
        total_visits: s.historical_visits || 0,
        total_spent: s.historical_spent || 0,
        last_visit: s.last_visit_date || null,
      };
    } catch {
      return null;
    }
  };

  const fetchHistory = async (phoneNumber: string) => {
    setHistoryLoading(true);
    try {
      const dashboard = await getClientDashboard(phoneNumber);
      if (!dashboard.stats || !dashboard.history || dashboard.history.length === 0) {
        setHistoryLoading(false);
        return;
      }
      setHistoryBookings(
        dashboard.history.map((b) => ({
          id: b.id,
          booking_date: b.booking_date,
          booking_time: b.booking_time,
          status: b.status,
          total_price: b.total_price,
          total_duration: b.total_duration,
          service_ids: b.service_ids,
          clients: { name: clientName, phone: phoneNumber },
        }))
      );
    } catch {
      /* silent */
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadBookings = async (phoneNumber: string) => {
    setLoading(true);
    setError('');
    try {
      const [bookingData, statsData] = await Promise.all([
        getBookingsByPhone(phoneNumber),
        fetchClientStats(phoneNumber),
      ]);
      setBookings(bookingData as BookingEntry[]);
      setStats(statsData);
      if (bookingData.length === 0) {
        setError('Nenhum agendamento futuro encontrado para este telefone.');
      }
    } catch (e) {
      logError(e);
      setError('Erro ao buscar agendamentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Restaura sessão salva — vai direto ao dashboard
  useEffect(() => {
    if (initialSession) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadBookings(initialSession.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (!needsPassword && digits.length < 11) {
      setError('Informe um celular válido com DDD (11 dígitos).');
      return;
    }
    setLoading(true);
    try {
      // Já sabemos que tem senha? Valida antes de entrar.
      if (needsPassword) {
        const result = await verificarSenhaCliente(digits, password).catch(() => null);
        if (!result?.ok) {
          setError(result?.message || 'Senha incorreta.');
          setLoading(false);
          return;
        }
        const name = result.name || 'Cliente';
        setClientName(name);
        saveClientSession(digits, name, true);
        setStep('dashboard');
        await loadBookings(digits);
        return;
      }
      // Primeira checagem: o cliente tem senha criada?
      // Fail-closed: se a verificação der erro, não deixa entrar sem senha.
      const status = await verificarSenhaCliente(digits, '');
      if (status?.needs_password) {
        setNeedsPassword(true);
        setPhone(formatPhone(digits));
        setLoading(false);
        return;
      }
      // Sem senha → entra direto (atrito zero).
      const lookup = await getClientByPhone(digits).catch(() => null);
      const name = (lookup as { name?: string } | null)?.name || 'Cliente';
      setClientName(name);
      saveClientSession(digits, name, false);
      setStep('dashboard');
      await loadBookings(digits);
    } catch (e) {
      logError(e);
      setError('Erro ao buscar agendamentos. Tente novamente.');
      setLoading(false);
    }
  };

  /** Cria uma senha para proteger o acesso do cliente (card no dashboard). */
  const handleProtectAccess = async (e: FormEvent) => {
    e.preventDefault();
    setProtectMessage('');
    if (protectPassword.length < 6) {
      setProtectMessage('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (protectPassword !== protectConfirm) {
      setProtectMessage('As senhas não coincidem.');
      return;
    }
    setProtectLoading(true);
    try {
      const result = await criarSenhaCliente(phone.replace(/\D/g, ''), protectPassword);
      if (result?.ok) {
        setProtectOpen(false);
        setProtectPassword('');
        setProtectConfirm('');
        setNeedsPassword(true);
        saveClientSession(phone.replace(/\D/g, ''), clientName, true);
      } else {
        setProtectMessage(result?.message || 'Não foi possível criar a senha.');
      }
    } catch {
      setProtectMessage('Erro ao criar a senha. Tente novamente.');
    } finally {
      setProtectLoading(false);
    }
  };

  /** Salva/atualiza o e-mail do cliente (canal de recuperação de senha). */
  const handleSaveEmail = async (e: FormEvent) => {
    e.preventDefault();
    setAccountMsg('');
    const email = accountEmail.trim();
    if (!email) {
      setAccountErr('Informe seu e-mail.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setAccountErr('E-mail inválido.');
      return;
    }
    setAccountErr('');
    setAccountBusy(true);
    try {
      const result = await atualizarEmailCliente(phone.replace(/\D/g, ''), email);
      if (result?.ok) {
        setClientEmail(email);
        setAccountMsg('E-mail salvo! Use-o para recuperar sua senha.');
      } else {
        setAccountErr(result?.message || 'Não foi possível salvar o e-mail.');
      }
    } catch {
      setAccountErr('Erro ao salvar o e-mail. Tente novamente.');
    } finally {
      setAccountBusy(false);
    }
  };

  /** Troca a senha (exige a senha atual). */
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setAccountMsg('');
    if (pwNew.length < 6) {
      setAccountErr('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (pwNew !== pwConfirm) {
      setAccountErr('As senhas não coincidem.');
      return;
    }
    setAccountErr('');
    setPwBusy(true);
    try {
      const result = await alterarSenhaCliente(phone.replace(/\D/g, ''), pwCurrent, pwNew);
      if (result?.ok) {
        setAccountMsg('Senha alterada!');
        setPwCurrent('');
        setPwNew('');
        setPwConfirm('');
      } else {
        setAccountErr(result?.message || 'Não foi possível alterar a senha.');
      }
    } catch {
      setAccountErr('Erro ao alterar a senha. Tente novamente.');
    } finally {
      setPwBusy(false);
    }
  };

  const handleCancel = async (booking: BookingEntry) => {
    setCancellingId(booking.id);
    setConfirmCancel(null);
    try {
      await cancelBooking(booking.id);
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (e) {
      logError(e);
      setError('Erro ao cancelar.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReschedule = (booking: BookingEntry) => {
    navigate('/cancelar', { state: { phone: phone.replace(/\D/g, ''), bookingId: booking.id } });
  };

  const handleLogout = () => {
    clearClientSession();
    setStep('phone');
    setPhone('');
    setClientName('');
    setBookings([]);
    setStats(null);
    setError('');
    setHistoryBookings([]);
    setShowHistory(false);
    setMensalistaInfo(null);
    setNeedsPassword(false);
    setPassword('');
    setProtectOpen(false);
    setProtectPassword('');
    setProtectConfirm('');
    setProtectMessage('');
    setClientEmail('');
    setAccountEmail('');
    setAccountMsg('');
    setAccountErr('');
    setPwCurrent('');
    setPwNew('');
    setPwConfirm('');
  };

  const toggleHistory = () => {
    if (!showHistory && historyBookings.length === 0) fetchHistory(phone.replace(/\D/g, ''));
    setShowHistory(!showHistory);
  };

  const totalFutureSpent = bookings.reduce((sum, b) => sum + b.total_price, 0);

  // ── Render ──

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => {
              if (step === 'dashboard') handleLogout();
              else navigate('/');
            }}
            className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Meus Agendamentos</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Black Diamond</p>
          </div>
        </div>

        {step === 'phone' && (
          <PhoneStep
            phone={phone}
            onPhoneChange={setPhone}
            password={password}
            onPasswordChange={setPassword}
            needsPassword={needsPassword}
            loading={loading}
            error={error}
            onSubmit={handlePhoneSubmit}
          />
        )}

        {step === 'dashboard' && (
          <>
            {/* Card: proteger acesso com senha */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111111] border border-white/[0.06] rounded-2xl p-4 mb-4"
            >
              {!protectOpen ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/15 flex items-center justify-center shrink-0">
                    <Lock size={15} className="text-gold" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-white">
                      {needsPassword ? 'Senha criada ✓' : 'Proteja seu acesso'}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {needsPassword
                        ? 'Seu acesso já é protegido por senha.'
                        : 'Crie uma senha para que só você veja seus agendamentos.'}
                    </p>
                  </div>
                  {!needsPassword && (
                    <button
                      onClick={() => setProtectOpen(true)}
                      className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-black bg-gold rounded-xl px-3 h-9 hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Criar senha
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleProtectAccess} className="space-y-3">
                  <p className="text-[13px] font-bold text-white flex items-center gap-2">
                    <KeyRound size={14} className="text-gold" /> Criar senha de proteção
                  </p>
                  <input
                    type="password"
                    value={protectPassword}
                    onChange={(e) => setProtectPassword(e.target.value)}
                    placeholder="Nova senha (mín. 6 caracteres)"
                    data-testid="input-protect-password"
                    autoComplete="new-password"
                    maxLength={128}
                    className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                  />
                  <input
                    type="password"
                    value={protectConfirm}
                    onChange={(e) => setProtectConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    data-testid="input-protect-confirm"
                    autoComplete="new-password"
                    maxLength={128}
                    className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                  />
                  {protectMessage && <p className="text-[11px] text-red-400">{protectMessage}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={protectLoading}
                      className="flex-1 h-10 rounded-xl bg-gold text-black font-bold text-[10px] uppercase tracking-[0.15em] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {protectLoading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck size={13} /> Salvar
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProtectOpen(false);
                        setProtectMessage('');
                      }}
                      className="px-4 h-10 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </motion.div>

            {/* Card: minha conta (e-mail + trocar senha) */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111111] border border-white/[0.06] rounded-2xl p-4 mb-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/15 flex items-center justify-center shrink-0">
                  <ShieldCheck size={15} className="text-gold" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-white">Minha conta</p>
                  <p className="text-[10px] text-zinc-500">
                    E-mail para recuperar a senha e seus dados de acesso.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                  />
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => {
                      setAccountEmail(e.target.value);
                      setAccountMsg('');
                      setAccountErr('');
                    }}
                    placeholder="seu@email.com"
                    data-testid="input-account-email"
                    autoComplete="email"
                    maxLength={120}
                    className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                  />
                </div>
                <button
                  onClick={handleSaveEmail}
                  disabled={accountBusy}
                  className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:text-white hover:border-gold/30 text-[10px] font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {accountBusy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <>
                      <Mail size={13} /> {clientEmail ? 'Atualizar e-mail' : 'Salvar e-mail'}
                    </>
                  )}
                </button>
              </div>

              {needsPassword && (
                <div className="pt-3 mt-3 border-t border-white/[0.05] space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound size={11} className="text-gold" /> Trocar senha
                  </p>
                  <input
                    type="password"
                    value={pwCurrent}
                    onChange={(e) => {
                      setPwCurrent(e.target.value);
                      setAccountMsg('');
                      setAccountErr('');
                    }}
                    placeholder="Senha atual"
                    data-testid="input-pw-current"
                    autoComplete="current-password"
                    maxLength={128}
                    className="w-full h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                  />
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={pwNew}
                      onChange={(e) => {
                        setPwNew(e.target.value);
                        setAccountMsg('');
                        setAccountErr('');
                      }}
                      placeholder="Nova (mín. 6)"
                      data-testid="input-pw-new"
                      autoComplete="new-password"
                      maxLength={128}
                      className="flex-1 min-w-0 h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                    />
                    <input
                      type="password"
                      value={pwConfirm}
                      onChange={(e) => {
                        setPwConfirm(e.target.value);
                        setAccountMsg('');
                        setAccountErr('');
                      }}
                      placeholder="Repetir"
                      data-testid="input-pw-confirm"
                      autoComplete="new-password"
                      maxLength={128}
                      className="flex-1 min-w-0 h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={pwBusy}
                    className="w-full h-10 rounded-xl bg-gold text-black font-bold text-[10px] uppercase tracking-[0.15em] hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {pwBusy ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <>
                        <KeyRound size={13} /> Alterar senha
                      </>
                    )}
                  </button>
                </div>
              )}

              {(accountMsg || accountErr) && (
                <p
                  className={`text-[11px] mt-2 text-center ${accountErr ? 'text-red-400' : 'text-emerald-400'}`}
                >
                  {accountErr || accountMsg}
                </p>
              )}
            </motion.div>

            <ClientProfileDashboard
              clientName={clientName}
              phone={phone}
              stats={stats}
              mensalistaInfo={mensalistaInfo}
              bookings={bookings}
              loading={loading}
              error={error}
              cancellingId={cancellingId}
              confirmCancel={confirmCancel}
              historyBookings={historyBookings}
              showHistory={showHistory}
              historyLoading={historyLoading}
              totalFutureSpent={totalFutureSpent}
              onLogout={handleLogout}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
              onSetConfirmCancel={setConfirmCancel}
              onToggleHistory={toggleHistory}
              onSetError={setError}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ClientProfile;
