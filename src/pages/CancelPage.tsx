import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Calendar } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getBookingsByPhone, cancelBooking, getAvailableSlots, createBooking } from '../lib/api';
import { getNextDays } from '../lib/utils';

interface BookingEntry {
  id: string;
  booking_date: string;
  booking_time: string;
  total_price: number;
  service_ids: string[];
  total_duration?: number;
  clients?: { name: string; phone: string } | { name: string; phone: string }[];
}

type View = 'search' | 'list' | 'reschedule' | 'success';

export default function CancelPage() {
  const location = useLocation();
  const initialPhone = (location.state as { phone?: string })?.phone || '';
  const [phone, setPhone] = useState(initialPhone);
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('search');

  // Cancel state
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const nextDays = getNextDays().filter((d) => {
    const dow = new Date(d.fullDate + 'T12:00:00').getDay();
    return dow >= 1 && dow <= 5; // Seg-Sex (sáb não disponível para reagendamento público)
  });

  const handleSearch = async (e: React.FormEvent) => {
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
      const data = await getBookingsByPhone(phone);
      setBookings(data);
      setView('list');
      if (data.length === 0) {
        setError('Nenhum agendamento futuro encontrado.');
        setView('search');
      }
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
      setBookings((prev) => prev.filter((b) => b.id !== id));
      if (bookings.length === 1) setView('search');
    } catch {
      setError('Erro ao cancelar.');
    } finally {
      setCancellingId(null);
    }
  };

  const startReschedule = async (booking: BookingEntry) => {
    setRescheduleBooking(booking);
    setSelectedDate('');
    setSelectedTime('');
    setAvailableSlots([]);
    setView('reschedule');
  };

  useEffect(() => {
    if (!selectedDate || !rescheduleBooking) {
      setAvailableSlots([]);
      return;
    }

    let active = true;
    setLoadingSlots(true);
    setSelectedTime('');

    getAvailableSlots(selectedDate)
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

    const clientsData = Array.isArray(rescheduleBooking.clients)
      ? rescheduleBooking.clients[0]
      : rescheduleBooking.clients;
    const clientName = clientsData?.name || '';
    const clientPhone = clientsData?.phone || phone.replace(/\D/g, '');

    setRescheduling(true);
    try {
      // Cancel old booking
      await cancelBooking(rescheduleBooking.id);

      // Create new booking
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

      // Update list
      setBookings((prev) => prev.filter((b) => b.id !== rescheduleBooking.id));
      setView('success');
    } catch {
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

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <img src="/assets/logo.webp" alt="Black Diamond" className="w-12 h-12 mx-auto" />
          <h1 className="text-lg font-bold text-white">
            {view === 'reschedule' ? 'Reagendar' : 'Cancelar ou Reagendar'}
          </h1>
          {view === 'search' && (
            <p className="text-[12px] text-zinc-500">Digite o telefone do agendamento.</p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* SEARCH VIEW */}
          {view === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <form onSubmit={handleSearch} className="space-y-3">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[15px] text-white outline-none focus:border-[#C5A059] transition-all placeholder:text-zinc-600"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#C5A059] text-black font-bold text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#A68233] transition-all disabled:opacity-50 cursor-pointer"
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
              className="space-y-3"
            >
              {error && <p className="text-[12px] text-red-400/80 text-center">{error}</p>}
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[13px] font-bold text-white capitalize">
                        {formatDate(b.booking_date)}
                      </p>
                      <p className="text-[12px] text-[#C5A059] font-bold">
                        {b.booking_time?.slice(0, 5)}
                      </p>
                    </div>
                    <span className="text-[12px] font-bold text-zinc-400">
                      R${' '}
                      {Number(b.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startReschedule(b)}
                      className="flex-1 h-9 bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] hover:bg-[#C5A059]/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Reagendar
                    </button>
                    <button
                      onClick={() => handleCancel(b.id)}
                      disabled={cancellingId === b.id}
                      className="flex-1 h-9 border border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                    >
                      {cancellingId === b.id ? '...' : 'Cancelar'}
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setView('search')}
                className="w-full py-3 text-[11px] text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                Buscar outro telefone
              </button>
            </motion.div>
          )}

          {/* RESCHEDULE VIEW */}
          {view === 'reschedule' && rescheduleBooking && (
            <motion.div
              key="reschedule"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* Current appointment info */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Calendar size={14} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500">Agendamento atual</p>
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
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {nextDays.map((day) => (
                    <button
                      key={day.fullDate}
                      onClick={() => setSelectedDate(day.fullDate)}
                      className={`flex-shrink-0 w-16 py-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedDate === day.fullDate
                          ? 'bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059]'
                          : 'border-white/[0.06] text-zinc-400 hover:border-white/[0.12]'
                      }`}
                    >
                      <p className="text-[9px] font-bold uppercase">{day.dayName}</p>
                      <p className="text-[18px] font-bold mt-0.5">{day.dayNumber}</p>
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
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-11 bg-white/[0.03] rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2.5 rounded-xl border text-[12px] font-bold transition-all cursor-pointer ${
                            selectedTime === slot
                              ? 'bg-[#C5A059] border-[#C5A059] text-black'
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

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setView('list')}
                  className="px-5 h-11 border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirmReschedule}
                  disabled={!selectedDate || !selectedTime || rescheduling}
                  className="flex-1 h-11 bg-[#C5A059] text-black font-bold text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#A68233] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {rescheduling ? 'Reagendando...' : 'Confirmar'}
                </button>
              </div>
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
                <p className="text-[15px] font-bold text-white">Agendamento reagendado!</p>
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
                className="px-6 py-2.5 bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Voltar ao início
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
