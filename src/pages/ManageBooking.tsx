import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Scissors,
  DollarSign,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { getBookingsByToken, cancelBooking, type ManagedBooking } from '../lib/api';
import { formatDateBR } from '../lib/utils';

const ManageBooking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

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
      } catch {
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
      await cancelBooking(bookingId);
      setCancelledIds((prev) => new Set(prev).add(bookingId));
    } catch {
      setError('Erro ao cancelar. Tente novamente.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReschedule = (booking: ManagedBooking) => {
    navigate('/cancelar', {
      state: {
        phone: booking.client_phone,
        token: token,
      },
    });
  };

  const activeBookings = bookings.filter((b) => !cancelledIds.has(b.booking_id));
  const cancelledBookings = bookings.filter((b) => cancelledIds.has(b.booking_id));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={24} className="text-[#C5A059] animate-spin" />
          <p className="text-[12px] text-zinc-500">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <span className="text-2xl">❌</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-2">Link inválido</h1>
            <p className="text-sm text-zinc-500">{error}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="h-11 px-8 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer"
          >
            Voltar ao início
          </button>
        </div>
      </div>
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

        {/* Active Bookings */}
        {activeBookings.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Agendamentos ativos
            </p>
            {activeBookings.map((booking) => (
              <motion.div
                key={booking.booking_id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5 space-y-4"
              >
                {/* Date + Time */}
                <div className="flex items-baseline gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#C5A059]/60" />
                    <span className="text-[14px] font-bold text-white">
                      {formatDateBR(booking.booking_date)}
                    </span>
                  </div>
                  <div className="w-px h-3 bg-white/[0.08]" />
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#C5A059]/60" />
                    <span className="text-[14px] font-black text-[#C5A059] tabular-nums">
                      {String(booking.booking_time).slice(0, 5)}
                    </span>
                  </div>
                </div>

                {/* Services */}
                <div className="flex items-start gap-2">
                  <Scissors size={12} className="text-zinc-600 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-zinc-400">{booking.service_names.join(', ')}</p>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1">
                    <DollarSign size={12} className="text-[#C5A059]/50" />
                    <span className="text-[13px] font-bold text-white tabular-nums">
                      R${' '}
                      {Number(booking.total_price).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    {booking.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleReschedule(booking)}
                    className="flex-1 h-10 rounded-xl bg-[#C5A059] text-black font-black text-[10px] uppercase tracking-[0.15em] hover:bg-[#d4b06a] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Reagendar
                  </button>
                  <button
                    onClick={() => handleCancel(booking.booking_id)}
                    disabled={cancellingId === booking.booking_id}
                    className="h-10 px-4 rounded-xl border border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer disabled:opacity-50"
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
              </motion.div>
            ))}
          </div>
        )}

        {/* Cancelled Bookings */}
        {cancelledBookings.length > 0 && (
          <div className="space-y-3 mt-6">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
              Cancelados
            </p>
            {cancelledBookings.map((booking) => (
              <div
                key={booking.booking_id}
                className="bg-[#111111]/50 border border-white/[0.03] rounded-2xl p-4 opacity-50"
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-[12px] text-zinc-600 line-through">
                    {formatDateBR(booking.booking_date)}
                  </span>
                  <span className="text-[12px] text-zinc-600 line-through">
                    {String(booking.booking_time).slice(0, 5)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {activeBookings.length === 0 && cancelledBookings.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[12px] text-zinc-500">Nenhum agendamento encontrado.</p>
          </div>
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
              <div className="max-w-lg mx-auto bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-[11px] text-red-400">{error}</span>
                <button
                  onClick={() => setError('')}
                  className="ml-auto text-red-400 hover:text-red-300 cursor-pointer"
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ManageBooking;
