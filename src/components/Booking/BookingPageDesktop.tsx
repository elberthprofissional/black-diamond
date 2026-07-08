import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import ServiceStep from './ServiceStep';
import DateTimeStep from './DateTimeStep';
import DataStep from './DataStep';
import ReviewStep from './ReviewStep';
import SuccessStep from './SuccessStep';
import { formatDateBR } from '../../lib/utils';
import type { Service } from '../../types';

interface BookingPageDesktopProps {
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
  // Drag scroll props — only used by Mobile variant, kept here for sharedProps compatibility
  dateContainerRef?: React.RefObject<HTMLDivElement | null>;
  handleMouseDown?: (e: React.MouseEvent) => void;
  handleMouseLeave?: () => void;
  handleMouseUp?: () => void;
  handleMouseMove?: (e: React.MouseEvent) => void;
  toggleService: (service: Service) => void;
  setSelectedDate: (date: string) => void;
  setSelectedTime: (time: string) => void;
  setUserInfo: (info: { name: string; phone: string }) => void;
  goNext: () => void;
  goBack: () => void;
  nextDays: {
    fullDate: string;
    dayName: string;
    dayNumber: number;
    isToday: boolean;
    isPast: boolean;
  }[];
  isMensalista: boolean;
  planName?: string;
  clientLookupLoading: boolean;
  token?: string;
  manageUrl?: string;
}

const BookingPageDesktop: React.FC<BookingPageDesktopProps> = ({
  step,
  stepTitle,
  services,
  selectedServices,
  selectedDate,
  selectedTime,
  userInfo,
  totalPrice,
  isStepDisabled,
  isSubmitting,
  availableSlots,
  existingBookings,
  toggleService,
  setSelectedDate,
  setSelectedTime,
  setUserInfo,
  goNext,
  goBack,
  nextDays,
  isMensalista,
  planName,
  clientLookupLoading,
  token,
  manageUrl,
}) => {
  return (
    <div className="hidden lg:flex min-h-screen bg-[#0E0E0E] text-white">
      <div className="w-[420px] shrink-0 bg-[#0A0A0A] flex flex-col justify-between p-12 text-white relative overflow-hidden">
        <img
          src="/assets/agendamento.webp"
          alt="Agendamento"
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 pointer-events-none"
        />
        <div>
          <span className="text-[10px] font-black tracking-[0.5em] text-[#C5A059] uppercase">
            BLACK DIAMOND
          </span>
          <h1 className="text-3xl font-bold mt-6 leading-tight">
            Agendamento
            <br />
            Online
          </h1>
          <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
            Escolha seus serviços, horário e confirme. Rápido e fácil.
          </p>
          {isMensalista && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
              <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider">
                Mensalista
              </span>
            </div>
          )}
        </div>
        <div className="mt-auto">
          {selectedServices.length > 0 && step < 4 && (
            <div className="bg-white/[0.04] rounded-2xl p-5 space-y-3 border border-white/[0.06]">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Resumo</p>
              {selectedServices.map((s) => (
                <div key={`side-${s.id}`} className="flex justify-between items-center">
                  <span className="text-[13px] text-zinc-300">{s.name}</span>
                  <span className="text-[13px] font-bold text-[#C5A059]">
                    R$ {Number(s.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {selectedDate && (
                <div className="border-t border-white/[0.06] pt-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-500">Data</span>
                    <span className="text-[13px] font-bold">{formatDateBR(selectedDate)}</span>
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
                <span className="text-lg font-bold">
                  R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="bg-white/[0.04] rounded-2xl p-5 space-y-3 border border-white/[0.06]">
              <p className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest">
                Procedimento
              </p>
              <p className="text-[12px] text-zinc-400 leading-relaxed">
                Você será redirecionado para o WhatsApp com a mensagem do seu agendamento já
                formatada. Basta enviar a mensagem na conversa para finalizar.
              </p>
            </div>
          )}
          <p className="text-[8px] text-zinc-600 mt-6">Precisa de ajuda? WhatsApp</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-14 py-6 flex items-center justify-between border-b border-white/[0.04]">
          <div className="flex items-center gap-5">
            {step > 1 && step < 5 && (
              <button
                onClick={goBack}
                aria-label="Voltar para o passo anterior"
                className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            {step < 5 && (
              <div>
                <h2 className="text-xl font-bold text-white">{stepTitle}</h2>
                <p className="text-[12px] text-zinc-500 mt-0.5">
                  {step === 1 && 'Preencha suas informações'}
                  {step === 2 && 'Escolha os serviços'}
                  {step === 3 && 'Defina data e horário'}
                  {step === 4 && 'Revise e confirme'}
                </p>
              </div>
            )}
          </div>

          {/* Step Indicator */}
          {step < 5 && (
            <div
              className="flex items-center gap-3"
              role="list"
              aria-label="Progresso do agendamento"
            >
              {[1, 2, 3, 4].map((s, i) => (
                <React.Fragment key={s}>
                  <div
                    role="listitem"
                    aria-current={step === s ? 'step' : undefined}
                    aria-label={`Passo ${s}${step === s ? ' (atual)' : step > s ? ' (concluído)' : ''}`}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                      step === s
                        ? 'bg-[#C5A059]/10 text-[#C5A059]'
                        : step > s
                          ? 'text-zinc-400'
                          : 'text-zinc-600'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step === s
                          ? 'bg-[#C5A059] text-black'
                          : step > s
                            ? 'bg-white/10 text-white'
                            : 'bg-white/[0.04] text-zinc-600'
                      }`}
                    >
                      {step > s ? '✓' : s}
                    </span>
                    <span className="hidden xl:inline">
                      {s === 1 && 'Dados'}
                      {s === 2 && 'Serviços'}
                      {s === 3 && 'Horário'}
                      {s === 4 && 'Confirmar'}
                    </span>
                  </div>
                  {i < 3 && (
                    <div
                      className={`w-6 h-px ${step > s ? 'bg-[#C5A059]/30' : 'bg-white/[0.06]'}`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-14 pt-10 pb-6 flex flex-col">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="d1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="flex-1"
              >
                <DataStep
                  name={userInfo.name}
                  phone={userInfo.phone}
                  onNameChange={(v) => setUserInfo({ ...userInfo, name: v })}
                  onPhoneChange={(v) => setUserInfo({ ...userInfo, phone: v })}
                  layout="desktop"
                  isMensalista={isMensalista}
                  clientLookupLoading={clientLookupLoading}
                />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="d2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="flex-1"
              >
                <ServiceStep
                  services={services}
                  selectedServices={selectedServices}
                  isMensalista={isMensalista}
                  planName={planName}
                  onToggle={toggleService}
                  onSkip={goNext}
                  layout="desktop"
                />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div
                key="d3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="flex-1"
              >
                <DateTimeStep
                  nextDays={nextDays}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSelectDate={setSelectedDate}
                  onSelectTime={setSelectedTime}
                  availableSlots={availableSlots}
                  existingBookings={existingBookings}
                  layout="desktop"
                />
              </motion.div>
            )}
            {step === 4 && (
              <motion.div
                key="d4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="flex-1"
              >
                <ReviewStep
                  userName={userInfo.name}
                  userPhone={userInfo.phone}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  selectedServices={selectedServices}
                  totalPrice={totalPrice}
                  layout="desktop"
                />
              </motion.div>
            )}
            {step === 5 && (
              <motion.div
                key="d5"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex-1"
              >
                <SuccessStep
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  totalPrice={totalPrice}
                  selectedServices={selectedServices}
                  clientName={userInfo.name}
                  layout="desktop"
                  token={token}
                  manageUrl={manageUrl}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {step < 5 && (
            <div className={`flex justify-end ${step === 3 || step === 4 ? 'pt-2' : 'pt-6'}`}>
              <button
                onClick={goNext}
                disabled={isStepDisabled}
                aria-label={
                  step === 4 ? 'Confirmar e concluir agendamento' : 'Continuar para a próxima etapa'
                }
                className={`h-11 px-8 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${!isStepDisabled ? 'bg-[#C5A059] text-black hover:bg-[#A68233] active:scale-95' : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'}`}
              >
                {isSubmitting
                  ? 'CONFIRMANDO...'
                  : step === 4
                    ? 'Confirmar Agendamento'
                    : 'Continuar'}
              </button>
            </div>
          )}
        </div>

        <div className="px-14 py-5 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black tracking-[0.4em] text-[#C5A059] uppercase">
              BLACK DIAMOND
            </span>
            <span className="text-[9px] text-zinc-600">Barbearia</span>
          </div>
          <p className="text-[9px] text-zinc-600">
            © {new Date().getFullYear()} Black Diamond. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingPageDesktop;
