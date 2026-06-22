import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateBookingStatus, deleteBooking, getAvailableSlots, createBooking, getBookings } from '../lib/api';
import { getLocalDateString, TIME_SLOTS } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useServices } from '../hooks/useServices';
import { useBookings } from '../hooks/useBookings';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import AdminLayout from '../components/Admin/AdminLayout';
import FilterTabs from '../components/Admin/shared/FilterTabs';
import UnblockModal from '../components/Admin/shared/UnblockModal';
import CompleteModal from '../components/Admin/shared/CompleteModal';
import DeleteModal from '../components/Admin/shared/DeleteModal';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import WhatsAppReminderButton from '../components/Admin/shared/WhatsAppReminderButton';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

import type { BookingWithClient, Service, Booking } from '../types';

const AdminDashboard: React.FC = () => {
  const selectedDate = getLocalDateString();
  const { bookings, loading, refetch: loadData } = useBookings(selectedDate);
  const { services } = useServices();
  const { toast, showSuccess, showError } = useToast();
  const [completingBooking, setCompletingBooking] = useState<BookingWithClient | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithClient | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<BookingWithClient | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [filter, setFilter] = useState<'occupied' | 'free' | 'blocked'>('occupied');
  const { 
    blockingSlot, 
    unblockingBooking, 
    setUnblockingBooking, 
    blockSlot, 
    unblockSlot, 
    blockingDay, 
    blockEntireDay, 
    unblockEntireDay 
  } = useSlotBlocking();
  const navigate = useNavigate();

  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Rescheduling states
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleServices, setRescheduleServices] = useState<Service[]>([]);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [existingBookingsForReschedule, setExistingBookingsForReschedule] = useState<Booking[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);
  const [rescheduleStep, setRescheduleStep] = useState(1);

  useEffect(() => {
    if (!selectedBooking) {
      setIsRescheduling(false);
    }
  }, [selectedBooking]);

  useEffect(() => {
    if (!isRescheduling || !rescheduleDate) return;
    let active = true;
    setLoadingSlots(true);
    getBookings(rescheduleDate)
      .then(data => {
        if (active) {
          setExistingBookingsForReschedule(data || []);
        }
      })
      .catch(err => console.error(err))
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [rescheduleDate, isRescheduling]);

  const handleStartReschedule = () => {
    if (!selectedBooking) return;
    const initialServices = services.filter(s => selectedBooking.service_ids?.includes(s.id));
    setRescheduleServices(initialServices);
    setRescheduleDate(selectedBooking.booking_date);
    setRescheduleTime(selectedBooking.booking_time.slice(0, 5));
    setRescheduleStep(1);
    setIsRescheduling(true);
  };

  const handleConfirmReschedule = async () => {
    if (!selectedBooking || rescheduleServices.length === 0 || !rescheduleDate || !rescheduleTime) return;
    setIsSavingReschedule(true);
    try {
      await deleteBooking(selectedBooking.id);
      
      const totalPrice = rescheduleServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
      const totalDuration = rescheduleServices.reduce((sum, s) => sum + (s.duration || 0), 0);

      await createBooking(
        {
          service_ids: rescheduleServices.map(s => s.id),
          booking_date: rescheduleDate,
          booking_time: rescheduleTime,
          total_price: totalPrice,
          total_duration: totalDuration
        },
        {
          name: selectedBooking.clients?.name || '',
          phone: selectedBooking.clients?.phone || ''
        }
      );

      showSuccess('Agendamento reagendado com sucesso!');
      setSelectedBooking(null);
      setIsRescheduling(false);
      await loadData();
    } catch (err) {
      showError('Erro ao reagendar.');
      console.error(err);
    } finally {
      setIsSavingReschedule(false);
    }
  };

  useEffect(() => {
    const loadAvailableSlots = async () => {
      try {
        const slots = await getAvailableSlots(selectedDate);
        setAvailableSlots(slots);
      } catch (error) {
        console.error(error);
        // Fallback para slots padrão
        setAvailableSlots(['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']);
      }
    };
    loadAvailableSlots();
  }, [selectedDate]);

  const handleComplete = async () => {
    if (!completingBooking) return;
    try {
      await updateBookingStatus(completingBooking.id, 'completed');
      setCompletingBooking(null);
      loadData();
      showSuccess('Atendimento concluído!');
    } catch {
      showError('Erro ao finalizar agendamento.');
    }
  };

  const handleBlockSlot = async (slot: string) => {
    await blockSlot(selectedDate, slot, loadData);
  };

  const confirmUnblock = async () => {
    if (!unblockingBooking) return;
    await unblockSlot(unblockingBooking.id, loadData);
  };

  const dailyRevenue = bookings
    .filter(b => b.status === 'completed' || b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);


  const occupiedBookings = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled' && b.clients?.name !== 'BLOQUEADO');
  const blockedBookings = bookings.filter(b => b.status !== 'cancelled' && b.clients?.name === 'BLOQUEADO');
  
  const isTimeOccupied = (time: string) => {
    return bookings.some(b => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === time);
  };
  const freeSlots = availableSlots.filter(slot => !isTimeOccupied(slot));

  const occupiedCount = occupiedBookings.length;
  const freeCount = freeSlots.length;
  const blockedCount = blockedBookings.length;

  const getNextBooking = () => {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    const upcoming = bookings
      .filter(b => b.status !== 'cancelled' && b.booking_time >= currentTime && b.clients?.name !== 'BLOQUEADO')
      .sort((a, b) => a.booking_time.localeCompare(b.booking_time));
    
    return upcoming[0] || null;
  };

  const getNext14Days = () => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push({
        dateStr: getLocalDateString(d),
        dayNum: String(d.getDate()).padStart(2, '0'),
        dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        monthName: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        rawDate: d,
      });
    }
    return list;
  };

  const nextBooking = getNextBooking();

  return (
    <AdminLayout
      mainClassName="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-8 pb-40 transition-all duration-300 max-w-5xl"
    >
      <div className="space-y-5">
            
            {/* Left Column: Agenda Content */}
            <div className="space-y-5">
              {/* 1. TOP BAR */}
              <div className="hidden lg:flex items-center justify-between gap-4 pb-3 border-b border-white/5">
                <h1 className="text-2xl font-bold tracking-tight text-white uppercase italic">Agenda do Dia</h1>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <button
                  onClick={() => nextBooking && setSelectedBooking(nextBooking)}
                  className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex items-center gap-3 min-w-0 group hover:border-[#C5A059]/20 hover:bg-white/[0.01] transition-all cursor-pointer"
                >
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Próximo Cliente</span>
                    {nextBooking ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white uppercase tracking-tight truncate">{nextBooking.clients?.name.split(' ')[0]}</span>
                        <span className="text-xs font-bold text-[#C5A059] tabular-nums">{nextBooking.booking_time.slice(0, 5)}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-zinc-600">Sem cliente para hoje</span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#C5A059] transition-colors shrink-0" />
                </button>
                <div className="bg-[#111111] border border-white/5 py-3 px-4 rounded-2xl flex flex-col items-start">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Lucro do Dia</span>
                  <span className="text-sm font-black text-[#C5A059] tabular-nums">R$ {dailyRevenue.toFixed(0)}</span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex border-b border-white/[0.04] pb-1 pt-1 justify-start">
                <FilterTabs
                  filter={filter}
                  setFilter={setFilter}
                  layoutId="dailyFilter"
                  occupiedCount={occupiedCount}
                  freeCount={freeCount}
                  blockedCount={blockedCount}
                />
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
                  <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Carregando...</span>
                </div>
              ) : (
                <div className="pt-2">
                  {filter === 'occupied' && (
                    <div className="space-y-2">
                      {occupiedBookings.length === 0 ? (
                        <p className="text-zinc-700 text-[10px] uppercase tracking-widest text-center py-8">Nenhum agendamento</p>
                      ) : (
                        occupiedBookings.map((booking) => (
                          <div
                            key={booking.id}
                            onClick={() => setSelectedBooking(booking)}
                            className={`flex items-center rounded-lg border cursor-pointer transition-all group ${
                              selectedBooking?.id === booking.id
                                ? 'border-[#C5A059]/40 bg-[#C5A059]/5'
                                : 'border-white/5 bg-[#111111] hover:border-white/10'
                            }`}
                          >
                            <div className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0">
                              <span className="text-sm font-bold text-zinc-500 tabular-nums w-10 shrink-0">{booking.booking_time.slice(0, 5)}</span>
                              <div className="w-px h-3.5 bg-white/10 shrink-0" />
                              <span className="text-[11px] font-medium text-zinc-200 truncate">{booking.clients?.name}</span>
                            </div>
                            {booking.clients?.phone && (
                              <WhatsAppReminderButton booking={booking} className="p-2.5 text-zinc-500 hover:text-emerald-500 transition-colors shrink-0" />
                            )}
                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 mr-1" />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {filter === 'free' && (
                    <div className="space-y-2">
                      {freeSlots.length > 0 && (
                        <button
                          onClick={() => blockEntireDay(selectedDate, freeSlots, loadData)}
                          disabled={blockingDay}
                          className="group w-full mb-4 py-3.5 px-4 bg-zinc-900/30 hover:bg-red-500/[0.04] border border-white/[0.04] hover:border-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                        >
                          {blockingDay ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:scale-110"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          )}
                          Bloquear Dia Inteiro
                        </button>
                      )}
                      {freeSlots.length === 0 ? (
                        <p className="text-zinc-700 text-[10px] uppercase tracking-widest text-center py-8">Nenhum horário livre</p>
                      ) : (
                        freeSlots.map((slot) => (
                          <div key={`free-${slot}`} className="flex items-center bg-[#111111] border border-white/5 rounded-lg px-3 py-2.5">
                            <span className="text-sm font-bold text-zinc-400 tabular-nums w-10 shrink-0">{slot}</span>
                            <div className="flex-1 flex items-center justify-end gap-6">
                              <button
                                onClick={() => handleBlockSlot(slot)}
                                disabled={blockingSlot === slot}
                                className="text-[9px] font-bold uppercase tracking-wider text-red-400/60 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {blockingSlot === slot ? '...' : 'Bloquear'}
                              </button>
                              <button
                                onClick={() => navigate('/admin/agendar', { state: { date: selectedDate, time: slot } })}
                                className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer"
                              >
                                Agendar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {filter === 'blocked' && (
                    <div className="space-y-2">
                      {blockedBookings.length > 0 && (
                        <button
                          onClick={() => unblockEntireDay(blockedBookings, loadData)}
                          disabled={blockingDay}
                          className="group w-full mb-4 py-3.5 px-4 bg-zinc-900/30 hover:bg-emerald-500/[0.04] border border-white/[0.04] hover:border-emerald-500/20 text-zinc-400 hover:text-emerald-400 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                        >
                          {blockingDay ? (
                            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:scale-110"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                          )}
                          Liberar Dia Inteiro
                        </button>
                      )}
                      {blockedBookings.length === 0 ? (
                        <p className="text-zinc-700 text-[10px] uppercase tracking-widest text-center py-8">Nenhum horário bloqueado</p>
                      ) : (
                        blockedBookings.map((booking) => (
                          <div key={`blocked-${booking.id}`} className="flex items-center bg-[#111111] border border-white/5 rounded-lg px-3 py-2.5">
                            <span className="text-sm font-bold text-zinc-500 tabular-nums w-10 shrink-0">{booking.booking_time.slice(0, 5)}</span>
                            <div className="flex-1 flex items-center justify-end">
                              <button
                                onClick={() => setUnblockingBooking(booking)}
                                className="text-[9px] font-bold uppercase tracking-wider text-red-400/70 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                Desbloquear
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
      </div>

      {/* Desktop Detail Panel - Fixed Sidebar */}
      {isDesktop && (
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-[400px] h-full bg-[#0E0E0E] border-l border-white/[0.06] shadow-2xl overflow-hidden flex flex-col"
            >
              {isRescheduling ? (
                <>
                  {/* Header */}
                  <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 border-b border-white/[0.04]">
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => rescheduleStep > 1 ? setRescheduleStep(rescheduleStep - 1) : setIsRescheduling(false)} 
                          className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        </button>
                        <div>
                          <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em] block">Reagendamento</span>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5 truncate max-w-[180px]">{selectedBooking.clients?.name}</h3>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedBooking(null); setIsRescheduling(false); setRescheduleStep(1); }} className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                    {/* Step progress bar */}
                    <div className="flex gap-1 px-6 pb-3">
                      {[1, 2, 3].map(step => (
                        <div key={step} className={`flex-1 h-[2px] rounded-full transition-all duration-300 ${step <= rescheduleStep ? 'bg-[#C5A059]' : 'bg-white/[0.06]'}`} />
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <AnimatePresence mode="wait">
                      {/* Step 1: Services */}
                      {rescheduleStep === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="px-6 py-6 space-y-5">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.25em] block">Serviços</span>
                            <p className="text-[10px] text-zinc-600">Selecione os serviços para este agendamento</p>
                          </div>
                          <div className="space-y-2">
                            {services.map(srv => {
                              const isSelected = rescheduleServices.some(s => s.id === srv.id);
                              return (
                                <div 
                                  key={srv.id} 
                                  onClick={() => {
                                    if (isSelected) {
                                      setRescheduleServices(rescheduleServices.filter(s => s.id !== srv.id));
                                    } else {
                                      setRescheduleServices([...rescheduleServices, srv]);
                                    }
                                  }}
                                  className={`flex items-center p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                                    isSelected 
                                      ? 'border-[#C5A059]/40 bg-[#C5A059]/[0.06] shadow-[0_0_20px_rgba(197,160,89,0.05)]' 
                                      : 'border-white/[0.04] bg-[#111111] hover:border-white/[0.08]'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all duration-200 shrink-0 ${
                                      isSelected ? 'border-[#C5A059] bg-[#C5A059]' : 'border-white/10 bg-transparent'
                                    }`}>
                                      {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </span>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[11px] font-bold text-zinc-100">{srv.name}</span>
                                      {srv.duration && (
                                        <span className="text-[9px] text-zinc-500 mt-0.5">{srv.duration} min</span>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`text-xs font-black tabular-nums shrink-0 ${isSelected ? 'text-[#C5A059]' : 'text-zinc-500'}`}>R$ {Number(srv.price || 0).toFixed(0)}</span>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            disabled={rescheduleServices.length === 0}
                            onClick={() => setRescheduleStep(2)}
                            className="w-full py-3.5 bg-[#C5A059] hover:bg-white text-black font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                          >
                            Continuar
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          </button>
                        </motion.div>
                      )}

                      {/* Step 2: Date + Time */}
                      {rescheduleStep === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="px-6 py-6 space-y-6">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.25em] block">Data e Horário</span>
                            <p className="text-[10px] text-zinc-600">Escolha a nova data e horário</p>
                          </div>

                          {/* Date ribbon */}
                          <div className="space-y-3">
                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block px-1">Nova Data</span>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x flex-nowrap">
                              {getNext14Days().map(day => {
                                const isSelected = rescheduleDate === day.dateStr;
                                return (
                                  <button
                                    key={day.dateStr}
                                    type="button"
                                    onClick={() => setRescheduleDate(day.dateStr)}
                                    className={`flex flex-col items-center justify-center shrink-0 w-[52px] py-3 rounded-xl border transition-all cursor-pointer snap-start ${
                                      isSelected
                                        ? 'border-[#C5A059] bg-[#C5A059]/10 text-white shadow-[0_0_15px_rgba(197,160,89,0.15)]'
                                        : 'border-white/[0.04] bg-white/[0.01] text-zinc-500 hover:text-zinc-200 hover:border-white/[0.08]'
                                    }`}
                                  >
                                    <span className="text-[7px] font-extrabold uppercase tracking-wider opacity-60 mb-1 leading-none">{day.dayName}</span>
                                    <span className={`text-sm font-black leading-none ${isSelected ? 'text-[#C5A059]' : 'text-zinc-300'}`}>{day.dayNum}</span>
                                    <span className="text-[7px] font-bold uppercase tracking-wider opacity-60 mt-1 leading-none">{day.monthName}</span>
                                  </button>
                                );
                              })}
                              <div className="relative shrink-0 w-[52px] flex items-center justify-center">
                                <input
                                  type="date"
                                  value={rescheduleDate}
                                  onChange={(e) => setRescheduleDate(e.target.value)}
                                  min={getLocalDateString()}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className={`flex flex-col items-center justify-center w-full py-3 rounded-xl border transition-all pointer-events-none ${
                                  !getNext14Days().some(d => d.dateStr === rescheduleDate) && rescheduleDate
                                    ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]'
                                    : 'border-white/[0.04] bg-white/[0.01] text-zinc-500'
                                }`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mb-0.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                  <span className="text-[6px] font-black uppercase tracking-widest text-center leading-none">Outra</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Time grid */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Novo Horário</span>
                              {!loadingSlots && (
                                <span className="text-[7px] font-bold text-[#C5A059] uppercase tracking-wider">
                                  {TIME_SLOTS.filter(slot => {
                                    const occupied = rescheduleDate === selectedBooking.booking_date && slot === selectedBooking.booking_time.slice(0, 5)
                                      ? false 
                                      : existingBookingsForReschedule.some(b => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === slot);
                                    return !occupied;
                                  }).length} livres
                                </span>
                              )}
                            </div>
                            {loadingSlots ? (
                              <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
                                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Carregando...</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-4 gap-2">
                                {TIME_SLOTS.map(slot => {
                                  const occupied = rescheduleDate === selectedBooking.booking_date && slot === selectedBooking.booking_time.slice(0, 5)
                                    ? false 
                                    : existingBookingsForReschedule.some(b => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === slot);
                                  const isSelected = rescheduleTime === slot;
                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      disabled={occupied}
                                      onClick={() => setRescheduleTime(slot)}
                                      className={`py-2.5 text-[10px] font-black rounded-lg border text-center transition-all cursor-pointer disabled:opacity-15 disabled:cursor-not-allowed ${
                                        isSelected
                                          ? 'border-[#C5A059] bg-[#C5A059]/15 text-[#C5A059] shadow-[0_0_10px_rgba(197,160,89,0.1)]'
                                          : 'border-white/[0.03] bg-white/[0.01] text-zinc-400 hover:text-white hover:border-white/[0.08]'
                                      }`}
                                    >
                                      {slot}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <button
                            disabled={!rescheduleDate || !rescheduleTime}
                            onClick={() => setRescheduleStep(3)}
                            className="w-full py-3.5 bg-[#C5A059] hover:bg-white text-black font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                          >
                            Continuar
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          </button>
                        </motion.div>
                      )}

                      {/* Step 3: Review & Confirm */}
                      {rescheduleStep === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="px-6 py-6 space-y-5">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.25em] block">Revisar</span>
                            <p className="text-[10px] text-zinc-600">Confirme as alterações antes de salvar</p>
                          </div>

                          {/* Before / After card */}
                          <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden">
                            {/* Before */}
                            <div className="px-5 py-4 border-b border-white/[0.04]">
                              <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Agendamento Atual</span>
                              <div className="flex items-start gap-4">
                                <div className="flex flex-col shrink-0">
                                  <span className="text-[10px] font-bold text-zinc-400">
                                    {new Date(selectedBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '')}
                                  </span>
                                  <span className="text-sm font-black text-zinc-300 mt-1">{selectedBooking.booking_time.slice(0, 5)}</span>
                                </div>
                                <div className="w-px h-10 bg-white/[0.06] shrink-0" />
                                <div className="flex flex-col gap-1 min-w-0">
                                  {selectedBooking.service_ids?.map((id: string) => {
                                    const srv = services.find(s => s.id === id);
                                    return (
                                      <span key={id} className="text-[10px] font-medium text-zinc-500 truncate">{srv?.name || 'Serviço'}</span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex items-center justify-center py-2 bg-[#C5A059]/[0.03]">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                            </div>

                            {/* After */}
                            <div className="px-5 py-4">
                              <span className="text-[7px] font-black text-[#C5A059] uppercase tracking-widest block mb-2">Novo Agendamento</span>
                              <div className="flex items-start gap-4">
                                <div className="flex flex-col shrink-0">
                                  <span className="text-[10px] font-bold text-white">
                                    {rescheduleDate ? new Date(rescheduleDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '') : '---'}
                                  </span>
                                  <span className="text-sm font-black text-[#C5A059] mt-1">{rescheduleTime || '---'}</span>
                                </div>
                                <div className="w-px h-10 bg-white/[0.06] shrink-0" />
                                <div className="flex flex-col gap-1 min-w-0">
                                  {rescheduleServices.map(srv => (
                                    <span key={srv.id} className="text-[10px] font-medium text-zinc-300 truncate">{srv.name}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Total */}
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Investimento Total</span>
                            <span className="text-lg font-black text-[#C5A059]">
                              R$ {rescheduleServices.reduce((sum, s) => sum + Number(s.price || 0), 0).toFixed(0)}
                            </span>
                          </div>

                          {/* Confirm */}
                          <button
                            disabled={isSavingReschedule}
                            onClick={handleConfirmReschedule}
                            className="w-full py-3.5 bg-[#C5A059] hover:bg-white text-black font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
                          >
                            {isSavingReschedule ? (
                              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                Confirmar Reagendamento
                              </>
                            )}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em]">Dados do Agendamento</span>
                    <button onClick={() => setSelectedBooking(null)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div className="px-6 py-6 space-y-6 flex-1 text-left overflow-y-auto scrollbar-hide">
                    {/* Client Info */}
                    <div className="flex items-center gap-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl">
                      <div className="w-12 h-12 bg-[#111111] border border-black rounded-xl flex items-center justify-center text-lg font-bold text-zinc-500 uppercase shrink-0">
                        {selectedBooking.clients?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-black text-white uppercase tracking-tight truncate">{selectedBooking.clients?.name}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">{selectedBooking.clients?.phone || 'Sem telefone'}</p>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="bg-[#121212] border border-white/[0.03] rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Data</span>
                        <span className="text-xs font-bold text-white uppercase">
                          {new Date(selectedBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      <div className="h-px bg-white/[0.04]" />
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Horário</span>
                        <span className="text-xs font-bold text-[#C5A059]">{selectedBooking.booking_time?.slice(0, 5)}</span>
                      </div>
                    </div>

                    {/* Services */}
                    {selectedBooking.service_ids && selectedBooking.service_ids.length > 0 && (
                      <div className="bg-[#121212] border border-white/[0.03] rounded-xl p-4 space-y-3">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block px-1">Serviços</span>
                        <div className="space-y-2.5">
                          {selectedBooking.service_ids.map((id: string) => {
                            const srv = services.find(s => s.id === id);
                            return (
                              <div key={id} className="flex justify-between items-center text-sm px-1">
                                <span className="text-zinc-400 font-medium">{srv?.name || 'Serviço'}</span>
                                <span className="font-bold text-white tabular-nums">R$ {Number(srv?.price || 0).toFixed(0)}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="h-px bg-white/[0.04]" />
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Investimento Total</span>
                          <span className="text-base font-black text-[#C5A059]">R$ {(selectedBooking.total_price || 0).toFixed(0)}</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2">
                      {selectedBooking.status !== 'completed' && (
                        <button 
                          onClick={() => { setCompletingBooking(selectedBooking); setSelectedBooking(null); }} 
                          className="w-full h-11 bg-[#C5A059] hover:bg-white text-[#0A0A0A] font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 rounded-xl"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mb-0.5"><polyline points="20 6 9 17 4 12"/></svg>
                          Concluir Atendimento
                        </button>
                      )}
                      {selectedBooking.clients?.phone && (
                        <WhatsAppReminderButton 
                          booking={selectedBooking} 
                          className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.05] hover:text-white rounded-xl transition-all active:scale-[0.99] text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5" 
                          showLabel 
                          label="Enviar lembrete"
                          iconType="bell"
                        />
                      )}
                      <button 
                        onClick={handleStartReschedule} 
                        className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.05] hover:text-white rounded-xl transition-all active:scale-[0.99] text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                        Reagendar
                      </button>
                      <button 
                        onClick={() => setBookingToDelete(selectedBooking)} 
                        className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-400 hover:bg-red-500/[0.02] hover:border-red-500/20 hover:text-red-400 rounded-xl transition-all active:scale-[0.99] text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mb-0.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        Excluir Agendamento
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      )}

      {/* MODALS */}
      <CompleteModal booking={completingBooking} onConfirm={handleComplete} onCancel={() => setCompletingBooking(null)} />
      <UnblockModal booking={unblockingBooking} onConfirm={confirmUnblock} onCancel={() => setUnblockingBooking(null)} />
      <DeleteModal 
        booking={bookingToDelete} 
        onConfirm={async () => { 
          const id = bookingToDelete?.id;
          if (!id) return;
          setBookingToDelete(null); 
          setSelectedBooking(null); 
          try { 
            await deleteBooking(id); 
            await loadData(); 
            showSuccess('Agendamento excluído!'); 
          } catch { 
            showError('Erro ao excluir.'); 
          } 
        }} 
        onCancel={() => setBookingToDelete(null)} 
      />

      {/* MOBILE DETAIL PANEL */}
      {!isDesktop && (
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }} 
              className="relative w-full h-[100dvh] bg-[#0f0f0f] z-10 flex flex-col text-left overflow-hidden"
            >
              {isRescheduling ? (
                <>
                  {/* Header */}
                  <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur-md z-10 border-b border-white/[0.06]">
                    <div className="px-6 py-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => rescheduleStep > 1 ? setRescheduleStep(rescheduleStep - 1) : setIsRescheduling(false)} 
                          className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        </button>
                        <div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] block">Reagendamento</span>
                          <h3 className="text-lg font-bold text-white uppercase tracking-wider mt-0.5 truncate max-w-[180px]">{selectedBooking.clients?.name}</h3>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedBooking(null); setIsRescheduling(false); setRescheduleStep(1); }} className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                    <div className="flex gap-1 px-6 pb-3">
                      {[1, 2, 3].map(step => (
                        <div key={step} className={`flex-1 h-[2px] rounded-full transition-all duration-300 ${step <= rescheduleStep ? 'bg-[#C5A059]' : 'bg-white/[0.06]'}`} />
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <AnimatePresence mode="wait">
                      {/* Step 1: Services */}
                      {rescheduleStep === 1 && (
                        <motion.div key="mstep1" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="px-6 py-6 space-y-5">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.25em] block">Serviços</span>
                            <p className="text-[10px] text-zinc-600">Selecione os serviços para este agendamento</p>
                          </div>
                          <div className="space-y-2">
                            {services.map(srv => {
                              const isSelected = rescheduleServices.some(s => s.id === srv.id);
                              return (
                                <div 
                                  key={srv.id} 
                                  onClick={() => {
                                    if (isSelected) {
                                      setRescheduleServices(rescheduleServices.filter(s => s.id !== srv.id));
                                    } else {
                                      setRescheduleServices([...rescheduleServices, srv]);
                                    }
                                  }}
                                  className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                                    isSelected 
                                      ? 'border-[#C5A059]/40 bg-[#C5A059]/[0.06] shadow-[0_0_20px_rgba(197,160,89,0.05)]' 
                                      : 'border-white/[0.04] bg-[#111111] hover:border-white/[0.08]'
                                  }`}
                                >
                                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all duration-200 shrink-0 ${
                                      isSelected ? 'border-[#C5A059] bg-[#C5A059]' : 'border-white/10 bg-transparent'
                                    }`}>
                                      {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </span>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[11px] font-bold text-zinc-100">{srv.name}</span>
                                      {srv.duration && (
                                        <span className="text-[9px] text-zinc-500 mt-0.5">{srv.duration} min</span>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`text-xs font-black tabular-nums shrink-0 ${isSelected ? 'text-[#C5A059]' : 'text-zinc-500'}`}>R$ {Number(srv.price || 0).toFixed(0)}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="pt-2">
                            <button
                              disabled={rescheduleServices.length === 0}
                              onClick={() => setRescheduleStep(2)}
                              className="w-full py-3.5 bg-[#C5A059] hover:bg-white text-black font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                            >
                              Continuar
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 2: Date + Time */}
                      {rescheduleStep === 2 && (
                        <motion.div key="mstep2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.25 }} className="px-6 py-6 space-y-6">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.25em] block">Data e Horário</span>
                            <p className="text-[10px] text-zinc-600">Escolha a nova data e horário</p>
                          </div>

                          <div className="space-y-3">
                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block px-1">Nova Data</span>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x flex-nowrap">
                              {getNext14Days().map(day => {
                                const isSelected = rescheduleDate === day.dateStr;
                                return (
                                  <button
                                    key={day.dateStr}
                                    type="button"
                                    onClick={() => setRescheduleDate(day.dateStr)}
                                    className={`flex flex-col items-center justify-center shrink-0 w-16 py-3 rounded-2xl border transition-all cursor-pointer snap-start ${
                                      isSelected
                                        ? 'border-[#C5A059] bg-[#C5A059]/10 text-white shadow-[0_0_15px_rgba(197,160,89,0.15)]'
                                        : 'border-white/[0.04] bg-white/[0.01] text-zinc-500 hover:text-zinc-200 hover:border-white/[0.08]'
                                    }`}
                                  >
                                    <span className="text-[8px] font-extrabold uppercase tracking-wider opacity-60 mb-1 leading-none">{day.dayName}</span>
                                    <span className={`text-base font-black leading-none ${isSelected ? 'text-[#C5A059]' : 'text-zinc-300'}`}>{day.dayNum}</span>
                                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-60 mt-1 leading-none">{day.monthName}</span>
                                  </button>
                                );
                              })}
                              <div className="relative shrink-0 w-16 flex items-center justify-center">
                                <input
                                  type="date"
                                  value={rescheduleDate}
                                  onChange={(e) => setRescheduleDate(e.target.value)}
                                  min={getLocalDateString()}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className={`flex flex-col items-center justify-center w-full py-4 rounded-2xl border transition-all pointer-events-none ${
                                  !getNext14Days().some(d => d.dateStr === rescheduleDate) && rescheduleDate
                                    ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]'
                                    : 'border-white/[0.04] bg-white/[0.01] text-zinc-500'
                                }`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mb-1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                  <span className="text-[7px] font-black uppercase tracking-widest text-center leading-none">Outra</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 pt-4 border-t border-white/[0.04]">
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Novo Horário</span>
                              {!loadingSlots && (
                                <span className="text-[7px] font-bold text-[#C5A059] uppercase tracking-wider">
                                  {TIME_SLOTS.filter(slot => {
                                    const occupied = rescheduleDate === selectedBooking.booking_date && slot === selectedBooking.booking_time.slice(0, 5)
                                      ? false 
                                      : existingBookingsForReschedule.some(b => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === slot);
                                    return !occupied;
                                  }).length} livres
                                </span>
                              )}
                            </div>
                            {loadingSlots ? (
                              <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
                                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Carregando...</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-4 gap-2">
                                {TIME_SLOTS.map(slot => {
                                  const occupied = rescheduleDate === selectedBooking.booking_date && slot === selectedBooking.booking_time.slice(0, 5)
                                    ? false 
                                    : existingBookingsForReschedule.some(b => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === slot);
                                  const isSelected = rescheduleTime === slot;
                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      disabled={occupied}
                                      onClick={() => setRescheduleTime(slot)}
                                      className={`py-2.5 text-[10px] font-black rounded-lg border text-center transition-all cursor-pointer disabled:opacity-15 disabled:cursor-not-allowed ${
                                        isSelected
                                          ? 'border-[#C5A059] bg-[#C5A059]/15 text-[#C5A059] shadow-[0_0_10px_rgba(197,160,89,0.1)]'
                                          : 'border-white/[0.03] bg-white/[0.01] text-zinc-400 hover:text-white hover:border-white/[0.08]'
                                      }`}
                                    >
                                      {slot}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="pt-2">
                            <button
                              disabled={!rescheduleDate || !rescheduleTime}
                              onClick={() => setRescheduleStep(3)}
                              className="w-full py-3.5 bg-[#C5A059] hover:bg-white text-black font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                            >
                              Continuar
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3: Review & Confirm */}
                      {rescheduleStep === 3 && (
                        <motion.div key="mstep3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.25 }} className="px-6 py-6 space-y-5">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.25em] block">Revisar</span>
                            <p className="text-[10px] text-zinc-600">Confirme as alterações antes de salvar</p>
                          </div>

                          <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/[0.04]">
                              <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Agendamento Atual</span>
                              <div className="flex items-start gap-4">
                                <div className="flex flex-col shrink-0">
                                  <span className="text-[10px] font-bold text-zinc-400">
                                    {new Date(selectedBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '')}
                                  </span>
                                  <span className="text-sm font-black text-zinc-300 mt-1">{selectedBooking.booking_time.slice(0, 5)}</span>
                                </div>
                                <div className="w-px h-10 bg-white/[0.06] shrink-0" />
                                <div className="flex flex-col gap-1 min-w-0">
                                  {selectedBooking.service_ids?.map((id: string) => {
                                    const srv = services.find(s => s.id === id);
                                    return (
                                      <span key={id} className="text-[10px] font-medium text-zinc-500 truncate">{srv?.name || 'Serviço'}</span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-center py-2 bg-[#C5A059]/[0.03]">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                            </div>

                            <div className="px-5 py-4">
                              <span className="text-[7px] font-black text-[#C5A059] uppercase tracking-widest block mb-2">Novo Agendamento</span>
                              <div className="flex items-start gap-4">
                                <div className="flex flex-col shrink-0">
                                  <span className="text-[10px] font-bold text-white">
                                    {rescheduleDate ? new Date(rescheduleDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '') : '---'}
                                  </span>
                                  <span className="text-sm font-black text-[#C5A059] mt-1">{rescheduleTime || '---'}</span>
                                </div>
                                <div className="w-px h-10 bg-white/[0.06] shrink-0" />
                                <div className="flex flex-col gap-1 min-w-0">
                                  {rescheduleServices.map(srv => (
                                    <span key={srv.id} className="text-[10px] font-medium text-zinc-300 truncate">{srv.name}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center px-1">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Investimento Total</span>
                            <span className="text-lg font-black text-[#C5A059]">
                              R$ {rescheduleServices.reduce((sum, s) => sum + Number(s.price || 0), 0).toFixed(0)}
                            </span>
                          </div>

                          <div className="pt-2">
                            <button
                              disabled={isSavingReschedule}
                              onClick={handleConfirmReschedule}
                              className="w-full py-3.5 bg-[#C5A059] hover:bg-white text-black font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
                            >
                              {isSavingReschedule ? (
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                  Confirmar Reagendamento
                                </>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur-md z-10 px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Square Profile Placeholder */}
                      <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-zinc-400 uppercase rounded-xl shrink-0">
                        {selectedBooking.clients?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.3em] block">Detalhes do Agendamento</span>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider mt-0.5 truncate max-w-[180px]">{selectedBooking.clients?.name}</h3>
                      </div>
                    </div>
                    <button onClick={() => setSelectedBooking(null)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>

                  <div className="px-6 py-6 divide-y divide-white/[0.06] space-y-0 flex-1 overflow-y-auto scrollbar-hide">
                    {/* Telefone Details */}
                    <div className="pb-6">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.25em] block mb-1">Telefone</span>
                      <span className="text-sm font-medium text-white font-mono">{selectedBooking.clients?.phone || 'Sem telefone registrado'}</span>
                    </div>

                    {/* Date & Time Grid */}
                    <div className="py-6 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.25em] block mb-1.5">Data</span>
                        <span className="text-sm font-semibold text-white uppercase tracking-wide">
                          {new Date(selectedBooking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.25em] block mb-1.5">Horário</span>
                        <span className="text-sm font-bold text-[#C5A059] tracking-wider">{selectedBooking.booking_time?.slice(0, 5)}</span>
                      </div>
                    </div>

                    {/* Services list with individual prices */}
                    {selectedBooking.service_ids && selectedBooking.service_ids.length > 0 && (
                      <div className="py-6 space-y-3.5">
                        <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.25em] block">Serviços</span>
                        <div className="space-y-3">
                          {selectedBooking.service_ids.map((id: string) => {
                            const srv = services.find(s => s.id === id);
                            return (
                              <div key={id} className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400 font-medium">{srv?.name || 'Serviço'}</span>
                                <span className="font-semibold text-white tabular-nums">R$ {Number(srv?.price || 0).toFixed(0)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Total Price */}
                    <div className="py-6 flex justify-between items-center">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.25em]">Total</span>
                      <span className="text-lg font-bold text-[#C5A059] tracking-tight">R$ {(selectedBooking.total_price || 0).toFixed(0)}</span>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 pt-6">
                      {selectedBooking.status !== 'completed' && (
                        <button 
                          onClick={() => { setCompletingBooking(selectedBooking); setSelectedBooking(null); }} 
                          className="w-full h-12 bg-[#C5A059] hover:bg-white text-black font-extrabold text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mb-0.5"><polyline points="20 6 9 17 4 12"/></svg>
                          Concluir Atendimento
                        </button>
                      )}
                      <button 
                        onClick={handleStartReschedule} 
                        className="w-full h-12 bg-white/[0.02] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.05] hover:text-white rounded-xl transition-all active:scale-[0.98] text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                        Reagendar
                      </button>
                      {selectedBooking.clients?.phone && (
                        <WhatsAppReminderButton 
                          booking={selectedBooking} 
                          className="w-full h-12 bg-white/[0.02] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.05] hover:text-white rounded-xl transition-all active:scale-[0.98] text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-2" 
                          showLabel 
                          label="Enviar lembrete"
                          iconType="bell"
                        />
                      )}
                      <button 
                        onClick={() => setBookingToDelete(selectedBooking)} 
                        className="w-full h-12 bg-white/[0.02] border border-white/[0.08] text-zinc-400 hover:bg-red-500/[0.02] hover:border-red-500/20 hover:text-red-400 rounded-xl transition-all active:scale-[0.98] text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mb-0.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        Excluir Agendamento
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      )}

      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminDashboard;
