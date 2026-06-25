import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices, createBooking, getBookings, getAvailableSlots } from '../lib/api';
import { getNextDays, isTimeOccupied, formatPhone } from '../lib/utils';
import type { Service } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, User, Scissors, Clock } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ToastNotification from '../components/Admin/shared/ToastNotification';


const BookingPage: React.FC = () => {
  const { toast, showError } = useToast();
  const nextDays = useMemo(() => getNextDays(), []);
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [userInfo, setUserInfo] = useState({ name: '', phone: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<{ booking_time: string; status: string }[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const navigate = useNavigate();

  // Mouse Drag to Scroll for Date Picker
  const dateContainerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = dateContainerRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = dateContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeft - walk;
  };

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
          setAvailableSlots(['08:30', '09:30', '10:30', '11:30', '13:30', '14:30', '15:30', '16:30', '17:30', '18:30']);
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
    if (step === 2) return !selectedDate || !selectedTime;
    if (step === 3) return !userInfo.name.trim() || userInfo.name.trim().length < 3 || userInfo.phone.replace(/\D/g, '').length < 11;
    if (step === 4) return isSubmitting;
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
        { name: userInfo.name, phone: userInfo.phone, email: userInfo.email || undefined }
      );
      
      const serviceNames = selectedServices.map(s => s.name).join(', ');
      const endDate = new Date(`${selectedDate}T${selectedTime}`);
      endDate.setMinutes(endDate.getMinutes() + totalDuration);
      const endDateTime = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}${String(endDate.getMinutes()).padStart(2, '0')}00`;
      const startFormatted = `${selectedDate.split('-')[0]}${selectedDate.split('-')[1]}${selectedDate.split('-')[2]}T${selectedTime.replace(':', '')}00`;
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(userInfo.name + ' - ' + serviceNames)}&dates=${startFormatted}/${endDateTime}&details=${encodeURIComponent('Black Diamond - ' + serviceNames + ' - R$ ' + totalPrice.toFixed(2))}`;
      const message = `💎 *NOVO AGENDAMENTO - BLACK DIAMOND* 💎\n\n` +
                      `📌 *Cliente:* ${userInfo.name}\n` +
                      `✂️ *Serviço:* ${serviceNames}\n` +
                      `📅 *Data:* ${selectedDate.split('-').reverse().join('/')}\n` +
                      `⏰ *Horário:* ${selectedTime}\n` +
                      `💰 *Valor:* R$ ${totalPrice.toFixed(2).replace('.', ',')}\n\n` +
                      `📅 *Adicionar no Google Agenda:*\n${calendarUrl}`;
      
      window.open(`https://wa.me/${import.meta.env.VITE_BARBER_WHATSAPP || '5531980159559'}?text=${encodeURIComponent(message)}`, '_blank');
      setStep(5); // Mover para tela de sucesso em vez de sair
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao realizar agendamento.';
      showError(message);
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="font-sans relative min-h-screen bg-[#050505] flex flex-col selection:bg-[#C5A059] selection:text-black overflow-x-hidden">
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
              {selectedServices.length > 0 && step < 4 && (
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
              {step === 4 && (
                <div className="bg-white/[0.04] rounded-2xl p-5 space-y-3 border border-white/[0.06]">
                  <p className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest">Procedimento</p>
                  <p className="text-[12px] text-zinc-400 leading-relaxed">
                    Você será redirecionado para o WhatsApp com a mensagem do seu agendamento já formatada. 
                    Basta enviar a mensagem na conversa para finalizar.
                  </p>
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
                {step > 1 && step < 5 && (
                  <button 
                    onClick={() => setStep(step - 1)}
                    aria-label="Voltar para o passo anterior"
                    className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                {step < 5 && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Passo {step} de 4</p>
                    <h2 className="text-xl font-bold text-white mt-0.5">
                      {step === 1 ? 'Escolha os serviços' : step === 2 ? 'Data e horário' : step === 3 ? 'Seus dados' : 'Revisar agendamento'}
                    </h2>
                  </div>
                )}
              </div>
              {/* Progress */}
              <div className="flex gap-1 w-40" role="list" aria-label="Progresso do agendamento">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    role="listitem"
                    aria-current={step === s ? 'step' : undefined}
                    aria-label={`Passo ${s}${step === s ? ' (atual)' : step > s ? ' (concluído)' : ''}`}
                    className={`h-[2px] flex-1 rounded-full transition-all duration-500 ${
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
                    {selectedDate ? (
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
                    ) : (
                      <p className="text-zinc-500 text-xs py-4 text-center">Selecione um dia da semana acima para ver os horários disponíveis.</p>
                    )}
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="d3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-xl">
                      <div className="space-y-10">
                        <div className="space-y-4">
                          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Nome</label>
                          <input 
                            type="text" 
                            placeholder="Digite seu nome..." 
                            aria-label="Seu nome"
                            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#C5A059]/50 rounded-2xl px-6 py-6 text-[20px] text-white outline-none transition-all placeholder:text-zinc-700" 
                            value={userInfo.name} 
                            onChange={e => setUserInfo({...userInfo, name: e.target.value})} 
                          />
                          {userInfo.name && userInfo.name.trim().length < 3 && (
                            <p className="text-[11px] text-red-400/80">Mínimo 3 caracteres</p>
                          )}
                        </div>
                        <div className="space-y-4">
                          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">WhatsApp</label>
                          <input 
                            type="tel" 
                            placeholder="(31) 90000-0000" 
                            aria-label="Seu número de WhatsApp com DDD"
                            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#C5A059]/50 rounded-2xl px-6 py-6 text-[20px] text-white outline-none transition-all placeholder:text-zinc-700" 
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
                  <motion.div key="d4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1 flex flex-col justify-center items-center">
                    {/* Minimalist Summary Card */}
                    <div className="w-full max-w-[440px] bg-[#080808] border border-white/[0.04] rounded-2xl p-8 space-y-6">
                      {/* Header */}
                      <div className="pb-4 border-b border-white/[0.04] flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-widest text-[#C5A059] uppercase">Resumo do Agendamento</span>
                        <span className="text-[10px] text-zinc-500 font-medium">Verifique os dados</span>
                      </div>

                      {/* Details */}
                      <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-zinc-500 font-medium">Cliente</span>
                          <span className="font-semibold text-white truncate max-w-[240px]">{userInfo.name}</span>
                        </div>

                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-zinc-500 font-medium">WhatsApp</span>
                          <span className="font-semibold text-white">{userInfo.phone}</span>
                        </div>

                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-zinc-500 font-medium">Data e Horário</span>
                          <span className="font-semibold text-[#C5A059]">
                            {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                          </span>
                        </div>
                      </div>

                      {/* Services */}
                      <div className="pt-4 border-t border-white/[0.04] space-y-3">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Serviços</span>
                        <div className="space-y-2">
                          {selectedServices.map((s) => (
                            <div key={`ticket-${s.id}`} className="flex justify-between items-center text-xs">
                              <span className="text-zinc-400">{s.name}</span>
                              <span className="font-medium text-white">R$ {Number(s.price).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="pt-5 border-t border-white/[0.04] flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Valor Total</span>
                        <span className="text-2xl font-black text-[#C5A059] tracking-tight">
                          R$ {totalPrice.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 5 && (
                  <motion.div key="d5" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
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
              {step < 5 && (
                <div className={`flex justify-end ${step === 3 || step === 4 ? 'pt-2' : 'pt-6'}`}>
                  <button 
                    onClick={() => {
                      if (step === 1) setStep(2);
                      else if (step === 2) setStep(3);
                      else if (step === 3) setStep(4);
                      else handleConfirm();
                    }}
                    disabled={isStepDisabled()}
                    aria-label={step === 4 ? 'Confirmar e concluir agendamento' : 'Continuar para a próxima etapa'}
                    className={`h-11 px-8 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                      !isStepDisabled()
                        ? 'bg-[#C5A059] text-black hover:bg-[#A68233] active:scale-95'
                        : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? 'CONFIRMANDO...' : step === 4 ? 'Confirmar Agendamento' : 'Continuar'}
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
        <div className="lg:hidden min-h-screen bg-[#050505] flex flex-col text-white font-sans relative pb-28 overflow-x-hidden">
          
          {/* Header */}
          <header className="px-5 pt-5 pb-4 shrink-0 border-b border-white/[0.04] bg-[#050505] sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => step > 1 ? setStep(step - 1) : navigate('/')}
                className="text-zinc-500 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  {step === 1 ? 'Novo agendamento' : step === 2 ? 'Data e horário' : step === 3 ? 'Seus dados' : 'Revisar agendamento'}
                </h1>
              </div>
            </div>
            {/* Mobile Progress Stepper (Premium Node-based) */}
            <div className="relative flex justify-between items-center w-full mt-4 px-4 pb-1 select-none">
              {/* Background Line */}
              <div className="absolute left-0 right-0 -mx-9 top-[28px] h-[1px] bg-white/10 z-0" />
              {/* Active progress fill line */}
              <div 
                className="absolute left-0 -ml-9 top-[28px] h-[1px] bg-[#C5A059] transition-all duration-500 z-0" 
                style={{ width: step === 1 ? '40px' : step === 2 ? 'calc(33.33% + 13.33px)' : step === 3 ? 'calc(66.66% - 13.33px)' : 'calc(100% + 72px)' }} 
              />

              {[1, 2, 3, 4].map((s) => {
                const isCompleted = step > s;
                const isActive = step === s;

                const getStepIcon = (num: number) => {
                  if (num === 1) return <Scissors size={13} className={isActive ? 'text-[#C5A059]' : isCompleted ? 'text-[#C5A059]/80' : 'text-zinc-600'} />;
                  if (num === 2) return <Clock size={13} className={isActive ? 'text-[#C5A059]' : isCompleted ? 'text-[#C5A059]/80' : 'text-zinc-600'} />;
                  if (num === 3) return <User size={13} className={isActive ? 'text-[#C5A059]' : isCompleted ? 'text-[#C5A059]/80' : 'text-zinc-600'} />;
                  return <Check size={13} className={isActive ? 'text-[#C5A059]' : isCompleted ? 'text-[#C5A059]/80' : 'text-zinc-600'} />;
                };

                const getStepLabel = (num: number) => {
                  if (num === 1) return 'Serviços';
                  if (num === 2) return 'Agenda';
                  if (num === 3) return 'Dados';
                  return 'Revisar';
                };

                return (
                  <div key={`m-step-node-${s}`} className="flex flex-col items-center relative z-10 w-12" aria-current={isActive ? 'step' : undefined}>
                    {/* Icon on Top */}
                    <div className="h-5 flex items-center justify-center mb-1">
                      {getStepIcon(s)}
                    </div>
                    
                    {/* Small Dot in Middle */}
                    <div className={`w-2 h-2 rounded-full border transition-all duration-500 ${
                      isActive 
                        ? 'bg-[#C5A059] border-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.5)]' 
                        : isCompleted 
                          ? 'bg-[#C5A059] border-[#C5A059]' 
                          : 'bg-[#050505] border-white/20'
                    }`} />
                    
                    {/* Label at Bottom */}
                    <span className={`text-[9px] font-bold mt-1.5 transition-colors duration-500 tracking-wider text-center ${
                      isActive 
                        ? 'text-[#C5A059]' 
                        : isCompleted 
                          ? 'text-zinc-400' 
                          : 'text-zinc-600'
                    }`}>
                      {getStepLabel(s)}
                    </span>
                  </div>
                );
              })}
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 px-5 pt-5 pb-12 flex flex-col justify-start">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="m1" 
                  initial={{ opacity: 0, y: 12 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -12 }} 
                  transition={{ duration: 0.3 }}
                  className="space-y-5 w-full"
                >
                  {/* Banner Premium */}
                  <div className="relative h-28 mb-5 rounded-2xl overflow-hidden border border-white/[0.04] bg-[#0E0E0E] flex items-center px-5">
                    <img 
                      src="/assets/agendamento-mobile.webp" 
                      alt="Banner Black Diamond" 
                      className="absolute inset-0 w-full h-full object-cover grayscale opacity-25 pointer-events-none"
                    />
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                    
                    <div className="relative z-10">
                      <span className="text-[8px] font-black tracking-[0.4em] text-[#C5A059] uppercase block mb-0.5">BLACK DIAMOND</span>
                      <h2 className="text-xl font-black text-white tracking-tight">Escolha os serviços</h2>
                      <p className="text-[10px] text-zinc-400">Selecione os serviços desejados</p>
                    </div>
                  </div>



                  {/* Services List */}
                  <div className="space-y-3">
                    {services.map((service, index) => {
                      const isSelected = selectedServices.some(s => s.id === service.id);
                      return (
                        <motion.button 
                          key={service.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04, ease: "easeOut" }}
                          onClick={() => toggleService(service)}
                          className={`w-full text-left rounded-2xl p-5 border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none ${
                            isSelected 
                              ? 'bg-[#12100d] border-[#C5A059]' 
                              : 'bg-[#080808] border-white/[0.04] hover:bg-[#0c0c0c]'
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Checkbox */}
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                              isSelected ? 'border-[#C5A059] bg-[#C5A059]' : 'border-white/20'
                            }`}>
                              {isSelected && <Check size={11} className="text-white stroke-[3px]" />}
                            </div>
                            
                            {/* Details (Name only) */}
                            <div className="min-w-0 flex-1">
                              <p className={`text-[15px] font-bold tracking-tight transition-colors leading-tight ${
                                isSelected ? 'text-[#C5A059]' : 'text-zinc-100'
                              }`}>
                                {service.name}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <span className={`text-[15px] font-black tracking-tight tabular-nums transition-colors ${
                              isSelected ? 'text-[#C5A059]' : 'text-zinc-200'
                            }`}>
                              R$ {Number(service.price).toFixed(0)}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="m2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-6 w-full">
                  {/* Date Picker */}
                  <div 
                    ref={dateContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-hide -mx-5 px-5 snap-x shrink-0 cursor-grab active:cursor-grabbing select-none"
                  >
                    {nextDays.map(day => {
                      const isSelected = selectedDate === day.fullDate;
                      const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                      const monthIndex = parseInt(day.fullDate.split('-')[1]) - 1;
                      return (
                        <button 
                          key={day.fullDate} 
                          onClick={() => setSelectedDate(day.fullDate)}
                          disabled={day.isPast}
                          className={`w-[72px] h-[88px] shrink-0 snap-center flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-300 border ${
                            day.isPast
                              ? 'opacity-30 cursor-not-allowed border-transparent bg-transparent'
                              : isSelected 
                                ? 'bg-[#C5A059] border-[#C5A059] text-black' 
                                : day.isToday
                                  ? 'bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059]'
                                  : 'bg-[#0d0d0d] border border-white/[0.04] text-zinc-400 hover:bg-[#121212]'
                          }`}
                        >
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${
                            isSelected ? 'text-black/60' : day.isToday ? 'text-[#C5A059]' : 'text-zinc-500'
                          }`}>{day.dayName}</span>
                          
                          <span className={`text-[19px] font-black leading-none ${
                            isSelected ? 'text-black' : day.isToday ? 'text-[#C5A059]' : 'text-white'
                          }`}>{day.dayNumber}</span>
                          
                          <span className={`text-[8px] font-bold uppercase tracking-wider ${
                            isSelected ? 'text-black/50' : 'text-zinc-600'
                          }`}>{monthNames[monthIndex]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Time Slots */}
                  <div>
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Horários</p>
                    {selectedDate ? (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map(time => {
                          const occupied = isTimeOccupied(time, existingBookings);
                          const isSelected = selectedTime === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={occupied}
                              onClick={() => setSelectedTime(time)}
                              className={`py-3 rounded-xl text-[12px] font-bold transition-all duration-200 border ${
                                occupied 
                                  ? 'text-zinc-800 bg-transparent cursor-not-allowed line-through opacity-20 border-transparent' 
                                  : isSelected 
                                    ? 'bg-[#C5A059] border-[#C5A059] text-black' 
                                    : 'bg-[#0d0d0d] border-white/[0.04] text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-zinc-600 text-[11px] py-8 text-center">Selecione uma data acima</p>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="m3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4 pb-4">
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                      <User size={12} className="text-[#C5A059]/60" />
                      Nome
                    </label>
                    <input 
                      type="text" 
                      placeholder="Digite seu nome..." 
                      aria-label="Seu nome"
                      className="w-full bg-[#0d0d0d] border border-white/[0.06] focus:border-[#C5A059] focus:shadow-[0_0_16px_rgba(197,160,89,0.15)] rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600" 
                      value={userInfo.name} 
                      onChange={e => setUserInfo({...userInfo, name: e.target.value})} 
                    />
                    {userInfo.name && userInfo.name.trim().length < 3 && (
                      <p className="text-[10px] text-red-400/80">Mínimo 3 caracteres</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#C5A059"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </label>
                    <input 
                      type="tel" 
                      placeholder="(00) 90000-0000" 
                      aria-label="Seu número de WhatsApp com DDD"
                      className="w-full bg-[#0d0d0d] border border-white/[0.06] focus:border-[#C5A059] focus:shadow-[0_0_16px_rgba(197,160,89,0.15)] rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600" 
                      value={userInfo.phone} 
                      onChange={e => setUserInfo({...userInfo, phone: formatPhone(e.target.value)})} 
                    />
                    {userInfo.phone && userInfo.phone.replace(/\D/g, '').length < 11 && (
                      <p className="text-[10px] text-red-400/80">Informe um WhatsApp válido</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      Email <span className="text-zinc-600 font-normal">(opcional)</span>
                    </label>
                    <input 
                      type="email" 
                      placeholder="seu@email.com" 
                      aria-label="Seu email"
                      className="w-full bg-[#0d0d0d] border border-white/[0.06] focus:border-[#C5A059] focus:shadow-[0_0_16px_rgba(197,160,89,0.15)] rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600" 
                      value={userInfo.email} 
                      onChange={e => setUserInfo({...userInfo, email: e.target.value})} 
                    />
                    <p className="text-[9px] text-zinc-600 leading-relaxed">Pedimos seu email para enviar um lembrete antes do seu horário.</p>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="m4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4 pb-4">
                  {/* Minimalist Summary Card */}
                  <div className="w-full bg-[#080808] border border-white/[0.04] rounded-2xl p-6 space-y-5">
                    {/* Header */}
                    <div className="pb-3 border-b border-white/[0.04] flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-widest text-[#C5A059] uppercase">Resumo do Agendamento</span>
                      <span className="text-[10px] text-zinc-500 font-medium">Verifique os dados</span>
                    </div>

                    {/* Details */}
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-zinc-500 font-medium">Cliente</span>
                        <span className="font-semibold text-white truncate max-w-[180px]">{userInfo.name}</span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-zinc-500 font-medium">WhatsApp</span>
                        <span className="font-semibold text-white">{userInfo.phone}</span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-zinc-500 font-medium">Data e Horário</span>
                        <span className="font-semibold text-[#C5A059]">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span>
                      </div>
                    </div>

                    {/* Services */}
                    <div className="pt-3.5 border-t border-white/[0.04] space-y-2.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Serviços</span>
                      <div className="space-y-2">
                        {selectedServices.map(s => (
                          <div key={`m-ticket-${s.id}`} className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400">{s.name}</span>
                            <span className="font-medium text-white">R$ {Number(s.price).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="pt-4 border-t border-white/[0.04] flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Valor Total</span>
                      <span className="text-xl font-black text-[#C5A059] tracking-tight">R$ {totalPrice.toFixed(0)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Button */}
          {step < 5 && (
            <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-[100] border-t border-white/[0.03] backdrop-blur-md" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
              {/* Selected Services Info Summary */}
              {selectedServices.length > 0 && step === 2 && (
                <div className="flex justify-between items-center mb-3 text-xs bg-white/[0.02] border border-white/[0.04] px-4 py-2.5 rounded-xl backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse" />
                    <span className="text-zinc-400 font-medium">
                      {selectedServices.length} {selectedServices.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}
                    </span>
                  </div>
                  <span className="font-black text-[#C5A059]">
                    R$ {totalPrice.toFixed(0)}
                  </span>
                </div>
              )}

              <button 
                onClick={() => step < 4 ? setStep(step + 1) : handleConfirm()}
                disabled={isStepDisabled()}
                aria-label={step < 4 ? 'Continuar para a próxima etapa' : 'Confirmar e concluir agendamento'}
                className={`w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                  isStepDisabled()
                    ? 'bg-[#0a0a0a] border border-white/[0.04] text-zinc-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#C5A059] to-[#b8923f] text-black hover:brightness-110 active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? 'CONFIRMANDO...' : step < 4 ? 'Continuar' : 'Confirmar Agendamento'}
              </button>
            </div>
          )}

          {/* Success Screen */}
          {step === 5 && (
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
      `}</style>
      <ToastNotification toast={toast} />

    </div>
  );
};

export default BookingPage;
