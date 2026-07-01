import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from 'lucide-react';
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
    isMensalista: w.isMensalista,
    clientLookupLoading: w.clientLookupLoading,
  };

  return (
    <div className="font-sans relative min-h-screen bg-[#050505] flex flex-col selection:bg-[#C5A059] selection:text-black overflow-x-hidden">
      <main className="flex-1 relative z-10 h-full flex flex-col">
        <BookingPageDesktop {...sharedProps} />
        <BookingPageMobile {...sharedProps} navigate={w.navigate} />
      </main>

      {/* Calendar Reminder Modal */}
      <AnimatePresence>
        {w.showCalendarModal && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => w.handleCalendarChoice(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative z-10 w-full sm:max-w-[320px] bg-[#1C1C1E] sm:rounded-2xl rounded-t-2xl overflow-hidden"
            >
              <div className="px-6 pt-6 pb-2 text-center">
                <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 flex items-center justify-center mx-auto mb-4">
                  <Calendar size={20} className="text-[#C5A059]" />
                </div>
                <p className="text-[15px] font-semibold text-white">Receber lembrete?</p>
                <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                  Ative e receba uma notificação antes do seu horário.
                </p>
              </div>

              <div className="flex border-t border-white/[0.06] mt-4">
                <button
                  onClick={() => w.handleCalendarChoice(false)}
                  className="flex-1 py-4 text-[13px] font-medium text-zinc-400 hover:text-white active:bg-white/[0.03] transition-all cursor-pointer"
                >
                  Não
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  onClick={() => w.handleCalendarChoice(true)}
                  className="flex-1 py-4 text-[13px] font-semibold text-[#C5A059] hover:text-[#A68233] active:bg-white/[0.03] transition-all cursor-pointer"
                >
                  Sim
                </button>
              </div>

              <div className="sm:hidden flex justify-center pb-3 pt-1">
                <div className="w-10 h-1 rounded-full bg-white/10" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default BookingPage;
