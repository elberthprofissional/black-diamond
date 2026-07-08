import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Scissors,
  DollarSign,
  User,
  Search,
  ArrowRight,
  Bell,
  BellOff,
  X,
  Check,
  History,
} from 'lucide-react';
import { getBookingsByPhone, cancelBooking } from '../lib/api';
import { formatDateBR } from '../lib/utils';

interface BookingEntry {
  id: string;
  booking_date: string;
  booking_time: string;
  total_price: number;
  service_ids: string[];
  total_duration?: number;
  status: string;
  service_names?: string[];
  client_name?: string;
  clients?: { name: string; phone: string } | { name: string; phone: string }[];
}

interface ClientStats {
  totalVisits: number;
  totalSpent: number;
  lastVisit: string | null;
  clientName: string;
}

type View = 'phone' | 'dashboard';

const ClientProfile: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [view, setView] = useState<View>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());
  const [notifStatus, setNotifStatus] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>(
    () => {
      if (!('Notification' in window)) return 'unsupported';
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      return 'idle';
    }
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 11) {
      setError('Informe um celular valido com DDD.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getBookingsByPhone(phone);
      setBookings(data);

      // Calculate stats from bookings
      const completedCount = data.filter((b: BookingEntry) => b.status === 'completed').length;
      const totalSpent = data.reduce(
        (sum: number, b: BookingEntry) => sum + Number(b.total_price || 0),
        0
      );
      const sortedDates = data
        .map((b: BookingEntry) => b.booking_date)
        .sort()
        .reverse();
      const lastVisit = sortedDates.length > 0 ? sortedDates[0] : null;

      const clientName =
        data.length > 0
          ? (() => {
              const c = data[0].clients;
              return Array.isArray(c) ? c[0]?.name : c?.name || 'Cliente';
            })()
          : 'Cliente';

      setStats({
        totalVisits: completedCount + data.length, // active + completed
        totalSpent,
        lastVisit,
        clientName,
      });
      setView('dashboard');
    } catch {
      setError('Erro ao buscar agendamentos.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelBooking(id);
      setCancelledIds((prev) => new Set(prev).add(id));
    } catch {
      setError('Erro ao cancelar.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReschedule = (booking: BookingEntry) => {
    const clientPhone =
      (() => {
        const c = booking.clients;
        return Array.isArray(c) ? c[0]?.phone : c?.phone;
      })() || phone.replace(/\D/g, '');
    navigate('/cancelar', { state: { phone: clientPhone } });
  };

  const handleActivateNotification = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifStatus(result === 'granted' ? 'granted' : 'denied');
  };

  const activeBookings = bookings.filter(
    (b) => !cancelledIds.has(b.id) && b.status !== 'completed' && b.status !== 'cancelled'
  );
  const pastBookings = bookings.filter(
    (b) => !cancelledIds.has(b.id) && (b.status === 'completed' || b.status === 'cancelled')
  );

  if (view === 'phone') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-5">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <img src="/assets/logo.webp" alt="Black Diamond" className="w-14 h-14 mx-auto" />
            <h1 className="text-xl font-bold text-white">Meus Agendamentos</h1>
            <p className="text-[12px] text-zinc-500">
              Digite seu telefone para ver seus agendamentos.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full h-13 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-[15px] text-white outline-none focus:border-[#C5A059] transition-all placeholder:text-zinc-600"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#C5A059] text-black font-bold text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#A68233] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[12px] text-red-400/80 text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            onClick={() => navigate('/agendar')}
            className="w-full text-center text-[11px] text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer"
          >
            Quer agendar? Clique aqui
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-6 pb-24">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">
              Ola, {stats?.clientName?.split(' ')[0] || 'Cliente'}
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
            </p>
          </div>
          <button
            onClick={() => {
              setView('phone');
              setBookings([]);
              setStats(null);
              setPhone('');
            }}
            className="w-9 h-9 rounded-xl border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white transition-all cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Profile Stats */}
        {stats && (
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 flex items-center justify-center">
                <User size={20} className="text-[#C5A059]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{stats.clientName}</p>
                <p className="text-[10px] text-zinc-500">Membro desde a primeira visita</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <History size={12} className="text-[#C5A059]/60" />
                  <span className="text-lg font-bold text-white">{stats.totalVisits}</span>
                </div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Visitas</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign size={12} className="text-[#C5A059]/60" />
                  <span className="text-lg font-bold text-white">
                    R$ {stats.totalSpent.toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Total Gasto</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar size={12} className="text-[#C5A059]/60" />
                  <span className="text-sm font-bold text-white">
                    {stats.lastVisit
                      ? new Date(stats.lastVisit + 'T12:00:00').toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      : '-'}
                  </span>
                </div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Ultima Visita</p>
              </div>
            </div>
          </div>
        )}

        {/* Notification opt-in */}
        {notifStatus !== 'unsupported' && notifStatus !== 'granted' && (
          <button
            onClick={handleActivateNotification}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3 hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <BellOff size={16} className="text-zinc-500" />
            <div className="text-left flex-1">
              <p className="text-[11px] font-bold text-zinc-300">Ativar lembretes</p>
              <p className="text-[10px] text-zinc-600">Receba notificacao 1h antes do horario</p>
            </div>
            <ArrowRight size={14} className="text-zinc-600" />
          </button>
        )}

        {notifStatus === 'granted' && (
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
            <Bell size={14} />
            <span>Lembretes ativos! Voce sera avisado 1h antes.</span>
          </div>
        )}

        {/* Active Bookings */}
        {activeBookings.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Agendamentos ativos
            </p>
            {activeBookings.map((booking) => (
              <motion.div
                key={booking.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111] border border-white/[0.06] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-baseline gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-[#C5A059]/60" />
                    <span className="text-[13px] font-bold text-white">
                      {formatDateBR(booking.booking_date)}
                    </span>
                  </div>
                  <div className="w-px h-3 bg-white/[0.08]" />
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-[#C5A059]/60" />
                    <span className="text-[13px] font-black text-[#C5A059] tabular-nums">
                      {String(booking.booking_time).slice(0, 5)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Scissors size={11} className="text-zinc-600 shrink-0" />
                  <p className="text-[11px] text-zinc-400">
                    {booking.service_names?.join(', ') ||
                      booking.service_ids.length + ' servico(s)'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <span className="text-[12px] font-bold text-white">
                    R${' '}
                    {Number(booking.total_price).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReschedule(booking)}
                      className="h-8 px-3 rounded-lg bg-[#C5A059] text-black font-bold text-[9px] uppercase tracking-wider hover:bg-[#d4b06a] active:scale-95 transition-all cursor-pointer"
                    >
                      Reagendar
                    </button>
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="h-8 px-3 rounded-lg border border-red-500/20 text-red-400/80 hover:bg-red-500/10 font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                    >
                      {cancellingId === booking.id ? '...' : 'Cancelar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {activeBookings.length === 0 && pastBookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[12px] text-zinc-500 mb-4">Nenhum agendamento encontrado.</p>
            <button
              onClick={() => navigate('/agendar')}
              className="px-6 py-3 bg-[#C5A059] text-black font-bold text-[11px] uppercase tracking-wider rounded-xl hover:bg-[#A68233] transition-all cursor-pointer"
            >
              Agendar agora
            </button>
          </div>
        )}

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
              Historico
            </p>
            {pastBookings.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-3 flex items-center justify-between opacity-60"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500">
                    {formatDateBR(booking.booking_date)}
                  </span>
                  <span className="text-[11px] text-zinc-600">
                    {String(booking.booking_time).slice(0, 5)}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    booking.status === 'completed' ? 'text-emerald-500/60' : 'text-red-400/60'
                  }`}
                >
                  {booking.status === 'completed' ? 'Concluido' : 'Cancelado'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Book new */}
        <button
          onClick={() => navigate('/agendar')}
          className="w-full h-12 bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.12] rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Scissors size={14} />
          Novo agendamento
        </button>
      </div>
    </div>
  );
};

export default ClientProfile;
