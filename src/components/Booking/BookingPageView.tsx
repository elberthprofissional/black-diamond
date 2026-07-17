import { type RefObject, type MouseEvent, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ServiceStep from './ServiceStep';
import DateTimeStep from './DateTimeStep';
import DataStep from './DataStep';
import ReviewStep from './ReviewStep';
import SuccessStep from './SuccessStep';
import SkeletonBooking from './SkeletonBooking';
import BookingDesktopSidebar from './BookingDesktopSidebar';
import BookingDesktopProgress from './BookingDesktopProgress';
import BookingMobileProgress from './BookingMobileProgress';
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
            lastBooking={lastBooking}
            onApplyLastBooking={onApplyLastBooking}
            serviceNames={Object.fromEntries(services.map((s) => [s.id, s.name]))}
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
        <BookingDesktopSidebar
          isMensalista={isMensalista}
          selectedServices={selectedServices}
          step={step}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          totalPrice={totalPrice}
          planName={planName}
        />

        <div className="flex-1 flex flex-col">
          <BookingDesktopProgress step={step} stepTitle={stepTitle} goBack={goBack} />

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
                      ? 'bg-[#D4AF37] text-black hover:bg-[#b8962e] active:scale-95'
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
              <span className="text-[9px] font-black tracking-[0.4em] text-[#D4AF37] uppercase">
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
        <BookingMobileProgress
          step={step}
          stepTitle={stepTitle}
          onBack={() => (step > 1 ? goBack() : navigate('/'))}
        />

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
                  : 'bg-gradient-to-r from-[#D4AF37] to-[#b8923f] text-black hover:brightness-110 active:scale-[0.98] shadow-lg shadow-[#D4AF37]/20 hover:shadow-xl hover:shadow-[#D4AF37]/30'
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
