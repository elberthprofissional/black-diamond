import { useState, useEffect, memo, type FC, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { Loader2, ArrowLeft, Phone, ShieldCheck, Smartphone, Lock, KeyRound } from 'lucide-react';
import {
  getBookingsByPhone,
  getClientByPhone,
  cancelBooking,
  getClientDashboard,
  getClientMilestonesPublic,
  getAvailableCoupons,
  getServices,
  getClientCoupons,
  resgatarCupom,
} from '../lib/api';
import { verificarSenhaCliente } from '../lib/api/clientAuth';
import { getMensalistaPlanName, getMensalistaPlanServices } from '../lib/api/mensalista';
import { formatPhone } from '../lib/utils';
import { logError } from '../lib/logger';
import { getClientSession, saveClientSession, clearClientSession } from '../lib/clientSession';
import type { BookingEntry, ClientStats, MensalistaInfo, Step } from './ClientProfileTypes';
import type { Coupon, MilestoneProgress, RedeemedCoupon } from '../types';
import ClientProfileDashboard from './ClientProfileDashboard';

// ─── Phone Step Component ───

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
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [mensalistaInfo, setMensalistaInfo] = useState<MensalistaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<BookingEntry | null>(null);
  const [historyBookings, setHistoryBookings] = useState<BookingEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneProgress[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsError, setCouponsError] = useState('');
  const [redeemedCoupons, setRedeemedCoupons] = useState<RedeemedCoupon[]>([]);
  const [redeemingCode, setRedeemingCode] = useState('');

  // ── API calls ──

  const fetchClientStats = async (phoneNumber: string): Promise<ClientStats | null> => {
    try {
      const dashboard = await getClientDashboard(phoneNumber);
      if (!dashboard.stats) return null;
      const s = dashboard.stats;
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
      if (!dashboard.history || dashboard.history.length === 0) {
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
      const [bookingData, statsData, clientLookup, redeemed] = await Promise.all([
        getBookingsByPhone(phoneNumber),
        fetchClientStats(phoneNumber),
        getClientByPhone(phoneNumber).catch(() => null),
        getClientCoupons(phoneNumber).catch(() => []),
      ]);
      setBookings(bookingData as BookingEntry[]);
      setStats(statsData);
      setRedeemedCoupons(redeemed);

      if (clientLookup && clientLookup.id) {
        getClientMilestonesPublic(clientLookup.id)
          .catch(() => [])
          .then(setMilestones);
      }

      // Vitrine de cupons: NÃO depende do clientLookup — a RPC pública
      // `get_available_coupons` não recebe argumentos. Se o lookup do cliente
      // falhar (ex.: rate limit), a vitrine continua carregando. E NÃO engole
      // o erro em silêncio: se a RPC não existir (migrations 009/010 não
      // aplicadas), o cliente vê o motivo em vez de "nenhum cupom".
      getAvailableCoupons()
        .then((c) => {
          setCouponsError('');
          setCoupons(
            c.filter(
              (coupon) =>
                coupon.is_active &&
                (!coupon.max_uses || coupon.current_uses < coupon.max_uses) &&
                (!coupon.valid_until || new Date(coupon.valid_until) >= new Date())
            )
          );
        })
        .catch(() => {
          setCouponsError('Não foi possível carregar os cupons agora. Tente novamente mais tarde.');
        });

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
      fetchHistory(initialSession.phone);
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
        await fetchHistory(digits);
        return;
      }
      const status = await verificarSenhaCliente(digits, '');
      if (status?.needs_password) {
        setNeedsPassword(true);
        setPhone(formatPhone(digits));
        setLoading(false);
        return;
      }
      const lookup = await getClientByPhone(digits).catch(() => null);
      const name = (lookup as { name?: string } | null)?.name || 'Cliente';
      setClientName(name);
      saveClientSession(digits, name, false);
      setStep('dashboard');
      await loadBookings(digits);
      await fetchHistory(digits);
    } catch (e) {
      logError(e);
      setError('Erro ao buscar agendamentos. Tente novamente.');
      setLoading(false);
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

  /** Retorna null em sucesso ou a mensagem de erro — a tela de cupons exibe inline. */
  const handleRedeem = async (code: string): Promise<string | null> => {
    if (!phone) return 'Sessão expirada. Entre novamente.';
    setRedeemingCode(code);
    try {
      const res = await resgatarCupom(phone, code);
      if (res.ok) {
        const updated = await getClientCoupons(phone).catch(() => []);
        setRedeemedCoupons(updated);
        return null;
      }
      return res.message || 'Erro ao resgatar cupom.';
    } catch {
      return 'Erro ao resgatar cupom. Tente novamente.';
    } finally {
      setRedeemingCode('');
    }
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
    setMensalistaInfo(null);
    setNeedsPassword(false);
    setPassword('');
  };

  const totalFutureSpent = bookings.reduce((sum, b) => sum + b.total_price, 0);

  // ── Render ──

  if (step === 'dashboard') {
    return (
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
        historyLoading={historyLoading}
        totalFutureSpent={totalFutureSpent}
        isLimitedAccess={!needsPassword}
        milestones={milestones}
        coupons={coupons}
        couponsError={couponsError}
        redeemedCoupons={redeemedCoupons}
        redeemingCode={redeemingCode}
        onRedeem={handleRedeem}
        onLogout={handleLogout}
        onCancel={handleCancel}
        onReschedule={handleReschedule}
        onSetConfirmCancel={setConfirmCancel}
        onSetError={setError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/')}
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
      </div>
    </div>
  );
};

export default ClientProfile;
