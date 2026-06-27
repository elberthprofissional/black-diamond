import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices, createBooking, getAvailableSlots, getBookings } from '../lib/api';
import { getNextDays, formatPhone, getTimeSlotsForDate } from '../lib/utils';
import type { Service } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Scissors, Clock } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import ServiceStep from '../components/Booking/ServiceStep';
import DateTimeStep from '../components/Booking/DateTimeStep';
import DataStep from '../components/Booking/DataStep';
import ReviewStep from '../components/Booking/ReviewStep';
import SuccessStep from '../components/Booking/SuccessStep';

const BookingPage: React.FC = () => {
  const { toast, showError } = useToast();
  const nextDays = useMemo(() => getNextDays(), []);
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [userInfo, setUserInfo] = useState({ name: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<{ booking_time: string; status: string }[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const navigate = useNavigate();

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

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

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
      } catch {
        showError('Erro ao carregar serviços. Tente novamente.');
      }
    };
    loadServices();
  }, []);

  useEffect(() => {
    setSelectedTime('');
    if (selectedDate) {
      const loadBookings = async () => {
        try {
          const data = await getBookings(selectedDate);
          setExistingBookings(data);
        } catch {
          showError('Erro ao carregar agendamentos.');
        }
      };
      const loadAvailableSlots = async () => {
        try {
          const slots = await getAvailableSlots(selectedDate);
          setAvailableSlots(slots);
        } catch {
          setAvailableSlots(getTimeSlotsForDate(selectedDate));
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
        { name: userInfo.name, phone: userInfo.phone }
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
      
      window.open(`https://wa.me/${import.meta.env.VITE_BARBER_WHATSAPP || '554399553590'}?text=${encodeURIComponent(message)}`, '_blank');
      setStep(5);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao realizar agendamento.';
      showError(message);
    } finally { setIsSubmitting(false); }
  };

  const stepTitle = step === 1 ? 'Escolha os serviços' : step === 2 ? 'Data e horário' : step === 3 ? 'Seus dados' : 'Revisar agendamento';

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
                    <h2 className="text-xl font-bold text-white mt-0.5">{stepTitle}</h2>
                  </div>
                )}
              </div>
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

            <div className="flex-1 overflow-y-auto px-14 pt-10 pb-6 flex flex-col">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="d1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1">
                    <ServiceStep services={services} selectedServices={selectedServices} onToggle={toggleService} layout="desktop" />
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="d2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1">
                    <DateTimeStep nextDays={nextDays} selectedDate={selectedDate} selectedTime={selectedTime} onSelectDate={setSelectedDate} onSelectTime={setSelectedTime} availableSlots={availableSlots} existingBookings={existingBookings} layout="desktop" />
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div key="d3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1">
                    <DataStep name={userInfo.name} phone={userInfo.phone} onNameChange={v => setUserInfo({...userInfo, name: v})} onPhoneChange={v => setUserInfo({...userInfo, phone: formatPhone(v)})} layout="desktop" />
                  </motion.div>
                )}
                {step === 4 && (
                  <motion.div key="d4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1">
                    <ReviewStep userName={userInfo.name} userPhone={userInfo.phone} selectedDate={selectedDate} selectedTime={selectedTime} selectedServices={selectedServices} totalPrice={totalPrice} layout="desktop" />
                  </motion.div>
                )}
                {step === 5 && (
                  <motion.div key="d5" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} className="flex-1">
                    <SuccessStep selectedDate={selectedDate} selectedTime={selectedTime} totalPrice={totalPrice} layout="desktop" />
                  </motion.div>
                )}
              </AnimatePresence>

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
                <h1 className="text-base font-bold text-white flex items-center gap-2">{stepTitle}</h1>
              </div>
            </div>
            <div className="relative flex justify-between items-center w-full mt-4 px-4 pb-1 select-none">
              <div className="absolute left-0 right-0 -mx-9 top-[28px] h-[1px] bg-white/10 z-0" />
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
                  if (num === 3) return <Check size={13} className={isActive ? 'text-[#C5A059]' : isCompleted ? 'text-[#C5A059]/80' : 'text-zinc-600'} />;
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
                    <div className="h-5 flex items-center justify-center mb-1">{getStepIcon(s)}</div>
                    <div className={`w-2 h-2 rounded-full border transition-all duration-500 ${
                      isActive ? 'bg-[#C5A059] border-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.5)]' : isCompleted ? 'bg-[#C5A059] border-[#C5A059]' : 'bg-[#050505] border-white/20'
                    }`} />
                    <span className={`text-[9px] font-bold mt-1.5 transition-colors duration-500 tracking-wider text-center ${
                      isActive ? 'text-[#C5A059]' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'
                    }`}>{getStepLabel(s)}</span>
                  </div>
                );
              })}
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 px-5 pt-5 pb-12 flex flex-col justify-start">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="m1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-5 w-full">
                  <div className="relative h-28 mb-5 rounded-2xl overflow-hidden border border-white/[0.04] bg-[#0E0E0E] flex items-center px-5">
                    <img src="/assets/agendamento-mobile.webp" alt="Banner Black Diamond" className="absolute inset-0 w-full h-full object-cover grayscale opacity-25 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                    <div className="relative z-10">
                      <span className="text-[8px] font-black tracking-[0.4em] text-[#C5A059] uppercase block mb-0.5">BLACK DIAMOND</span>
                      <h2 className="text-xl font-black text-white tracking-tight">Escolha os serviços</h2>
                      <p className="text-[10px] text-zinc-400">Selecione os serviços desejados</p>
                    </div>
                  </div>
                  <ServiceStep services={services} selectedServices={selectedServices} onToggle={toggleService} layout="mobile" />
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="m2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-6 w-full">
                  <DateTimeStep nextDays={nextDays} selectedDate={selectedDate} selectedTime={selectedTime} onSelectDate={setSelectedDate} onSelectTime={setSelectedTime} availableSlots={availableSlots} existingBookings={existingBookings} layout="mobile" dateContainerRef={dateContainerRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} />
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="m3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <DataStep name={userInfo.name} phone={userInfo.phone} onNameChange={v => setUserInfo({...userInfo, name: v})} onPhoneChange={v => setUserInfo({...userInfo, phone: formatPhone(v)})} layout="mobile" />
                </motion.div>
              )}
              {step === 4 && (
                <motion.div key="m4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <ReviewStep userName={userInfo.name} userPhone={userInfo.phone} selectedDate={selectedDate} selectedTime={selectedTime} selectedServices={selectedServices} totalPrice={totalPrice} layout="mobile" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {step < 5 && (
            <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-[100] border-t border-white/[0.03] backdrop-blur-md" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
              {selectedServices.length > 0 && step === 2 && (
                <div className="flex justify-between items-center mb-3 text-xs bg-white/[0.02] border border-white/[0.04] px-4 py-2.5 rounded-xl backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse" />
                    <span className="text-zinc-400 font-medium">
                      {selectedServices.length} {selectedServices.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}
                    </span>
                  </div>
                  <span className="font-black text-[#C5A059]">R$ {totalPrice.toFixed(0)}</span>
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

          {step === 5 && <SuccessStep selectedDate={selectedDate} selectedTime={selectedTime} totalPrice={totalPrice} layout="mobile" />}
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
