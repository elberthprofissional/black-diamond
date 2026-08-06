import { useState, useEffect, memo, type FC, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Phone, ShieldCheck, Smartphone } from 'lucide-react';
import {
  getBookingsByPhone,
  getClientByPhone,
  cancelBooking,
  getServices,
  getClientDashboard,
} from '../lib/api';
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
  loading: boolean;
  error: string;
  onSubmit: (e: FormEvent) => void;
}> = memo(({ phone, onPhoneChange, loading, error, onSubmit }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
          <Smartphone size={28} className="text-gold" />
        </div>
        <p className="text-[14px] text-zinc-400 leading-relaxed">
          Digite seu telefone para acessar seus agendamentos.
        </p>
      </div>
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
      <button
        type="submit"
        disabled={loading || phone.replace(/\D/g, '').length < 11}
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
));
PhoneStep.displayName = 'PhoneStep';

// ─── Main Component ───

const ClientProfile: FC = () => {
  const navigate = useNavigate();
  const [initialSession] = useState(() => getClientSession());
  const [step, setStep] = useState<Step>(initialSession ? 'dashboard' : 'phone');
  const [phone, setPhone] = useState(initialSession?.phone ?? '');
  const [clientName, setClientName] = useState(initialSession?.name ?? '');
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
    if (digits.length < 11) {
      setError('Informe um celular válido com DDD (11 dígitos).');
      return;
    }
    setLoading(true);
    try {
      // Busca o nome real (RPC com rate limit) para a saudação do dashboard
      const lookup = await getClientByPhone(digits).catch(() => null);
      const name = (lookup as { name?: string } | null)?.name || 'Cliente';
      setClientName(name);
      saveClientSession(digits, name);
      setStep('dashboard');
      await loadBookings(digits);
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
            loading={loading}
            error={error}
            onSubmit={handlePhoneSubmit}
          />
        )}

        {step === 'dashboard' && (
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
        )}
      </div>
    </div>
  );
};

export default ClientProfile;
