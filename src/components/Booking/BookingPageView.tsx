import { Fragment, type RefObject, type MouseEvent, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, User, Scissors, Clock } from 'lucide-react';
import ServiceStep from './ServiceStep';
import DateTimeStep from './DateTimeStep';
import DataStep from './DataStep';
import ReviewStep from './ReviewStep';
import SuccessStep from './SuccessStep';
import SkeletonBooking from './SkeletonBooking';
import { formatDateBR } from '../../lib/utils';
import type { Service } from '../../types';

interface BookingPageViewProps {
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
  dateContainerRef: RefObject<HTMLDivElement | null>;
  handleMouseDown: (e: MouseEvent) => void;
  handleMouseLeave: () => void;
  handleMouseUp: () => void;
  handleMouseMove: (e: MouseEvent) => void;
  toggleService: (service: Service) => void;
  setSelectedDate: (date: string) => void;
  setSelectedTime: (time: string) => void;
  setUserInfo: (info: { name: string; phone: string }) => void;
  goNext: () => void;
  goBack: () => void;
  navigate: (path: string) => void;
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
  servicesLoading?: boolean;
  lastBooking?: { serviceIds: string[]; totalPrice: number } | null;
  onApplyLastBooking?: () => void;
  isOfflineBooking?: boolean;
  nextMilestone?: {
    milestone: { visits_required: number; reward_service_id: string };
    progress: number;
    already_claimed: boolean;
  } | null;
  coupon?: {
    coupon_id: string;
    code: string;
    discount_type: string;
    discount_amount: number;
  } | null;
  couponLoading?: boolean;
  couponError?: string;
  originalPrice?: number;
  onCouponValidate?: (code: string) => Promise<void>;
  onCouponRemove?: () => void;
}

const stepIcons = [User, Scissors, Clock, Check];
const stepLabels = ['Dados', 'Serviços', 'Agenda', 'Revisar'];

const BookingPageView: FC<BookingPageViewProps> = ({
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
  dateContainerRef,
  handleMouseDown,
  handleMouseLeave,
  handleMouseUp,
  handleMouseMove,
  toggleService,
  setSelectedDate,
  setSelectedTime,
  setUserInfo,
  goNext,
  goBack,
  navigate,
  nextDays,
  isMensalista,
  planName,
  clientLookupLoading,
  servicesLoading = false,
  lastBooking,
  onApplyLastBooking,
  isOfflineBooking = false,
  nextMilestone,
  coupon,
  couponLoading,
  couponError,
  originalPrice,
  onCouponValidate,
  onCouponRemove,
}) => {
  const renderSteps = (layout: 'desktop' | 'mobile') => (
    <AnimatePresence mode="wait">
      {servicesLoading && layout === 'desktop' && (
        <motion.div
          key="skeleton-desktop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1"
        >
          <SkeletonBooking layout="desktop" />
        </motion.div>
      )}
      {servicesLoading && layout === 'mobile' && (
        <motion.div
          key="skeleton-mobile"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full"
        >
          <SkeletonBooking layout="mobile" />
        </motion.div>
      )}
      {!servicesLoading && step === 1 && (
        <motion.div
          key={`${layout[0]}1`}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: layout === 'desktop' ? 0.28 : 0.3, ease: 'easeInOut' }}
          className={layout === 'mobile' ? 'space-y-5 w-full' : 'flex-1'}
        >
          <DataStep
            name={userInfo.name}
            phone={userInfo.phone}
            onNameChange={(v) => setUserInfo({ ...userInfo, name: v })}
            onPhoneChange={(v) => setUserInfo({ ...userInfo, phone: v })}
            layout={layout}
            isMensalista={isMensalista}
            clientLookupLoading={clientLookupLoading}
            lastBooking={layout === 'mobile' ? lastBooking : undefined}
            onApplyLastBooking={layout === 'mobile' ? onApplyLastBooking : undefined}
            serviceNames={
              layout === 'mobile'
                ? Object.fromEntries(services.map((s) => [s.id, s.name]))
                : undefined
            }
            coupon={coupon}
            couponLoading={couponLoading}
            couponError={couponError}
            onCouponValidate={onCouponValidate}
            onCouponRemove={onCouponRemove}
          />
        </motion.div>
      )}
      {step === 2 && (
        <motion.div
          key={`${layout[0]}2`}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: layout === 'desktop' ? 0.28 : 0.3, ease: 'easeInOut' }}
          className={layout === 'mobile' ? 'space-y-5 w-full' : 'flex-1'}
        >
          <ServiceStep
            services={services}
            selectedServices={selectedServices}
            isMensalista={isMensalista}
            planName={planName}
            onToggle={toggleService}
            onSkip={goNext}
            layout={layout}
            coupon={coupon}
            originalPrice={originalPrice}
          />
        </motion.div>
      )}
      {step === 3 && (
        <motion.div
          key={`${layout[0]}3`}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: layout === 'desktop' ? 0.28 : 0.3, ease: 'easeInOut' }}
          className={layout === 'mobile' ? 'space-y-6 w-full' : 'flex-1'}
        >
          <DateTimeStep
            nextDays={nextDays}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectDate={setSelectedDate}
            onSelectTime={setSelectedTime}
            availableSlots={availableSlots}
            existingBookings={existingBookings}
            layout={layout}
            dateContainerRef={layout === 'mobile' ? dateContainerRef : undefined}
            onMouseDown={layout === 'mobile' ? handleMouseDown : undefined}
            onMouseLeave={layout === 'mobile' ? handleMouseLeave : undefined}
            onMouseUp={layout === 'mobile' ? handleMouseUp : undefined}
            onMouseMove={layout === 'mobile' ? handleMouseMove : undefined}
          />
        </motion.div>
      )}
      {step === 4 && (
        <motion.div
          key={`${layout[0]}4`}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: layout === 'desktop' ? 0.28 : 0.25, ease: 'easeInOut' }}
          className={layout === 'mobile' ? '' : 'flex-1'}
        >
          <ReviewStep
            userName={userInfo.name}
            userPhone={userInfo.phone}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            selectedServices={selectedServices}
            totalPrice={totalPrice}
            layout={layout}
            coupon={coupon}
            couponLoading={couponLoading}
            couponError={couponError}
            originalPrice={originalPrice}
            onCouponValidate={onCouponValidate}
            onCouponRemove={onCouponRemove}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Desktop Layout */}
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
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                  Resumo
                </p>
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

            {step < 5 && (
              <div
                className="flex items-center gap-3"
                role="list"
                aria-label="Progresso do agendamento"
              >
                {[1, 2, 3, 4].map((s, i) => (
                  <Fragment key={s}>
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
                              : 'bg-white/[0.04] text-zinc-500'
                        }`}
                      >
                        {step > s ? '✓' : s}
                      </span>
                      <span className="hidden xl:inline text-zinc-400">
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
                  </Fragment>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-14 pt-10 pb-6 flex flex-col">
            {renderSteps('desktop')}

            {step < 5 && (
              <div className={`flex justify-end ${step === 3 || step === 4 ? 'pt-2' : 'pt-6'}`}>
                <button
                  onClick={goNext}
                  disabled={isStepDisabled}
                  data-testid={step === 4 ? 'confirm-booking' : 'next-step'}
                  aria-label={
                    step === 4
                      ? 'Confirmar e concluir agendamento'
                      : 'Continuar para a próxima etapa'
                  }
                  className={`h-11 px-8 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                    !isStepDisabled
                      ? 'bg-[#C5A059] text-black hover:bg-[#A68233] active:scale-95'
                      : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting
                    ? 'CONFIRMANDO...'
                    : step === 4
                      ? 'Confirmar Agendamento'
                      : 'Continuar'}
                </button>
              </div>
            )}

            {step === 5 && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <SuccessStep
                  clientName={userInfo.name}
                  layout="desktop"
                  isOffline={isOfflineBooking}
                  nextMilestone={nextMilestone}
                />
              </motion.div>
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
              &copy; {new Date().getFullYear()} Black Diamond. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen bg-[#050505] flex flex-col text-white font-sans relative pb-28 overflow-x-hidden">
        <header className="px-5 pt-5 pb-4 shrink-0 border-b border-white/[0.04] bg-[#050505] sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (step > 1 ? goBack() : navigate('/'))}
              aria-label="Voltar"
              className="text-zinc-500 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-white">{stepTitle}</h1>
            </div>
          </div>
          <div className="relative flex justify-between items-center w-full mt-4 px-4 pb-1 select-none">
            <div className="absolute left-0 right-0 -mx-9 top-[28px] h-[1px] bg-white/10 z-0" />
            <div
              className="absolute left-0 -ml-9 top-[28px] h-[1px] bg-[#C5A059] transition-all duration-500 z-0"
              style={{
                width:
                  step === 1
                    ? '40px'
                    : step === 2
                      ? 'calc(33.33% + 13.33px)'
                      : step === 3
                        ? 'calc(66.66% - 13.33px)'
                        : 'calc(100% + 72px)',
              }}
            />
            {[1, 2, 3, 4].map((s) => {
              const Icon = stepIcons[s - 1];
              const isCompleted = step > s;
              const isActive = step === s;
              return (
                <div
                  key={`m-step-${s}`}
                  className="flex flex-col items-center relative z-10 w-12"
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div className="h-5 flex items-center justify-center mb-1">
                    <Icon
                      size={13}
                      className={
                        isActive
                          ? 'text-[#C5A059]'
                          : isCompleted
                            ? 'text-[#C5A059]/80'
                            : 'text-zinc-600'
                      }
                    />
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full border transition-all duration-500 ${
                      isActive
                        ? 'bg-[#C5A059] border-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.5)]'
                        : isCompleted
                          ? 'bg-[#C5A059] border-[#C5A059]'
                          : 'bg-[#050505] border-white/20'
                    }`}
                  />
                  <span
                    className={`text-[9px] font-bold mt-1.5 transition-colors duration-500 tracking-wider text-center ${
                      isActive ? 'text-[#C5A059]' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    {stepLabels[s - 1]}
                  </span>
                </div>
              );
            })}
          </div>
        </header>

        <div className="flex-1 px-5 pt-5 pb-12 flex flex-col justify-start">
          {renderSteps('mobile')}
        </div>

        {step < 5 && (
          <div
            className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-[100] border-t border-white/[0.03] backdrop-blur-md"
            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <button
              onClick={goNext}
              disabled={isStepDisabled}
              data-testid={step < 4 ? 'next-step' : 'confirm-booking'}
              aria-label={
                step < 4 ? 'Continuar para a próxima etapa' : 'Confirmar e concluir agendamento'
              }
              className={`w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                isStepDisabled
                  ? 'bg-[#0a0a0a] border border-white/[0.04] text-zinc-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#C5A059] to-[#b8923f] text-black hover:brightness-110 active:scale-[0.98] shadow-lg shadow-[#C5A059]/20 hover:shadow-xl hover:shadow-[#C5A059]/30'
              }`}
            >
              {isSubmitting ? 'CONFIRMANDO...' : step < 4 ? 'Continuar' : 'Confirmar Agendamento'}
            </button>
          </div>
        )}

        {step === 5 && (
          <SuccessStep
            clientName={userInfo.name}
            layout="mobile"
            isOffline={isOfflineBooking}
            nextMilestone={nextMilestone}
          />
        )}
      </div>
    </>
  );
};

export default BookingPageView;
