import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Scissors, Clock } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useBookingWizard } from '../hooks/useBookingWizard';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import ServiceStep from '../components/Booking/ServiceStep';
import DateTimeStep from '../components/Booking/DateTimeStep';
import DataStep from '../components/Booking/DataStep';
import ReviewStep from '../components/Booking/ReviewStep';
import SuccessStep from '../components/Booking/SuccessStep';

const BookingPage: React.FC = () => {
  const { toast, showError } = useToast();
  const w = useBookingWizard(showError);

  const stepIcons = [Scissors, Clock, Check, Check];
  const stepLabels = ['Serviços', 'Agenda', 'Dados', 'Revisar'];

  return (
    <div className="font-sans relative min-h-screen bg-[#050505] flex flex-col selection:bg-[#C5A059] selection:text-black overflow-x-hidden">
      <main className="flex-1 relative z-10 h-full flex flex-col">

        {/* DESKTOP LAYOUT */}
        <div className="hidden lg:flex min-h-screen bg-[#0E0E0E] text-white">

          {/* Left Panel */}
          <div className="w-[420px] shrink-0 bg-[#0A0A0A] flex flex-col justify-between p-12 text-white relative overflow-hidden">
            <img src="/assets/agendamento.webp" alt="Agendamento" className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 pointer-events-none" />
            <div>
              <span className="text-[10px] font-black tracking-[0.5em] text-[#C5A059] uppercase">BLACK DIAMOND</span>
              <h1 className="text-3xl font-bold mt-6 leading-tight">Agendamento<br />Online</h1>
              <p className="text-sm text-zinc-500 mt-3 leading-relaxed">Escolha seus serviços, horário e confirme. Rápido e fácil.</p>
            </div>
            <div className="mt-auto">
              {w.selectedServices.length > 0 && w.step < 4 && (
                <div className="bg-white/[0.04] rounded-2xl p-5 space-y-3 border border-white/[0.06]">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Resumo</p>
                  {w.selectedServices.map((s) => (
                    <div key={`side-${s.id}`} className="flex justify-between items-center">
                      <span className="text-[13px] text-zinc-300">{s.name}</span>
                      <span className="text-[13px] font-bold text-[#C5A059]">R$ {Number(s.price).toFixed(0)}</span>
                    </div>
                  ))}
                  {w.selectedDate && (
                    <div className="border-t border-white/[0.06] pt-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[10px] text-zinc-500">Data</span>
                        <span className="text-[13px] font-bold">{w.selectedDate.split('-').reverse().join('/')}</span>
                      </div>
                      {w.selectedTime && (
                        <div className="flex justify-between">
                          <span className="text-[10px] text-zinc-500">Horário</span>
                          <span className="text-[13px] font-bold text-[#C5A059]">{w.selectedTime}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="border-t border-white/[0.06] pt-3 flex justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Total</span>
                    <span className="text-lg font-bold">R$ {w.totalPrice.toFixed(0)}</span>
                  </div>
                </div>
              )}
              {w.step === 4 && (
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

          {/* Right Panel */}
          <div className="flex-1 flex flex-col">
            <div className="px-14 py-6 flex items-center justify-between">
              <div className="flex items-center gap-5">
                {w.step > 1 && w.step < 5 && (
                  <button onClick={w.goBack} aria-label="Voltar para o passo anterior" className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer">
                    <ArrowLeft size={16} />
                  </button>
                )}
                {w.step < 5 && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Passo {w.step} de 4</p>
                    <h2 className="text-xl font-bold text-white mt-0.5">{w.stepTitle}</h2>
                  </div>
                )}
              </div>
              <div className="flex gap-1 w-40" role="list" aria-label="Progresso do agendamento">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} role="listitem" aria-current={w.step === s ? 'step' : undefined} aria-label={`Passo ${s}${w.step === s ? ' (atual)' : w.step > s ? ' (concluído)' : ''}`} className={`h-[2px] flex-1 rounded-full transition-all duration-500 ${w.step === s ? 'bg-[#C5A059]' : w.step > s ? 'bg-[#C5A059]/30' : 'bg-white/[0.08]'}`} />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-14 pt-10 pb-6 flex flex-col">
              <AnimatePresence mode="wait">
                {w.step === 1 && <motion.div key="d1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1"><ServiceStep services={w.services} selectedServices={w.selectedServices} onToggle={w.toggleService} layout="desktop" /></motion.div>}
                {w.step === 2 && <motion.div key="d2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1"><DateTimeStep nextDays={w.nextDays} selectedDate={w.selectedDate} selectedTime={w.selectedTime} onSelectDate={w.setSelectedDate} onSelectTime={w.setSelectedTime} availableSlots={w.availableSlots} existingBookings={w.existingBookings} layout="desktop" /></motion.div>}
                {w.step === 3 && <motion.div key="d3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1"><DataStep name={w.userInfo.name} phone={w.userInfo.phone} onNameChange={v => w.setUserInfo({...w.userInfo, name: v})} onPhoneChange={v => w.setUserInfo({...w.userInfo, phone: w.formatPhoneValue(v)})} layout="desktop" /></motion.div>}
                {w.step === 4 && <motion.div key="d4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="flex-1"><ReviewStep userName={w.userInfo.name} userPhone={w.userInfo.phone} selectedDate={w.selectedDate} selectedTime={w.selectedTime} selectedServices={w.selectedServices} totalPrice={w.totalPrice} layout="desktop" /></motion.div>}
                {w.step === 5 && <motion.div key="d5" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} className="flex-1"><SuccessStep selectedDate={w.selectedDate} selectedTime={w.selectedTime} totalPrice={w.totalPrice} layout="desktop" /></motion.div>}
              </AnimatePresence>

              {w.step < 5 && (
                <div className={`flex justify-end ${w.step === 3 || w.step === 4 ? 'pt-2' : 'pt-6'}`}>
                  <button onClick={w.goNext} disabled={w.isStepDisabled} aria-label={w.step === 4 ? 'Confirmar e concluir agendamento' : 'Continuar para a próxima etapa'} className={`h-11 px-8 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${!w.isStepDisabled ? 'bg-[#C5A059] text-black hover:bg-[#A68233] active:scale-95' : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'}`}>
                    {w.isSubmitting ? 'CONFIRMANDO...' : w.step === 4 ? 'Confirmar Agendamento' : 'Continuar'}
                  </button>
                </div>
              )}
            </div>

            <div className="px-14 py-5 border-t border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-[0.4em] text-[#C5A059] uppercase">BLACK DIAMOND</span>
                <span className="text-[9px] text-zinc-600">Barbearia</span>
              </div>
              <p className="text-[9px] text-zinc-600">© 2026 Black Diamond. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT */}
        <div className="lg:hidden min-h-screen bg-[#050505] flex flex-col text-white font-sans relative pb-28 overflow-x-hidden">
          <header className="px-5 pt-5 pb-4 shrink-0 border-b border-white/[0.04] bg-[#050505] sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <button onClick={() => w.step > 1 ? w.goBack() : w.navigate('/')} className="text-zinc-500 hover:text-white transition-all cursor-pointer">
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <h1 className="text-base font-bold text-white flex items-center gap-2">{w.stepTitle}</h1>
              </div>
            </div>
            <div className="relative flex justify-between items-center w-full mt-4 px-4 pb-1 select-none">
              <div className="absolute left-0 right-0 -mx-9 top-[28px] h-[1px] bg-white/10 z-0" />
              <div className="absolute left-0 -ml-9 top-[28px] h-[1px] bg-[#C5A059] transition-all duration-500 z-0" style={{ width: w.step === 1 ? '40px' : w.step === 2 ? 'calc(33.33% + 13.33px)' : w.step === 3 ? 'calc(66.66% - 13.33px)' : 'calc(100% + 72px)' }} />
              {[1, 2, 3, 4].map((s) => {
                const Icon = stepIcons[s - 1];
                const isCompleted = w.step > s;
                const isActive = w.step === s;
                return (
                  <div key={`m-step-${s}`} className="flex flex-col items-center relative z-10 w-12" aria-current={isActive ? 'step' : undefined}>
                    <div className="h-5 flex items-center justify-center mb-1"><Icon size={13} className={isActive ? 'text-[#C5A059]' : isCompleted ? 'text-[#C5A059]/80' : 'text-zinc-600'} /></div>
                    <div className={`w-2 h-2 rounded-full border transition-all duration-500 ${isActive ? 'bg-[#C5A059] border-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.5)]' : isCompleted ? 'bg-[#C5A059] border-[#C5A059]' : 'bg-[#050505] border-white/20'}`} />
                    <span className={`text-[9px] font-bold mt-1.5 transition-colors duration-500 tracking-wider text-center ${isActive ? 'text-[#C5A059]' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'}`}>{stepLabels[s - 1]}</span>
                  </div>
                );
              })}
            </div>
          </header>

          <div className="flex-1 px-5 pt-5 pb-12 flex flex-col justify-start">
            <AnimatePresence mode="wait">
              {w.step === 1 && (
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
                  <ServiceStep services={w.services} selectedServices={w.selectedServices} onToggle={w.toggleService} layout="mobile" />
                </motion.div>
              )}
              {w.step === 2 && <motion.div key="m2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-6 w-full"><DateTimeStep nextDays={w.nextDays} selectedDate={w.selectedDate} selectedTime={w.selectedTime} onSelectDate={w.setSelectedDate} onSelectTime={w.setSelectedTime} availableSlots={w.availableSlots} existingBookings={w.existingBookings} layout="mobile" dateContainerRef={w.dateContainerRef} onMouseDown={w.handleMouseDown} onMouseLeave={w.handleMouseLeave} onMouseUp={w.handleMouseUp} onMouseMove={w.handleMouseMove} /></motion.div>}
              {w.step === 3 && <motion.div key="m3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}><DataStep name={w.userInfo.name} phone={w.userInfo.phone} onNameChange={v => w.setUserInfo({...w.userInfo, name: v})} onPhoneChange={v => w.setUserInfo({...w.userInfo, phone: w.formatPhoneValue(v)})} layout="mobile" /></motion.div>}
              {w.step === 4 && <motion.div key="m4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}><ReviewStep userName={w.userInfo.name} userPhone={w.userInfo.phone} selectedDate={w.selectedDate} selectedTime={w.selectedTime} selectedServices={w.selectedServices} totalPrice={w.totalPrice} layout="mobile" /></motion.div>}
            </AnimatePresence>
          </div>

          {w.step < 5 && (
            <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-[100] border-t border-white/[0.03] backdrop-blur-md" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
              {w.selectedServices.length > 0 && w.step === 2 && (
                <div className="flex justify-between items-center mb-3 text-xs bg-white/[0.02] border border-white/[0.04] px-4 py-2.5 rounded-xl backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse" />
                    <span className="text-zinc-400 font-medium">{w.selectedServices.length} {w.selectedServices.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}</span>
                  </div>
                  <span className="font-black text-[#C5A059]">R$ {w.totalPrice.toFixed(0)}</span>
                </div>
              )}
              <button onClick={w.goNext} disabled={w.isStepDisabled} aria-label={w.step < 4 ? 'Continuar para a próxima etapa' : 'Confirmar e concluir agendamento'} className={`w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer ${w.isStepDisabled ? 'bg-[#0a0a0a] border border-white/[0.04] text-zinc-700 cursor-not-allowed' : 'bg-gradient-to-r from-[#C5A059] to-[#b8923f] text-black hover:brightness-110 active:scale-[0.98]'}`}>
                {w.isSubmitting ? 'CONFIRMANDO...' : w.step < 4 ? 'Continuar' : 'Confirmar Agendamento'}
              </button>
            </div>
          )}

          {w.step === 5 && <SuccessStep selectedDate={w.selectedDate} selectedTime={w.selectedTime} totalPrice={w.totalPrice} layout="mobile" />}
        </div>
      </main>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default BookingPage;
