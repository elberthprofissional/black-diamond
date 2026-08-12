import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Calendar, ArrowLeft, ChevronRight, Loader2, Sparkles, X } from 'lucide-react';
import { useLocation, useSearchParams, useNavigate } from 'react-router';
import {
  getBookingsByPhone,
  getBookingsByToken,
  cancelBooking,
  getAvailableSlots,
  createBooking,
  type ManagedBooking,
} from '../lib/api';
import { formatPhone, getNextDays, formatPrice } from '../lib/utils';
import { logError } from '../lib/logger';

interface BookingEntry {
  id: string;
  booking_date: string;
  booking_time: string;
  total_price: number;
  service_ids: string[];
  total_duration?: number;
  clients?: { name: string; phone: string } | { name: string; phone: string }[];
  has_token?: boolean;
  status?: string;
}

type View = 'search' | 'list' | 'reschedule' | 'success';

export default function CancelPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const state = location.state as { phone?: string; token?: string } | null;
  const initialPhone = state?.phone || '';
  const initialToken = state?.token || searchParams.get('token') || '';
  const [phone, setPhone] = useState(initialPhone);
  const formattedPhone = formatPhone(phone);
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>(initialToken ? 'list' : 'search');

  // Cancel state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleName, setRescheduleName] = useState('');
  const [reschedulePhone, setReschedulePhone] = useState('');

  // Cancelled tracking (from ManageBooking)
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());

  const nextDays = getNextDays();

  // Auto-search quando vem phone do state (ex: do ClientProfile)
  useEffect(() => {
    if (initialPhone && !initialToken) {
      const cleanPhone = initialPhone.replace(/\D/g, '');
      if (cleanPhone.length >= 11) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        getBookingsByPhone(cleanPhone)
          .then((data) => {
            setBookings(data);
            setView('list');
            if (data.length === 0) {
              setError('Nenhum agendamento futuro encontrado.');
              setView('search');
            }
          })
          .catch(() => {
            setError('Erro ao buscar agendamentos.');
          })
          .finally(() => setLoading(false));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se veio com token (via URL param), busca agendamentos automaticamente
  useEffect(() => {
    if (!initialToken) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getBookingsByToken(initialToken)
      .then((data: ManagedBooking[]) => {
        if (!active) return;
        const mapped: BookingEntry[] = data.map((b) => ({
          id: b.booking_id,
          booking_date: b.booking_date,
          booking_time: b.booking_time,
          total_price: b.total_price,
          service_ids: b.service_ids || [],
          total_duration: b.total_duration,
          clients: { name: b.client_name, phone: b.client_phone },
          has_token: true,
          status: b.status,
        }));
        setBookings(mapped);
        if (mapped.length === 0) {
          setError('Nenhum agendamento futuro encontrado.');
          setView('search');
        }
      })
      .catch(() => {
        if (active) setError('Link inválido. Solicite um novo link ao barbeiro.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialToken]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 11) {
      setError('Informe um celular válido com DDD (11 dígitos).');
      return;
    }

    setLoading(true);
    setError('');
    setBookings([]);

    try {
      const data = await getBookingsByPhone(cleanPhone);
      setBookings(data);
      setView('list');
      if (data.length === 0) {
        setError('Nenhum agendamento futuro encontrado.');
        setView('search');
      }
    } catch (e) {
      logError(e);
      setError('Erro ao buscar agendamentos.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string, token?: string) => {
    setCancellingId(id);
    try {
      await cancelBooking(id, token || undefined);
      setCancelledIds((prev) => new Set(prev).add(id));
      setBookings((prev) => prev.filter((b) => b.id !== id));
      setShowTokenModal(false);
      setTokenInput('');
      setPendingCancelId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelClick = (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    if (booking?.has_token) {
      setPendingCancelId(id);
      setShowTokenModal(true);
    } else {
      handleCancel(id);
    }
  };

  const handleTokenSubmit = () => {
    if (!pendingCancelId || !tokenInput.trim()) return;
    handleCancel(pendingCancelId, tokenInput.trim());
  };

  const startReschedule = async (booking: BookingEntry) => {
    setRescheduleBooking(booking);
    setSelectedDate('');
    setSelectedTime('');
    setAvailableSlots([]);
    const clientsData = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients;
    setRescheduleName(clientsData?.name ?? '');
    setReschedulePhone(clientsData?.phone || phone.replace(/\D/g, ''));
    setView('reschedule');
  };

  useEffect(() => {
    if (!selectedDate || !rescheduleBooking) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailableSlots([]);
      return;
    }

    let active = true;
    setLoadingSlots(true);
    setSelectedTime('');

    // Passa a duração do booking sendo reagendado: slots que sobrepõem
    // um horário ocupado (pela duração real) não devem ser oferecidos.
    getAvailableSlots(selectedDate, undefined, rescheduleBooking.total_duration || 60)
      .then((slots) => {
        if (active) setAvailableSlots(slots);
      })
      .catch(() => {
        if (active) setAvailableSlots([]);
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [selectedDate, rescheduleBooking]);

  const handleConfirmReschedule = async () => {
    if (!rescheduleBooking || !selectedDate || !selectedTime) return;

    const clientName = rescheduleName.trim();
    const clientPhone = reschedulePhone.replace(/\D/g, '');

    if (!clientName || clientName.length < 2) {
      setError('Informe seu nome completo.');
      return;
    }
    if (clientPhone.length < 11) {
      setError('Informe um telefone válido com DDD.');
      return;
    }

    setRescheduling(true);
    try {
      await createBooking(
        {
          service_ids: rescheduleBooking.service_ids,
          booking_date: selectedDate,
          booking_time: selectedTime,
          total_price: rescheduleBooking.total_price,
          total_duration: rescheduleBooking.total_duration || 60,
        },
        { name: clientName, phone: clientPhone }
      );

      await cancelBooking(rescheduleBooking.id, initialToken || undefined);

      setBookings((prev) => prev.filter((b) => b.id !== rescheduleBooking.id));
      setView('success');
    } catch (e) {
      logError(e);
      setError('Erro ao reagendar. Tente novamente.');
      setView('list');
    } finally {
      setRescheduling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  };

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  };

  const activeBookings = bookings.filter((b) => !cancelledIds.has(b.id));
  const cancelledBookings = bookings.filter((b) => cancelledIds.has(b.id));

  // Loading state for token-based access
  if (loading && initialToken) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-gold/20 border-t-[#D4AF37] animate-spin" />
            <Sparkles
              size={14}
              className="text-gold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          </div>
          <p className="text-[12px] text-zinc-500 tracking-wide">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  // Error state for token-based access (no bookings found)
  if (error && bookings.length === 0 && initialToken && !loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-8">
          <div className="relative inline-flex">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 flex items-center justify-center rotate-3">
              <X size={28} className="text-red-400" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-white tracking-tight">Link inválido</h1>
            <p className="text-[14px] text-zinc-500 leading-relaxed max-w-[260px] mx-auto">
              {error}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="h-12 px-10 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer border border-white/[0.06] hover:border-white/[0.12]"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/[0.03] via-transparent to-transparent pointer-events-none" />

      <div className="relative px-4 py-8 pb-12">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Voltar"
              onClick={() => {
                if (view === 'list' || view === 'success') {
                  setView(initialToken ? 'list' : 'search');
                  if (initialToken) navigate('/');
                } else {
                  navigate('/');
                }
              }}
              className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all cursor-pointer"
            >
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
            <img
              src="/assets/logo.webp"
              alt="Black Diamond"
              loading="lazy"
              decoding="async"
              className="w-8 h-8"
            />
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                {view === 'reschedule'
                  ? 'Reagendar'
                  : initialToken
                    ? 'Meus Agendamentos'
                    : 'Cancelar ou Reagendar'}
              </h1>
              <p className="text-[10px] text-gold/60 uppercase tracking-[0.2em] font-medium">
                Black Diamond
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* SEARCH VIEW */}
            {view === 'search' && !initialToken && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <form onSubmit={handleSearch} className="space-y-4">
                  <input
                    type="tel"
                    value={formattedPhone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="(00) 00000-0000"
                    maxLength={11}
                    className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[16px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-gold w-full h-11 disabled:opacity-50"
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </button>
                </form>
                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[12px] text-red-400/80 text-center mt-4"
                  >
                    {error}
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* LIST VIEW */}
            {view === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {error && bookings.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-sm">
                    <span className="text-[12px] text-red-400">{error}</span>
                    <button
                      type="button"
                      aria-label="Fechar aviso"
                      onClick={() => setError('')}
                      className="ml-auto text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}

                {/* Active Bookings */}
                {activeBookings.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
                      <p className="text-[10px] font-bold text-gold/50 uppercase tracking-[0.25em]">
                        {initialToken ? 'Agendamentos ativos' : 'Seus agendamentos'}
                      </p>
                      <div className="h-px flex-1 bg-gradient-to-l from-gold/20 to-transparent" />
                    </div>

                    {(initialToken ? activeBookings : activeBookings).map((b, index) => (
                      <motion.div
                        key={b.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative"
                      >
                        {/* Glow effect on hover */}
                        <div className="absolute -inset-px bg-gradient-to-b from-gold/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative bg-[#0c0c0c] border border-white/[0.06] rounded-2xl overflow-hidden">
                          {/* Gold accent line */}
                          <div className="h-[2px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

                          <div className="p-5 space-y-4">
                            {/* Date + Time Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                                  <Calendar size={16} className="text-gold" />
                                </div>
                                <div>
                                  <p className="text-[16px] font-bold text-white tracking-tight">
                                    {formatDate(b.booking_date)}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[12px] font-black text-gold tabular-nums">
                                      {String(b.booking_time).slice(0, 5)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {b.status && (
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    b.status === 'confirmed'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}
                                >
                                  {b.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                                </span>
                              )}
                            </div>

                            {/* Price */}
                            <div className="flex items-center justify-between pl-[52px]">
                              <span className="text-[16px] font-bold text-white tabular-nums">
                                {formatPrice(b.total_price, { locale: true })}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2.5 pl-[52px]">
                              <button
                                onClick={() => startReschedule(b)}
                                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-gold to-[#b8944d] text-black font-bold text-[10px] uppercase tracking-[0.15em] hover:from-[#d4b06a] hover:to-gold active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
                              >
                                Reagendar
                                <ChevronRight size={12} />
                              </button>
                              <button
                                onClick={() => handleCancelClick(b.id)}
                                disabled={cancellingId === b.id}
                                className="h-11 px-5 rounded-xl border border-white/[0.08] text-zinc-400 hover:bg-white/[0.04] hover:text-white hover:border-white/[0.15] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                              >
                                {cancellingId === b.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <span className="text-[10px] font-bold uppercase tracking-wider">
                                    Cancelar
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Cancelled Bookings */}
                {cancelledBookings.length > 0 && (
                  <div className="space-y-4 mt-8">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.25em] mb-4">
                      Cancelados
                    </p>
                    {cancelledBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="bg-[#0a0a0a] border border-white/[0.03] rounded-2xl p-4 opacity-40"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] text-zinc-600 line-through">
                              {formatShortDate(booking.booking_date)}
                            </span>
                            <span className="text-[12px] text-zinc-600 line-through">
                              {String(booking.booking_time).slice(0, 5)}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-700 uppercase tracking-wider">
                            Cancelado
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {activeBookings.length === 0 && cancelledBookings.length === 0 && !loading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 0.95 }}
                    className="text-center py-20"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                      <Calendar size={24} className="text-zinc-600" />
                    </div>
                    <p className="text-[14px] text-zinc-500 mb-1">Nenhum agendamento encontrado</p>
                    <p className="text-[12px] text-zinc-600">
                      {initialToken
                        ? 'Solicite um novo link ao barbeiro'
                        : 'Faça um agendamento primeiro!'}
                    </p>
                  </motion.div>
                )}

                {/* Back to search (only for phone-based access) */}
                {!initialToken && (
                  <button
                    onClick={() => setView('search')}
                    className="w-full py-3 text-[12px] text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Buscar outro telefone
                  </button>
                )}
              </motion.div>
            )}

            {/* RESCHEDULE VIEW */}
            {view === 'reschedule' && rescheduleBooking && (
              <motion.div
                key="reschedule"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Current appointment info */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Calendar size={14} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-[12px] text-zinc-500">Agendamento atual</p>
                      <p className="text-[12px] font-bold text-white">
                        {formatShortDate(rescheduleBooking.booking_date)} às{' '}
                        {rescheduleBooking.booking_time?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date selection */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    Escolha o novo dia
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
                    {nextDays.map((day) => (
                      <button
                        key={day.fullDate}
                        onClick={() => setSelectedDate(day.fullDate)}
                        className={`flex-shrink-0 w-16 py-3 rounded-xl border text-center transition-all cursor-pointer ${
                          selectedDate === day.fullDate
                            ? 'bg-gold/10 border-gold/30 text-gold'
                            : 'border-white/[0.06] text-zinc-400 hover:border-white/[0.12]'
                        }`}
                      >
                        <p className="text-[10px] font-bold uppercase">{day.dayName}</p>
                        <p className="text-[16px] font-bold mt-0.5">{day.dayNumber}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time selection */}
                {selectedDate && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      Escolha o horário
                    </p>
                    {loadingSlots ? (
                      <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="h-11 bg-white/[0.03] rounded-xl animate-pulse" />
                        ))}
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            className={`py-2.5 rounded-xl border text-[12px] font-bold transition-all cursor-pointer ${
                              selectedTime === slot
                                ? 'bg-gold border-gold text-black'
                                : 'border-white/[0.06] text-zinc-400 hover:border-white/[0.12]'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-zinc-600 text-center py-4">
                        Nenhum horário disponível.
                      </p>
                    )}
                  </div>
                )}

                {/* Name + Phone for reschedule */}
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      Seu nome
                    </p>
                    <input
                      type="text"
                      value={rescheduleName}
                      onChange={(e) => setRescheduleName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[16px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      Seu WhatsApp
                    </p>
                    <input
                      type="tel"
                      value={reschedulePhone}
                      onChange={(e) => setReschedulePhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="(00) 00000-0000"
                      maxLength={11}
                      className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[16px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setView('list')}
                    className="px-5 h-11 border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleConfirmReschedule}
                    disabled={!selectedDate || !selectedTime || rescheduling}
                    className="btn-gold flex-1 h-11 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {rescheduling ? 'Reagendando...' : 'Confirmar'}
                  </button>
                </div>

                {error && <p className="text-[12px] text-red-400/80 text-center">{error}</p>}
              </motion.div>
            )}

            {/* SUCCESS VIEW */}
            {view === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4 py-8"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                  <Check size={24} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[16px] font-bold text-white">Agendamento reagendado!</p>
                  <p className="text-[12px] text-zinc-500 mt-1">
                    Novo horário confirmado com sucesso.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setView('search');
                    setPhone('');
                    setBookings([]);
                  }}
                  className="w-full py-3 text-[12px] text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  Voltar ao início
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Token Input Modal */}
          <AnimatePresence>
            {showTokenModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowTokenModal(false);
                    setTokenInput('');
                    setPendingCancelId(null);
                  }
                }}
                onClick={() => {
                  setShowTokenModal(false);
                  setTokenInput('');
                  setPendingCancelId(null);
                }}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="token-modal-title"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="bg-[#111] border border-white/[0.08] rounded-2xl p-5 w-full max-w-sm space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-center space-y-2">
                    <p id="token-modal-title" className="text-[14px] font-bold text-white">
                      Token de gerenciamento
                    </p>
                    <p className="text-[12px] text-zinc-500">
                      Informe o token enviado no link de gerenciamento do agendamento.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Cole o token aqui"
                    maxLength={255}
                    className="w-full h-10 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 text-[14px] text-white outline-none focus:border-gold transition-all placeholder:text-zinc-600"
                    autoFocus
                  />
                  {error && showTokenModal && (
                    <p className="text-[12px] text-red-400/80 text-center">{error}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowTokenModal(false);
                        setTokenInput('');
                        setPendingCancelId(null);
                      }}
                      className="px-4 h-10 border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleTokenSubmit}
                      disabled={!tokenInput.trim() || cancellingId === pendingCancelId}
                      className="flex-1 h-10 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
                    >
                      {cancellingId === pendingCancelId
                        ? 'Cancelando...'
                        : 'Confirmar cancelamento'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
