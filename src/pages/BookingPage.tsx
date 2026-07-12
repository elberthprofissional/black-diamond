import { type FC } from 'react';
import { useToast } from '../hooks/useToast';
import { useBookingWizard } from '../hooks/useBookingWizard';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import BookingPageView from '../components/Booking/BookingPageView';

const BookingPage: FC = () => {
  const { toast, showError, showSuccess } = useToast();
  const w = useBookingWizard(showError, showSuccess);

  return (
    <div className="font-sans relative min-h-screen bg-[#050505] flex flex-col selection:bg-[#C5A059] selection:text-black overflow-x-hidden">
      <main id="main-content" className="flex-1 relative z-10 h-full flex flex-col">
        <BookingPageView
          step={w.step}
          stepTitle={w.stepTitle}
          services={w.services}
          selectedServices={w.selectedServices}
          selectedDate={w.selectedDate}
          selectedTime={w.selectedTime}
          userInfo={w.userInfo}
          totalPrice={w.totalPrice}
          isStepDisabled={w.isStepDisabled}
          isSubmitting={w.isSubmitting}
          availableSlots={w.availableSlots}
          existingBookings={w.existingBookings}
          dateContainerRef={w.dateContainerRef}
          handleMouseDown={w.handleMouseDown}
          handleMouseLeave={w.handleMouseLeave}
          handleMouseUp={w.handleMouseUp}
          handleMouseMove={w.handleMouseMove}
          toggleService={w.toggleService}
          setSelectedDate={w.setSelectedDate}
          setSelectedTime={w.setSelectedTime}
          setUserInfo={w.setUserInfo}
          goNext={w.goNext}
          goBack={w.goBack}
          navigate={w.navigate}
          nextDays={w.nextDays}
          isMensalista={w.isMensalista}
          planName={w.currentPlan?.name}
          clientLookupLoading={w.clientLookupLoading}
          token={w.token}
          manageUrl={w.manageUrl}
          lastBooking={w.lastBooking}
          onApplyLastBooking={w.applyLastBooking}
          coupon={w.coupon}
          couponLoading={w.couponLoading}
          couponError={w.couponError}
          originalPrice={w.originalPrice}
          onCouponValidate={w.onCouponValidate}
          onCouponRemove={w.onCouponRemove}
          nextMilestone={w.nextMilestone}
        />
      </main>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default BookingPage;
