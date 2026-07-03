import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, User, Scissors, Clock } from 'lucide-react';
import ServiceStep from './ServiceStep';
import DateTimeStep from './DateTimeStep';
import DataStep from './DataStep';
import ReviewStep from './ReviewStep';
import SuccessStep from './SuccessStep';
import type { Service } from '../../types';

interface BookingPageMobileProps {
  step: number;
  stepTitle: string;
  services: Service[];
  selectedServices: Service[];
  selectedDate: string;
  selectedTime: string;
  userInfo: { name: string; phone: string };
  totalPrice: number;
  isStepDisabled: boolean;
  isSubmitting: boolean;
  availableSlots: string[];
  existingBookings: { booking_time: string; status: string }[];
  dateContainerRef: React.RefObject<HTMLDivElement | null>;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  handleMouseUp: () => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  toggleService: (service: Service) => void;
  setSelectedDate: (date: string) => void;
  setSelectedTime: (time: string) => void;
  setUserInfo: (info: { name: string; phone: string }) => void;
  goNext: () => void;
  goBack: () => void;
  navigate: (path: string) => void;
  nextDays: { fullDate: string; dayName: string; dayNumber: number; isToday: boolean; isPast: boolean }[];
  isMensalista: boolean;
  clientLookupLoading: boolean;
}

// Inverted: 1=Data, 2=Services, 3=DateTime, 4=Review
const stepIcons = [User, Scissors, Clock, Check];
const stepLabels = ['Dados', 'Serviços', 'Agenda', 'Revisar'];

const BookingPageMobile: React.FC<BookingPageMobileProps> = ({
  step, stepTitle, services, selectedServices, selectedDate, selectedTime,
  userInfo, totalPrice, isStepDisabled, isSubmitting, availableSlots,
  existingBookings, dateContainerRef, handleMouseDown, handleMouseLeave,
  handleMouseUp, handleMouseMove, toggleService, setSelectedDate,
  setSelectedTime, setUserInfo, goNext, goBack, navigate, nextDays,
  isMensalista, clientLookupLoading,
}) => {
  return (
    <div className="lg:hidden min-h-screen bg-[#050505] flex flex-col text-white font-sans relative pb-28 overflow-x-hidden">
      <header className="px-5 pt-5 pb-4 shrink-0 border-b border-white/[0.04] bg-[#050505] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => step > 1 ? goBack() : navigate('/')} aria-label="Voltar" className="text-zinc-500 hover:text-white transition-all cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              {stepTitle}
              {isMensalista && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-full">
                  <span className="w-1 h-1 rounded-full bg-[#C5A059]" />
                  <span className="text-[8px] font-bold text-[#C5A059] uppercase">Mensalista</span>
                </span>
              )}
            </h1>
          </div>
        </div>
        <div className="relative flex justify-between items-center w-full mt-4 px-4 pb-1 select-none">
          <div className="absolute left-0 right-0 -mx-9 top-[28px] h-[1px] bg-white/10 z-0" />
          <div className="absolute left-0 -ml-9 top-[28px] h-[1px] bg-[#C5A059] transition-all duration-500 z-0" style={{ width: step === 1 ? '40px' : step === 2 ? 'calc(33.33% + 13.33px)' : step === 3 ? 'calc(66.66% - 13.33px)' : 'calc(100% + 72px)' }} />
          {[1, 2, 3, 4].map((s) => {
            const Icon = stepIcons[s - 1];
            const isCompleted = step > s;
            const isActive = step === s;
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
          {step === 1 && <motion.div key="m1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-5 w-full"><DataStep name={userInfo.name} phone={userInfo.phone} onNameChange={v => setUserInfo({...userInfo, name: v})} onPhoneChange={v => setUserInfo({...userInfo, phone: v})} layout="mobile" isMensalista={isMensalista} clientLookupLoading={clientLookupLoading} /></motion.div>}
          {step === 2 && (
            <motion.div key="m2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-5 w-full">
              <div className="relative h-28 mb-5 rounded-2xl overflow-hidden border border-white/[0.04] bg-[#0E0E0E] flex items-center px-5">
                <img src="/assets/agendamento-mobile.webp" alt="Banner Black Diamond" className="absolute inset-0 w-full h-full object-cover grayscale opacity-25 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                <div className="relative z-10">
                  <span className="text-[8px] font-black tracking-[0.4em] text-[#C5A059] uppercase block mb-0.5">BLACK DIAMOND</span>
                  <h2 className="text-xl font-black text-white tracking-tight">Escolha os serviços</h2>
                  <p className="text-[10px] text-zinc-400">{isMensalista ? 'Serviços inclusos no plano' : 'Selecione os serviços desejados'}</p>
                </div>
              </div>
              <ServiceStep services={services} selectedServices={selectedServices} isMensalista={isMensalista} onToggle={toggleService} onSkip={goNext} layout="mobile" />
            </motion.div>
          )}
          {step === 3 && <motion.div key="m3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-6 w-full"><DateTimeStep nextDays={nextDays} selectedDate={selectedDate} selectedTime={selectedTime} onSelectDate={setSelectedDate} onSelectTime={setSelectedTime} availableSlots={availableSlots} existingBookings={existingBookings} layout="mobile" dateContainerRef={dateContainerRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} /></motion.div>}
          {step === 4 && <motion.div key="m4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}><ReviewStep userName={userInfo.name} userPhone={userInfo.phone} selectedDate={selectedDate} selectedTime={selectedTime} selectedServices={selectedServices} totalPrice={totalPrice} layout="mobile" /></motion.div>}
        </AnimatePresence>
      </div>

      {step < 5 && (
        <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-[100] border-t border-white/[0.03] backdrop-blur-md" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
          {selectedServices.length > 0 && step === 3 && (
            <div className="flex justify-between items-center mb-3 text-xs bg-white/[0.02] border border-white/[0.04] px-4 py-2.5 rounded-xl backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse" />
                <span className="text-zinc-400 font-medium">{selectedServices.length} {selectedServices.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}</span>
              </div>
              <span className="font-black text-[#C5A059]">R$ {totalPrice.toFixed(0)}</span>
            </div>
          )}
          <button onClick={goNext} disabled={isStepDisabled} aria-label={step < 4 ? 'Continuar para a próxima etapa' : 'Confirmar e concluir agendamento'} className={`w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer ${isStepDisabled ? 'bg-[#0a0a0a] border border-white/[0.04] text-zinc-700 cursor-not-allowed' : 'bg-gradient-to-r from-[#C5A059] to-[#b8923f] text-black hover:brightness-110 active:scale-[0.98]'}`}>
            {isSubmitting ? 'CONFIRMANDO...' : step < 4 ? 'Continuar' : 'Confirmar Agendamento'}
          </button>
        </div>
      )}

      {step === 5 && <SuccessStep selectedDate={selectedDate} selectedTime={selectedTime} totalPrice={totalPrice} selectedServices={selectedServices} clientName={userInfo.name} layout="mobile" />}
    </div>
  );
};

export default BookingPageMobile;
