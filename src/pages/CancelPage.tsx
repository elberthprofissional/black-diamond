import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getBookingsByPhone, cancelBooking } from '../lib/api';

interface BookingEntry {
  id: string;
  booking_date: string;
  booking_time: string;
  total_price: number;
  service_ids: string[];
  clients?: { name: string; phone: string } | { name: string; phone: string }[];
}

export default function CancelPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelledId, setCancelledId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Informe um telefone válido com DDD.');
      return;
    }

    setLoading(true);
    setError('');
    setBookings([]);
    setCancelledId(null);

    try {
      const data = await getBookingsByPhone(phone);
      setBookings(data);
      setSearched(true);
      if (data.length === 0) {
        setError('Nenhum agendamento futuro encontrado para esse telefone.');
      }
    } catch {
      setError('Erro ao buscar agendamentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelBooking(id);
      setCancelledId(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError('Erro ao cancelar. Tente novamente.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReschedule = (booking: BookingEntry) => {
    const clientsData = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients;
    const clientName = clientsData?.name || '';
    const clientPhone = clientsData?.phone || phone.replace(/\D/g, '');
    navigate(
      `/agendar?client=${encodeURIComponent(clientName)}&phone=${encodeURIComponent(clientPhone)}`
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <img src="/assets/logo.webp" alt="Black Diamond" className="w-16 h-16 mx-auto" />
          <h1 className="text-lg font-bold text-white">Cancelar ou Reagendar</h1>
          <p className="text-[12px] text-zinc-500 leading-relaxed">
            Digite o telefone usado no agendamento para ver seus horários.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest"
            >
              Telefone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 90000-0000"
              className="w-full h-12 bg-transparent border border-white/[0.08] rounded-xl px-4 text-sm text-white outline-none focus:border-[#C5A059] transition-all placeholder:text-zinc-600"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#C5A059] text-black font-bold text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-white transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Buscando...' : 'Buscar Agendamentos'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[12px] text-red-400/80 text-center"
          >
            {error}
          </motion.p>
        )}

        {/* Cancelled confirmation */}
        {cancelledId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center space-y-2"
          >
            <p className="text-[12px] text-emerald-400 font-medium">
              Agendamento cancelado com sucesso!
            </p>
          </motion.div>
        )}

        {/* Bookings List */}
        {searched && bookings.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Seus agendamentos
            </p>
            {bookings.map((b) => (
              <div
                key={b.id}
                className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[13px] font-bold text-white capitalize">
                      {formatDate(b.booking_date)}
                    </p>
                    <p className="text-[12px] text-[#C5A059] font-bold mt-0.5">
                      {b.booking_time?.slice(0, 5)}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400">
                    R$ {Number(b.total_price).toFixed(0)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleReschedule(b)}
                    className="flex-1 h-9 bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] hover:bg-[#C5A059]/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Reagendar
                  </button>
                  <button
                    onClick={() => handleCancel(b.id)}
                    disabled={cancellingId === b.id}
                    className="flex-1 h-9 border border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    {cancellingId === b.id ? 'Cancelando...' : 'Cancelar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
