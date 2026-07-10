import { useState, type FC, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Scissors,
  DollarSign,
  Loader2,
  ArrowLeft,
  Phone,
  User,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBookingsByPhone, cancelBooking } from '../lib/api';
import { formatPhone, formatDateBR } from '../lib/utils';

interface BookingEntry {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
  total_duration: number;
  service_ids: string[];
  clients: { name: string; phone: string };
  token?: string;
}

const ClientProfile: FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<BookingEntry | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setConfirmCancel(null);
    if (phone.replace(/\D/g, '').length < 11) {
      setError('Informe um celular válido com DDD (11 dígitos).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getBookingsByPhone(phone);
      setBookings(data as BookingEntry[]);
      setSearched(true);
      if (data.length === 0) {
        setError('Nenhum agendamento futuro encontrado para este telefone.');
      }
    } catch {
      setError('Erro ao buscar agendamentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (booking: BookingEntry) => {
    setCancellingId(booking.id);
    setConfirmCancel(null);
    try {
      await cancelBooking(booking.id, booking.token);
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch {
      setError('Erro ao cancelar. Tente novamente.');
    } finally {
      setCancellingId(null);
    }
  };

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

        {/* Phone Search */}
        {!searched && (
          <form onSubmit={handleSearch} className="space-y-3">
            <p className="text-[12px] text-zinc-500">
              Digite seu telefone para ver seus agendamentos.
            </p>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 text-[15px] text-white outline-none focus:border-[#C5A059] transition-all placeholder:text-zinc-600"
              />
            </div>
            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length < 11}
              className="w-full h-11 bg-[#C5A059] text-black font-bold text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#A68233] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
            </button>
            {error && <p className="text-[12px] text-red-400/80 text-center">{error}</p>}
          </form>
        )}

        {/* Bookings List */}
        {searched && (
          <div className="space-y-3">
            {bookings.length > 0 && (
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {bookings.length}{' '}
                {bookings.length === 1 ? 'agendamento encontrado' : 'agendamentos encontrados'}
              </p>
            )}

            {bookings.map((booking) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5 space-y-4"
              >
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

                {booking.clients && (
                  <div className="flex items-center gap-2 text-[12px] text-zinc-400">
                    <User size={12} />
                    {booking.clients.name}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Scissors size={12} className="text-zinc-600 shrink-0" />
                  <span className="text-[12px] text-zinc-400">
                    {booking.service_ids.length}{' '}
                    {booking.service_ids.length === 1 ? 'serviço' : 'serviços'}
                  </span>
                </div>

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

                <button
                  onClick={() => setConfirmCancel(booking)}
                  disabled={cancellingId === booking.id}
                  className="w-full h-10 rounded-xl border border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                >
                  {cancellingId === booking.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Cancelar Agendamento'
                  )}
                </button>
              </motion.div>
            ))}

            <button
              onClick={() => {
                setSearched(false);
                setBookings([]);
                setPhone('');
              }}
              className="w-full py-3 text-[11px] text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              Buscar outro telefone
            </button>
          </div>
        )}

        {/* Confirm Cancel Modal */}
        <AnimatePresence>
          {confirmCancel && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmCancel(null)}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative z-10 w-full max-w-sm bg-[#1C1C1E] rounded-2xl overflow-hidden"
              >
                <div className="px-6 pt-6 pb-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={24} className="text-red-400" />
                  </div>
                  <p className="text-[16px] font-bold text-white mb-2">Cancelar Agendamento?</p>
                  <p className="text-[12px] text-zinc-500 leading-relaxed">
                    {confirmCancel.clients?.name}, {formatDateBR(confirmCancel.booking_date)} às{' '}
                    {String(confirmCancel.booking_time).slice(0, 5)}
                  </p>
                  <p className="text-[11px] text-zinc-600 mt-2">Esta ação não pode ser desfeita.</p>
                </div>
                <div className="flex border-t border-white/[0.06]">
                  <button
                    onClick={() => setConfirmCancel(null)}
                    className="flex-1 py-4 text-[13px] font-medium text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <div className="w-px bg-white/[0.06]" />
                  <button
                    onClick={() => handleCancel(confirmCancel)}
                    disabled={cancellingId === confirmCancel.id}
                    className="flex-1 py-4 text-[13px] font-semibold text-red-500 hover:text-red-400 transition-all cursor-pointer disabled:opacity-30"
                  >
                    {cancellingId === confirmCancel.id ? (
                      <Loader2 size={14} className="animate-spin mx-auto" />
                    ) : (
                      'Confirmar Cancelamento'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Error Toast */}
        <AnimatePresence>
          {error && searched && bookings.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6"
            >
              <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-6 text-center">
                <p className="text-[13px] text-zinc-400">{error}</p>
                <button
                  onClick={() => {
                    setSearched(false);
                    setError('');
                  }}
                  className="mt-4 text-[11px] text-[#C5A059] hover:text-white transition-colors cursor-pointer"
                >
                  Tentar novamente
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClientProfile;
