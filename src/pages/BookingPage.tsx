import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices, createBooking, getBookings, getAvailableSlots } from '../lib/api';
import { getNextDays, isTimeOccupied, getLocalDateString, formatPhone } from '../lib/utils';
import type { Service } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ToastNotification from '../components/Admin/shared/ToastNotification';

const BookingPage: React.FC = () => {
  const { toast, showError } = useToast();
  const nextDays = useMemo(() => getNextDays(), []);
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [userInfo, setUserInfo] = useState({ name: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<{ booking_time: string; status: string }[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await getServices();
        setServices(data);
      } catch (error) { console.error(error); }
    };
    loadServices();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const loadBookings = async () => {
        try {
          const data = await getBookings(selectedDate);
          setExistingBookings(data);
        } catch (error) { console.error(error); }
      };
      const loadAvailableSlots = async () => {
        try {
          const slots = await getAvailableSlots(selectedDate);
          setAvailableSlots(slots);
        } catch (error) { 
          console.error(error);
          // Fallback para slots padrão se a função falhar
          setAvailableSlots(['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']);
        }
      };
      loadBookings();
      loadAvailableSlots();
    }
  }, [selectedDate]);

  const toggleService = (service: Service) => {
    if (selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  const isStepDisabled = () => {
    if (step === 1) return selectedServices.length === 0;
    if (step === 2) return !selectedTime;
    if (step === 3) return !userInfo.name.trim() || userInfo.name.trim().length < 3 || userInfo.phone.replace(/\D/g, '').length < 10 || isSubmitting;
    return false;
  };

  const handleConfirm = async () => {
    if (isSubmitting || !selectedTime || !userInfo.name || !userInfo.phone || selectedServices.length === 0) return;
    setIsSubmitting(true);
    try {
      const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
      await createBooking(
        {
          service_ids: selectedServices.map(s => s.id),
          booking_date: selectedDate,
          booking_time: selectedTime,
          total_price: totalPrice,
          total_duration: totalDuration
        },
        { name: userInfo.name, phone: userInfo.phone }
      );
      
      const serviceNames = selectedServices.map(s => s.name).join(', ');
      const message = `*NOVO AGENDAMENTO - BLACK DIAMOND*\n\n` +
                      `*Cliente:* ${userInfo.name}\n` +
                      `*Serviço:* ${serviceNames}\n` +
                      `*Data:* ${selectedDate.split('-').reverse().join('/')}\n` +
                      `*Horário:* ${selectedTime}\n` +
                      `*Valor:* R$ ${totalPrice.toFixed(0)}`;
      
      window.open(`https://wa.me/5531980159559?text=${encodeURIComponent(message)}`, '_blank');
      setStep(4); // Mover para tela de sucesso em vez de sair
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao realizar agendamento.';
      showError(message);
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="font-sans relative min-h-screen bg-[#050505] flex flex-col selection:bg-[#C5A059] selection:text-black">
      <main className="flex-1 relative z-10 h-full flex flex-col">
        
        {/* DESKTOP LAYOUT */}
        <div className="hidden lg:flex min-h-screen bg-[#0E0E0E] text-white">
          
          {/* Left Panel - Dark */}
          <div className="w-[420px] shrink-0 bg-[#0A0A0A] flex flex-col justify-between p-12 text-white relative overflow-hidden">
            <img 
              src="/assets/agendamento.webp"
              alt="Agendamento" 
              className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 pointer-events-none"
            />
            <div>
              <span className="text-[10px] font-black tracking-[0.5em] text-[#C5A059] uppercase">BLACK DIAMOND</span>
              <h1 className="text-3xl font-bold mt-6 leading-tight">Agendamento<br />Online</h1>
              <p className="text-sm text-zinc-500 mt-3 leading-relaxed">Escolha seus serviços, horário e confirme. Rápido e fácil.</p>
            </div>

            {/* Live Summary */}
            <div className="mt-auto">
              {selectedServices.length > 0 && (
                <div className="bg-white/[0.04] rounded-2xl p-5 space-y-3 border border-white/[0.06]">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Resumo</p>
                  {selectedServices.map((s) => (
                    <div key={`side-${s.id}`} className="flex justify-between items-center">
                      <span className="text-[13px] text-zinc-300">{s.name}</span>
                      <span className="text-[13px] font-bold text-[#C5A059]">R$ {Number(s.price).toFixed(0)}</span>
                    </div>
                  ))}
                  {selectedDate && (
                    <div className="border-t border-white/[0.06] pt-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[10px] text-zinc-500">Data</span>
                        <span className="text-[13px] font-bold">{selectedDate.split('-').reverse().join('/')}</span>
                      </div>
                      {selectedTime && (
                        <div className="flex justify-between">
                          <span className="text-[10px] text-zinc-500">Horário</span>
                          <span className="text-[13px] font-bold text-[#C5A059]">{selectedTime}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="border-t border-white/[0.06] pt-3 flex justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Total</span>
                    <span className="text-lg font-bold">R$ {totalPrice.toFixed(0)}</span>
                  </div>
                </div>
              )}
              <p className="text-[8px] text-zinc-600 mt-6">Precisa de ajuda? WhatsApp</p>
            </div>
          </div>

          {/* Right Panel - Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="px-14 py-6 flex items-center justify-between">
              <div className="flex items-center gap-5">
                {step > 1 && step < 4 && (
                  <button 
                    onClick={() => setStep(step - 1)}
                    aria-label="Voltar para o passo anterior"
                    className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                {step < 4 && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Passo {step} de 3</p>
                    <h2 className="text-xl font-bold text-white mt-0.5">
                      {step === 1 ? 'Escolha os serviços' : step === 2 ? 'Data e horário' : 'Seus dados'}
                    </h2>
                  </div>
                )}
              </div>
              {/* Progress */}
              <div className="flex gap-1 w-40">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-[2px] flex-1 rounded-full transition-all duration-500 ${
                    step === s ? 'bg-[#C5A059]' : step > s ? 'bg-[#C5A059]/30' : 'bg-white/[0.08]'
                  }`} />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-14 pt-10 pb-6 flex flex-col">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="d1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1">
                    <div className="space-y-2">
                      {services.map((service) => {
                        const isSelected = selectedServices.some((s) => s.id === service.id);
                        return (
                          <button 
                            key={service.id}
                            onClick={() => toggleService(service)}
                            aria-label={`Selecionar serviço ${service.name}. Preço: R$ ${Number(service.price).toFixed(0)}. Duração: ${service.duration} minutos.`}
                            className={`w-full flex items-center gap-5 px-6 py-5 rounded-xl transition-all duration-200 text-left group ${
                              isSelected 
                                ? 'bg-[#C5A059]/[0.06]' 
                                : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                              isSelected ? 'border-[#C5A059] bg-[#C5A059]' : 'border-white/20'
                            }`}>
                              {isSelected && <Check size={11} className="text-white stroke-[3px]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[14px] font-medium ${isSelected ? 'text-[#C5A059]' : 'text-white'}`}>{service.name}</p>
                            </div>
                            <span className={`text-[14px] font-semibold tabular-nums w-16 text-right ${isSelected ? 'text-[#C5A059]' : 'text-zinc-400'}`}>
                              R$ {Number(service.price).toFixed(0)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="d2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1">
                    <div className="flex gap-1.5 mb-12">
                      {nextDays.map((day) => {
                        const isSelected = selectedDate === day.fullDate;
                        return (
                          <button
                            key={day.fullDate}
                            onClick={() => setSelectedDate(day.fullDate)}
                            disabled={day.isPast}
                            aria-label={`Selecionar data: dia ${day.dayNumber}, ${day.dayName}`}
                            className={`flex-1 py-4 rounded-lg transition-all duration-200 flex flex-col items-center gap-0.5 ${
                              day.isPast
                                ? 'text-zinc-700 opacity-40 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-[#C5A059] text-black'
                                  : day.isToday
                                    ? 'bg-white/[0.04] text-[#C5A059]'
                                    : 'bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                            }`}
                          >
                            <span className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-black/60' : 'opacity-50'}`}>{day.dayName}</span>
                            <span className="text-lg font-black">{day.dayNumber}</span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.25em] mb-4">Horários</p>
                    <div className="grid grid-cols-7 gap-2">
                      {availableSlots.map((time) => {
                        const occupied = isTimeOccupied(time, existingBookings);
                        const isSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            disabled={occupied}
                            type="button"
                            onClick={() => setSelectedTime(time)}
                            aria-label={`Selecionar horário: ${time}${occupied ? ' (indisponível)' : ''}`}
                            className={`py-3 rounded-lg text-[12px] font-medium transition-all duration-200 border border-white/[0.08] ${
                              occupied 
                                ? 'text-zinc-800 cursor-not-allowed line-through' 
                                : isSelected 
                                  ? 'text-black bg-[#C5A059]' 
                                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="d3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1 flex flex-col justify-center">
                    <div className="max-w-lg mx-auto w-full">
                      <div className="space-y-8">
                        <div className="space-y-3">
                          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Nome completo</label>
                          <input 
                            type="text" 
                            placeholder="Digite seu nome..." 
                            aria-label="Seu nome completo"
                            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#C5A059]/50 rounded-xl px-5 py-5 text-[18px] text-white outline-none transition-all placeholder:text-zinc-700" 
                            value={userInfo.name} 
                            onChange={e => setUserInfo({...userInfo, name: e.target.value})} 
                          />
                          {userInfo.name && userInfo.name.trim().length < 3 && (
                            <p className="text-[11px] text-red-400/80">Mínimo 3 caracteres</p>
                          )}
                        </div>
                        <div className="space-y-3">
                          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">WhatsApp</label>
                          <input 
                            type="tel" 
                            placeholder="(31) 90000-0000" 
                            aria-label="Seu número de WhatsApp com DDD"
                            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#C5A059]/50 rounded-xl px-5 py-5 text-[18px] text-white outline-none transition-all placeholder:text-zinc-700" 
                            value={userInfo.phone} 
                            onChange={e => setUserInfo({...userInfo, phone: formatPhone(e.target.value)})} 
                          />
                          {userInfo.phone && userInfo.phone.replace(/\D/g, '').length < 11 && (
                            <p className="text-[11px] text-red-400/80">Informe um WhatsApp válido</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div key="d4" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                    <div className="w-20 h-20 rounded-full bg-[#C5A059]/10 flex items-center justify-center mx-auto mb-8">
                      <Check size={36} className="text-[#C5A059]" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Agendamento confirmado!</h2>
                    <p className="text-base text-zinc-500 mb-10">Enviamos os detalhes no seu WhatsApp.</p>
                    <button 
                      onClick={() => navigate('/')}
                      aria-label="Voltar para a página inicial"
                      className="h-12 px-10 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all cursor-pointer"
                    >
                      Voltar ao início
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Button */}
              {step < 4 && (
                <div className={`flex justify-end ${step === 3 ? 'pt-2' : 'pt-6'}`}>
                  <button 
                    onClick={() => {
                      if (step === 1) setStep(2);
                      else if (step === 2) setStep(3);
                      else handleConfirm();
                    }}
                    disabled={isStepDisabled()}
                    aria-label={step === 3 ? 'Confirmar e concluir agendamento' : 'Continuar para a próxima etapa'}
                    className={`h-11 px-8 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                      !isStepDisabled()
                        ? 'bg-[#C5A059] text-black hover:bg-[#A68233] active:scale-95'
                        : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? 'CONFIRMANDO...' : 'Continuar'}
                  </button>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-14 py-5 border-t border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-[0.4em] text-[#C5A059] uppercase">BLACK DIAMOND</span>
                <span className="text-[9px] text-zinc-600">Barbearia</span>
              </div>
              <p className="text-[9px] text-zinc-600">© 2025 Black Diamond. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT */}
        <div className="lg:hidden h-[100dvh] bg-[#050505] flex flex-col text-white font-sans overflow-hidden">
          
          {/* Header */}
          <header className="px-5 py-4 flex items-center gap-3 shrink-0 border-b border-white/[0.04]">
            <button 
              onClick={() => step > 1 ? setStep(step - 1) : navigate('/')}
              aria-label={step > 1 ? 'Voltar para a etapa anterior' : 'Voltar para a página inicial'}
              className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Passo {step} de 3
              </p>
              <h1 className="text-sm font-bold text-white mt-0.5">
                {step === 1 ? 'Escolha os serviços' : step === 2 ? 'Data e horário' : 'Seus dados'}
              </h1>
            </div>
          </header>

          {/* Progress */}
          <div className="flex gap-1 px-5 py-3 shrink-0">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${
                  step === s 
                    ? 'bg-[#C5A059]' 
                    : step > s 
                      ? 'bg-[#C5A059]/40' 
                      : 'bg-white/[0.06]'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden px-5 pt-4 pb-32">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="m1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3 overflow-y-auto h-full scrollbar-hide pb-4">
                  {services.map(service => {
                    const isSelected = selectedServices.some(s => s.id === service.id);
                    return (
                      <button 
                        key={service.id} 
                        onClick={() => toggleService(service)} 
                        aria-label={`Selecionar serviço ${service.name}. Preço: R$ ${Number(service.price).toFixed(0)}. Duração: ${service.duration} minutos.`}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left ${
                          isSelected 
                            ? 'bg-[#C5A059]/[0.06] border border-[#C5A059]/30' 
                            : 'bg-[#111111] border border-white/[0.04] hover:border-white/[0.08]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                          isSelected ? 'border-[#C5A059] bg-[#C5A059]' : 'border-zinc-700'
                        }`}>
                          {isSelected && <Check size={12} className="text-black stroke-[3px]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${isSelected ? 'text-[#C5A059]' : 'text-white'}`}>{service.name}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{service.duration} min</p>
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${isSelected ? 'text-[#C5A059]' : 'text-zinc-400'}`}>
                          R$ {Number(service.price).toFixed(0)}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="m2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-5 h-full flex flex-col overflow-hidden">
                  {/* Date Picker */}
                  <div className="flex overflow-x-auto gap-1.5 pb-2 scrollbar-hide -mx-5 px-5 snap-x shrink-0">
                    {nextDays.map(day => {
                      const isSelected = selectedDate === day.fullDate;
                      return (
                        <button 
                          key={day.fullDate} 
                          onClick={() => setSelectedDate(day.fullDate)}
                          disabled={day.isPast}
                          aria-label={`Selecionar data: dia ${day.dayNumber}, ${day.dayName}`}
                          className={`min-w-[56px] py-3 snap-center flex flex-col items-center gap-0.5 rounded-lg transition-all ${
                            day.isPast
                              ? 'text-zinc-700 opacity-40 cursor-not-allowed'
                              : isSelected 
                                ? 'bg-[#C5A059] text-black' 
                                : day.isToday
                                  ? 'bg-white/[0.04] text-[#C5A059]'
                                  : 'bg-white/[0.02] text-zinc-400'
                          }`}
                        >
                          <span className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-black/60' : 'opacity-50'}`}>{day.dayName}</span>
                          <span className="text-lg font-black">{day.dayNumber}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Time Slots */}
                  <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Horários disponíveis</p>
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map(time => {
                        const occupied = isTimeOccupied(time, existingBookings);
                        const isSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            type="button"
                            disabled={occupied}
                            onClick={() => setSelectedTime(time)}
                            aria-label={`Selecionar horário: ${time}${occupied ? ' (indisponível)' : ''}`}
                            className={`py-3 rounded-xl text-xs font-bold transition-all ${
                              occupied 
                                ? 'text-zinc-800 bg-transparent cursor-not-allowed line-through opacity-20' 
                                : isSelected 
                                  ? 'text-[#C5A059] bg-[#C5A059]/10 border border-[#C5A059]/30' 
                                  : 'text-zinc-400 bg-[#111111] border border-white/[0.04] hover:border-white/[0.08]'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="m3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4 overflow-y-auto h-full scrollbar-hide pb-4">
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold text-zinc-400">Nome completo</label>
                    <input 
                      type="text" 
                      placeholder="Digite seu nome..." 
                      aria-label="Seu nome completo"
                      className="w-full bg-[#111111] border border-white/[0.06] focus:border-[#C5A059]/50 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-600" 
                      value={userInfo.name} 
                      onChange={e => setUserInfo({...userInfo, name: e.target.value})} 
                    />
                    {userInfo.name && userInfo.name.trim().length < 3 && (
                      <p className="text-[10px] text-red-400/80">Mínimo 3 caracteres</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold text-zinc-400">WhatsApp</label>
                    <input 
                      type="tel" 
                      placeholder="(00) 90000-0000" 
                      aria-label="Seu número de WhatsApp com DDD"
                      className="w-full bg-[#111111] border border-white/[0.06] focus:border-[#C5A059]/50 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-600" 
                      value={userInfo.phone} 
                      onChange={e => setUserInfo({...userInfo, phone: formatPhone(e.target.value)})} 
                    />
                    {userInfo.phone && userInfo.phone.replace(/\D/g, '').length < 10 && (
                      <p className="text-[10px] text-red-400/80">Informe um WhatsApp válido</p>
                    )}
                  </div>

                  {/* Summary */}
                  {selectedServices.length > 0 && (
                    <div className="mt-6 bg-[#111111] border border-white/[0.04] rounded-xl p-4 space-y-3">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Resumo</p>
                      {selectedServices.map(s => (
                        <div key={s.id} className="flex justify-between items-center">
                          <span className="text-xs text-zinc-300">{s.name}</span>
                          <span className="text-xs font-bold text-[#C5A059]">R$ {Number(s.price).toFixed(0)}</span>
                        </div>
                      ))}
                      <div className="border-t border-white/[0.04] pt-2 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Total</span>
                        <span className="text-sm font-bold text-white">R$ {totalPrice.toFixed(0)}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Button */}
          {step < 4 && (
            <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-4 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-[100]">
              <button 
                onClick={() => step < 3 ? setStep(step + 1) : handleConfirm()}
                disabled={isStepDisabled()}
                aria-label={step < 3 ? 'Continuar para a próxima etapa' : 'Confirmar e concluir agendamento'}
                className={`w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${
                  isStepDisabled()
                    ? 'bg-zinc-900 border border-white/[0.04] text-zinc-600 cursor-not-allowed'
                    : 'bg-[#C5A059] text-black hover:brightness-110 active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? 'CONFIRMANDO...' : step < 3 ? 'Continuar' : 'Confirmar Agendamento'}
              </button>
            </div>
          )}

          {/* Success Screen */}
          {step === 4 && (
            <div className="fixed inset-0 bg-[#050505] z-[200] flex flex-col items-center justify-center p-6 text-center">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="w-full max-w-sm space-y-8"
              >
                <div className="w-16 h-16 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center mx-auto">
                  <Check size={28} className="text-[#C5A059]" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">Agendamento confirmado!</h2>
                  <p className="text-sm text-zinc-500">Enviamos os detalhes no seu WhatsApp.</p>
                </div>

                <div className="bg-[#111111] border border-white/[0.04] rounded-xl p-5 space-y-3 text-left">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase">Data</span>
                    <span className="text-xs font-bold text-white">{selectedDate.split('-').reverse().join('/')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase">Horário</span>
                    <span className="text-xs font-bold text-[#C5A059]">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/[0.04] pt-2">
                    <span className="text-[10px] text-zinc-500 uppercase">Total</span>
                    <span className="text-sm font-bold text-white">R$ {totalPrice.toFixed(0)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/')}
                  aria-label="Voltar para a página inicial"
                  className="w-full h-12 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  Voltar ao início
                </button>
              </motion.div>
            </div>
          )}
        </div>

      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #050505; }
      `}</style>
      <ToastNotification toast={toast} />
    </div>
  );
};

export default BookingPage;
