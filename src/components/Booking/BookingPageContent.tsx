import { memo, useRef, useEffect, type FC } from 'react';
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
import BookingMobileProgress from './BookingMobileProgress';
import { useBookingWizardContext } from '../../hooks/BookingWizardContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';

const stepAnimation = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.28, ease: 'easeInOut' as const },
};

const BookingPageContent: FC = memo(() => {
  const ctx = useBookingWizardContext();
  const isDesktop = useIsDesktop();
  const layout = isDesktop ? ('desktop' as const) : ('mobile' as const);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const renderStepContent = (stepIndex: number) => {
    switch (stepIndex) {
      case 1:
        return (
          <DataStep
            name={ctx.userInfo.name}
            phone={ctx.userInfo.phone}
            onNameChange={(v) => ctx.setUserInfo({ ...ctx.userInfo, name: v })}
            onPhoneChange={(v) => ctx.setUserInfo({ ...ctx.userInfo, phone: v })}
            layout={layout}
            isMensalista={ctx.isMensalista}
            clientLookupLoading={ctx.clientLookupLoading}
            lastBooking={ctx.lastBooking}
            onApplyLastBooking={ctx.onApplyLastBooking}
            serviceNames={Object.fromEntries(ctx.services.map((s) => [s.id, s.name]))}
            coupon={ctx.coupon}
            couponLoading={ctx.couponLoading}
            couponError={ctx.couponError}
            onCouponValidate={ctx.onCouponValidate}
            onCouponRemove={ctx.onCouponRemove}
          />
        );
      case 2:
        return (
          <BarberStep
            selectedBarber={ctx.selectedBarber}
            onSelectBarber={ctx.onSelectBarber}
            layout={layout}
          />
        );
      case 3:
        return (
          <ServiceStep
            services={ctx.services}
            selectedServices={ctx.selectedServices}
            isMensalista={ctx.isMensalista}
            planName={ctx.planName}
            onToggle={ctx.toggleService}
            onSkip={ctx.goNext}
            layout={layout}
            coupon={ctx.coupon}
            originalPrice={ctx.originalPrice}
          />
        );
      case 4:
        return (
          <DateTimeStep
            nextDays={ctx.nextDays}
            selectedDate={ctx.selectedDate}
            selectedTime={ctx.selectedTime}
            onSelectDate={ctx.setSelectedDate}
            onSelectTime={ctx.setSelectedTime}
            availableSlots={ctx.availableSlots}
            existingBookings={ctx.existingBookings}
            layout={layout}
            dateContainerRef={isDesktop ? undefined : ctx.dateContainerRef}
            onMouseDown={isDesktop ? undefined : ctx.handleMouseDown}
            onMouseLeave={isDesktop ? undefined : ctx.handleMouseLeave}
            onMouseUp={isDesktop ? undefined : ctx.handleMouseUp}
            onMouseMove={isDesktop ? undefined : ctx.handleMouseMove}
          />
        );
      case 5:
        return (
          <ReviewStep
            userName={ctx.userInfo.name}
            userPhone={ctx.userInfo.phone}
            selectedDate={ctx.selectedDate}
            selectedTime={ctx.selectedTime}
            selectedServices={ctx.selectedServices}
            totalPrice={ctx.totalPrice}
            layout={layout}
            coupon={ctx.coupon}
            couponLoading={ctx.couponLoading}
            couponError={ctx.couponError}
            originalPrice={ctx.originalPrice}
            onCouponValidate={ctx.onCouponValidate}
            onCouponRemove={ctx.onCouponRemove}
          />
        );
      default:
        return null;
    }
  };

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-[#0E0E0E] text-white">
        <BookingDesktopSidebar
          isMensalista={ctx.isMensalista}
          selectedServices={ctx.selectedServices}
          step={ctx.step}
          selectedDate={ctx.selectedDate}
          selectedTime={ctx.selectedTime}
          totalPrice={ctx.totalPrice}
          planName={ctx.planName}
        />

        <div className="flex-1 flex flex-col">
          <BookingDesktopProgress step={ctx.step} stepTitle={ctx.stepTitle} goBack={ctx.goBack} />

          <div className="flex-1 overflow-y-auto px-14 pt-10 pb-6 flex flex-col">
            <AnimatePresence mode="popLayout">
              {ctx.servicesLoading && (
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

              {!ctx.servicesLoading && ctx.step <= 5 && (
                <motion.div key={`d${ctx.step}`} {...stepAnimation} className="flex-1">
                  {renderStepContent(ctx.step)}
                </motion.div>
              )}
            </AnimatePresence>

            {ctx.step < 6 && (
              <div
                className={`flex justify-end ${ctx.step === 4 || ctx.step === 5 ? 'pt-2' : 'pt-6'}`}
              >
                <button
                  onClick={ctx.goNext}
                  disabled={ctx.isStepDisabled}
                  data-testid={ctx.step === 5 ? 'confirm-booking' : 'next-step'}
                  aria-label={
                    ctx.step === 5
                      ? 'Confirmar e concluir agendamento'
                      : 'Continuar para a próxima etapa'
                  }
                  className={`h-11 px-8 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                    !ctx.isStepDisabled
                      ? 'bg-[#D4AF37] text-black hover:bg-[#b8962e] active:scale-95'
                      : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {ctx.isSubmitting
                    ? 'CONFIRMANDO...'
                    : ctx.step === 5
                      ? 'Confirmar Agendamento'
                      : 'Continuar'}
                </button>
              </div>
            )}

            {ctx.step === 6 && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <SuccessStep
                  clientName={ctx.userInfo.name}
                  layout="desktop"
                  isOffline={ctx.isOfflineBooking}
                  nextMilestone={ctx.nextMilestone}
                />
              </motion.div>
            )}
          </div>

          <div className="px-14 py-5 border-t border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-[0.4em] text-[#D4AF37] uppercase">
                BLACK DIAMOND
              </span>
              <span className="text-[10px] text-zinc-600">Barbearia</span>
            </div>
            <p className="text-[10px] text-zinc-600">
              &copy; {new Date().getFullYear()} Black Diamond. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Mobile layout
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col text-white font-sans relative pb-28 overflow-x-hidden">
      <BookingMobileProgress
        step={ctx.step}
        stepTitle={ctx.stepTitle}
        onBack={() => (ctx.step > 1 ? ctx.goBack() : ctx.navigate('/'))}
      />

      <div className="flex-1 px-5 pt-5 pb-12 flex flex-col justify-start">
        {ctx.servicesLoading && (
          <div className="w-full">
            <SkeletonBooking layout="mobile" />
          </div>
        )}

        {!ctx.servicesLoading && (
          <AnimatePresence mode="popLayout">
            {ctx.step <= 5 && (
              <motion.div
                key={`m${ctx.step}`}
                {...stepAnimation}
                initial={{ opacity: 0, x: ctx.step === 1 ? -40 : 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: ctx.step === 1 ? 40 : -40 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-4 w-full"
              >
                {renderStepContent(ctx.step)}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {ctx.step < 6 && (
        <div
          className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-[100] border-t border-white/[0.03] backdrop-blur-md"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={ctx.goNext}
            disabled={ctx.isStepDisabled}
            data-testid={ctx.step < 5 ? 'next-step' : 'confirm-booking'}
            aria-label={
              ctx.step < 5 ? 'Continuar para a próxima etapa' : 'Confirmar e concluir agendamento'
            }
            className={`w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer ${
              ctx.isStepDisabled
                ? 'bg-[#0a0a0a] border border-white/[0.04] text-zinc-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#D4AF37] to-[#b8923f] text-black hover:brightness-110 active:scale-[0.98] shadow-lg shadow-[#D4AF37]/20 hover:shadow-xl hover:shadow-[#D4AF37]/30'
            }`}
          >
            {ctx.isSubmitting
              ? 'CONFIRMANDO...'
              : ctx.step < 5
                ? 'Continuar'
                : 'Confirmar Agendamento'}
          </button>
        </div>
      )}

      {ctx.step === 6 && (
        <SuccessStep
          clientName={ctx.userInfo.name}
          layout="mobile"
          isOffline={ctx.isOfflineBooking}
          nextMilestone={ctx.nextMilestone}
        />
      )}
    </div>
  );
});

BookingPageContent.displayName = 'BookingPageContent';

export default BookingPageContent;
