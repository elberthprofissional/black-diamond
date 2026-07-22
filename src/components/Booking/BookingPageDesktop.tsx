import { memo, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DataStep from './DataStep';
import BarberStep from './BarberStep';
import ServiceStep from './ServiceStep';
import DateTimeStep from './DateTimeStep';
import ReviewStep from './ReviewStep';
import SuccessStep from './SuccessStep';
import SkeletonBooking from './SkeletonBooking';
import BookingDesktopSidebar from './BookingDesktopSidebar';
import BookingDesktopProgress from './BookingDesktopProgress';
import type { Service, Barber } from '../../types';

interface BookingPageDesktopProps {
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
  transition: { duration: 0.28, ease: 'easeInOut' as const },
};

const BookingPageDesktop: FC<BookingPageDesktopProps> = memo(
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
    <div className="min-h-screen bg-[#0E0E0E] text-white">
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
          <AnimatePresence mode="wait">
            {servicesLoading && (
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

            {!servicesLoading && step === 1 && (
              <motion.div key="d1" {...stepAnimation} className="flex-1">
                <DataStep
                  name={userInfo.name}
                  phone={userInfo.phone}
                  onNameChange={(v) => setUserInfo({ ...userInfo, name: v })}
                  onPhoneChange={(v) => setUserInfo({ ...userInfo, phone: v })}
                  layout="desktop"
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
              <motion.div key="d2" {...stepAnimation} className="flex-1">
                <BarberStep
                  selectedBarber={selectedBarber}
                  onSelectBarber={onSelectBarber}
                  layout="desktop"
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="d3" {...stepAnimation} className="flex-1">
                <ServiceStep
                  services={services}
                  selectedServices={selectedServices}
                  isMensalista={isMensalista}
                  planName={planName}
                  onToggle={toggleService}
                  onSkip={goNext}
                  layout="desktop"
                  coupon={coupon}
                  originalPrice={originalPrice}
                />
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="d4" {...stepAnimation} className="flex-1">
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

            {step === 5 && (
              <motion.div
                key="d5"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.28, ease: 'easeInOut' }}
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

          {step < 6 && (
            <div className={`flex justify-end ${step === 4 || step === 5 ? 'pt-2' : 'pt-6'}`}>
              <button
                onClick={goNext}
                disabled={isStepDisabled}
                data-testid={step === 5 ? 'confirm-booking' : 'next-step'}
                aria-label={
                  step === 5 ? 'Confirmar e concluir agendamento' : 'Continuar para a próxima etapa'
                }
                className={`h-11 px-8 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                  !isStepDisabled
                    ? 'bg-[#D4AF37] text-black hover:bg-[#b8962e] active:scale-95'
                    : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                }`}
              >
                {isSubmitting
                  ? 'CONFIRMANDO...'
                  : step === 5
                    ? 'Confirmar Agendamento'
                    : 'Continuar'}
              </button>
            </div>
          )}

          {step === 6 && (
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
  )
);

BookingPageDesktop.displayName = 'BookingPageDesktop';

export default BookingPageDesktop;
