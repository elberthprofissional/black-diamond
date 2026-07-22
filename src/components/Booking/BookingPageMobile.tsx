import { memo, type RefObject, type MouseEvent, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DataStep from './DataStep';
import BarberStep from './BarberStep';
import ServiceStep from './ServiceStep';
import DateTimeStep from './DateTimeStep';
import ReviewStep from './ReviewStep';
import SuccessStep from './SuccessStep';
import SkeletonBooking from './SkeletonBooking';
import BookingMobileProgress from './BookingMobileProgress';
import type { Service, Barber } from '../../types';

interface BookingPageMobileProps {
  step: number;
  stepTitle: string;
  services: Service[];
  selectedServices: Service[];
  selectedDate: string;
  selectedTime: string;
  userInfo: { name: string; phone: string };
  selectedBarber: Barber | null;
  onSelectBarber: (barber: Barber) => void;
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

const stepAnimation = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.3, ease: 'easeInOut' as const },
};

const BookingPageMobile: FC<BookingPageMobileProps> = memo(
  ({
    step,
    stepTitle,
    services,
    selectedServices,
    selectedDate,
    selectedTime,
    userInfo,
    selectedBarber,
    onSelectBarber,
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
  }) => (
    <div className="min-h-screen bg-[#050505] flex flex-col text-white font-sans relative pb-28 overflow-x-hidden">
      <BookingMobileProgress
        step={step}
        stepTitle={stepTitle}
        onBack={() => (step > 1 ? goBack() : navigate('/'))}
      />

      <div className="flex-1 px-5 pt-5 pb-12 flex flex-col justify-start">
        {servicesLoading && (
          <div className="w-full">
            <SkeletonBooking layout="mobile" />
          </div>
        )}

        {!servicesLoading && (
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="m1"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-5 w-full"
              >
                <DataStep
                  name={userInfo.name}
                  phone={userInfo.phone}
                  onNameChange={(v) => setUserInfo({ ...userInfo, name: v })}
                  onPhoneChange={(v) => setUserInfo({ ...userInfo, phone: v })}
                  layout="mobile"
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
              <motion.div key="m2" {...stepAnimation} className="space-y-5 w-full">
                <BarberStep
                  selectedBarber={selectedBarber}
                  onSelectBarber={onSelectBarber}
                  layout="mobile"
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="m3" {...stepAnimation} className="space-y-5 w-full">
                <ServiceStep
                  services={services}
                  selectedServices={selectedServices}
                  isMensalista={isMensalista}
                  planName={planName}
                  onToggle={toggleService}
                  onSkip={goNext}
                  layout="mobile"
                  coupon={coupon}
                  originalPrice={originalPrice}
                />
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="m4" {...stepAnimation} className="space-y-5 w-full">
                <DateTimeStep
                  nextDays={nextDays}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSelectDate={setSelectedDate}
                  onSelectTime={setSelectedTime}
                  availableSlots={availableSlots}
                  existingBookings={existingBookings}
                  layout="mobile"
                  dateContainerRef={dateContainerRef}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                />
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="m5"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className=""
              >
                <ReviewStep
                  userName={userInfo.name}
                  userPhone={userInfo.phone}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  selectedServices={selectedServices}
                  totalPrice={totalPrice}
                  layout="mobile"
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
        )}
      </div>

      {step < 6 && (
        <div
          className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-[100] border-t border-white/[0.03] backdrop-blur-md"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={goNext}
            disabled={isStepDisabled}
            data-testid={step < 5 ? 'next-step' : 'confirm-booking'}
            aria-label={
              step < 5 ? 'Continuar para a próxima etapa' : 'Confirmar e concluir agendamento'
            }
            className={`w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer ${
              isStepDisabled
                ? 'bg-[#0a0a0a] border border-white/[0.04] text-zinc-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#D4AF37] to-[#b8923f] text-black hover:brightness-110 active:scale-[0.98] shadow-lg shadow-[#D4AF37]/20 hover:shadow-xl hover:shadow-[#D4AF37]/30'
            }`}
          >
            {isSubmitting ? 'CONFIRMANDO...' : step < 5 ? 'Continuar' : 'Confirmar Agendamento'}
          </button>
        </div>
      )}

      {step === 6 && (
        <SuccessStep
          clientName={userInfo.name}
          layout="mobile"
          isOffline={isOfflineBooking}
          nextMilestone={nextMilestone}
        />
      )}
    </div>
  )
);

BookingPageMobile.displayName = 'BookingPageMobile';

export default BookingPageMobile;
