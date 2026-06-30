import React from 'react';
import { useToast } from '../hooks/useToast';
import { useBookingWizard } from '../hooks/useBookingWizard';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import BookingPageDesktop from '../components/Booking/BookingPageDesktop';
import BookingPageMobile from '../components/Booking/BookingPageMobile';

const BookingPage: React.FC = () => {
  const { toast, showError } = useToast();
  const w = useBookingWizard(showError);

  const sharedProps = {
    step: w.step,
    stepTitle: w.stepTitle,
    services: w.services,
    selectedServices: w.selectedServices,
    selectedDate: w.selectedDate,
    selectedTime: w.selectedTime,
    userInfo: w.userInfo,
    totalPrice: w.totalPrice,
    isStepDisabled: w.isStepDisabled,
    isSubmitting: w.isSubmitting,
    availableSlots: w.availableSlots,
    existingBookings: w.existingBookings,
    dateContainerRef: w.dateContainerRef,
    handleMouseDown: w.handleMouseDown,
    handleMouseLeave: w.handleMouseLeave,
    handleMouseUp: w.handleMouseUp,
    handleMouseMove: w.handleMouseMove,
    toggleService: w.toggleService,
    setSelectedDate: w.setSelectedDate,
    setSelectedTime: w.setSelectedTime,
    setUserInfo: w.setUserInfo,
    goNext: w.goNext,
    goBack: w.goBack,
    nextDays: w.nextDays,
  };

  return (
    <div className="font-sans relative min-h-screen bg-[#050505] flex flex-col selection:bg-[#C5A059] selection:text-black overflow-x-hidden">
      <main className="flex-1 relative z-10 h-full flex flex-col">
        <BookingPageDesktop {...sharedProps} />
        <BookingPageMobile {...sharedProps} navigate={w.navigate} />
      </main>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default BookingPage;
