import { useState, useEffect, type FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Scissors,
  DollarSign,
  ArrowLeft,
  Loader2,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import { getBookingsByToken, cancelBooking, type ManagedBooking } from '../lib/api';
import { formatDateBR, formatPrice } from '../lib/utils';
import { logError } from '../lib/logger';

const ManageBooking: FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<ManagedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) {
      setError('Link inválido. Solicite um novo link ao barbeiro.');
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      try {
        const data = await getBookingsByToken(token);
        setBookings(data);
      } catch (e) {
        logError(e);
        setError('Erro ao buscar agendamentos. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [token]);

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await cancelBooking(bookingId, token || undefined);
      setCancelledIds((prev) => new Set(prev).add(bookingId));
    } catch (e) {
      logError(e);
      setError('Erro ao cancelar. Tente novamente.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReschedule = (bookingId?: string) => {
    navigate('/cancelar', {
      state: {
        token: token,
        bookingId: bookingId,
      },
    });
  };

  const activeBookings = bookings.filter((b) => !cancelledIds.has(b.booking_id));
  const cancelledBookings = bookings.filter((b) => cancelledIds.has(b.booking_id));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
            <Sparkles
              size={14}
              className="text-[#D4AF37] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          </div>
          <p className="text-[11px] text-zinc-500 tracking-wide">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-8">
          <div className="relative inline-flex">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 flex items-center justify-center rotate-3">
              <X size={28} className="text-red-400" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-xl font-bold text-white tracking-tight">Link inválido</h1>
            <p className="text-[13px] text-zinc-500 leading-relaxed max-w-[260px] mx-auto">
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D4AF37]/[0.03] via-transparent to-transparent pointer-events-none" />

      <div className="relative px-4 py-8 pb-12">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-10"
          >
            <button
              onClick={() => navigate('/')}
              className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Meus Agendamentos</h1>
              <p className="text-[10px] text-[#D4AF37]/60 uppercase tracking-[0.2em] font-medium">
                Black Diamond
              </p>
            </div>
          </motion.div>

          {/* Active Bookings */}
          {activeBookings.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-gradient-to-r from-[#D4AF37]/20 to-transparent" />
                <p className="text-[9px] font-bold text-[#D4AF37]/50 uppercase tracking-[0.25em]">
                  Agendamentos ativos
                </p>
                <div className="h-px flex-1 bg-gradient-to-l from-[#D4AF37]/20 to-transparent" />
              </div>

              {activeBookings.map((booking, index) => (
                <motion.div
                  key={booking.booking_id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative"
                >
                  {/* Glow effect on hover */}
                  <div className="absolute -inset-px bg-gradient-to-b from-[#D4AF37]/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative bg-[#0c0c0c] border border-white/[0.06] rounded-2xl overflow-hidden">
                    {/* Gold accent line */}
                    <div className="h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

                    <div className="p-5 space-y-4">
                      {/* Date + Time Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                            <Calendar size={16} className="text-[#D4AF37]" />
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-white tracking-tight">
                              {formatDateBR(booking.booking_date)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock size={10} className="text-[#D4AF37]/60" />
                              <p className="text-[12px] font-black text-[#D4AF37] tabular-nums">
                                {String(booking.booking_time).slice(0, 5)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div
                          className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            booking.status === 'confirmed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {booking.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                        </div>
                      </div>

                      {/* Services */}
                      <div className="flex items-start gap-3 pl-[52px]">
                        <Scissors size={12} className="text-zinc-600 mt-0.5 shrink-0" />
                        <p className="text-[12px] text-zinc-400 leading-relaxed">
                          {booking.service_names.join(' · ')}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="pl-[52px]">
                        <div className="h-px bg-white/[0.04]" />
                      </div>

                      {/* Price + Actions */}
                      <div className="flex items-center justify-between pl-[52px]">
                        <div className="flex items-center gap-1.5">
                          <DollarSign size={13} className="text-[#D4AF37]/60" />
                          <span className="text-[15px] font-bold text-white tabular-nums">
                            {formatPrice(booking.total_price, { locale: true })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2.5 pl-[52px]">
                        <button
                          onClick={() => handleReschedule(booking.booking_id)}
                          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#b8944d] text-black font-bold text-[10px] uppercase tracking-[0.15em] hover:from-[#d4b06a] hover:to-[#D4AF37] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20"
                        >
                          Reagendar
                          <ChevronRight size={12} />
                        </button>
                        <button
                          onClick={() => handleCancel(booking.booking_id)}
                          disabled={cancellingId === booking.booking_id}
                          className="h-11 px-5 rounded-xl border border-white/[0.08] text-zinc-400 hover:bg-white/[0.04] hover:text-white hover:border-white/[0.15] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                        >
                          {cancellingId === booking.booking_id ? (
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
            <div className="space-y-3 mt-8">
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.25em] mb-4">
                Cancelados
              </p>
              {cancelledBookings.map((booking) => (
                <div
                  key={booking.booking_id}
                  className="bg-[#0a0a0a] border border-white/[0.03] rounded-2xl p-4 opacity-40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-zinc-600 line-through">
                        {formatDateBR(booking.booking_date)}
                      </span>
                      <span className="text-[12px] text-zinc-600 line-through">
                        {String(booking.booking_time).slice(0, 5)}
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-700 uppercase tracking-wider">
                      Cancelado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {activeBookings.length === 0 && cancelledBookings.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                <Calendar size={24} className="text-zinc-600" />
              </div>
              <p className="text-[13px] text-zinc-500 mb-1">Nenhum agendamento encontrado</p>
              <p className="text-[11px] text-zinc-600">Solicite um novo link ao barbeiro</p>
            </motion.div>
          )}

          {/* Error Toast */}
          <AnimatePresence>
            {error && bookings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-8 left-4 right-4 z-[200]"
              >
                <div className="max-w-lg mx-auto bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-sm">
                  <span className="text-[11px] text-red-400">{error}</span>
                  <button
                    onClick={() => setError('')}
                    className="ml-auto text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ManageBooking;
