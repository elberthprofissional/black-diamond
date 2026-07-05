import { useBookingModals } from './useBookingModals';
import { useBookingFilters } from './useBookingFilters';
import { useServices } from './useServices';
import { useReschedule } from './useReschedule';

export function useBookingManagement(loadData: () => Promise<void>) {
  const { services } = useServices();
  const { filter, setFilter, isDesktop } = useBookingFilters();
  const {
    toast, showSuccess, showError,
    completingBooking, setCompletingBooking,
    selectedBooking, setSelectedBooking,
    bookingToDelete, setBookingToDelete,
    thankYouBooking,
    handleComplete,
    handleSendThankYou,
    handleCancelThankYou,
    confirmDelete,
  } = useBookingModals(loadData);

  const {
    isRescheduling,
    rescheduleServices, setRescheduleServices,
    rescheduleDate, setRescheduleDate,
    rescheduleTime, setRescheduleTime,
    existingBookings: existingBookingsForReschedule,
    loadingSlots,
    isSaving: isSavingReschedule,
    rescheduleStep, setRescheduleStep,
    startReschedule: handleStartReschedule,
    confirmReschedule: handleConfirmRescheduleRaw,
    cancelReschedule,
  } = useReschedule(
    selectedBooking,
    services,
    () => { showSuccess('Agendamento reagendado com sucesso!'); loadData(); },
    () => { setSelectedBooking(null); },
    showError
  );

  const handleConfirmReschedule = async () => {
    await handleConfirmRescheduleRaw();
  };

  return {
    services,
    toast, showSuccess, showError,
    completingBooking, setCompletingBooking,
    selectedBooking, setSelectedBooking,
    bookingToDelete, setBookingToDelete,
    thankYouBooking,
    filter, setFilter,
    isDesktop,
    isRescheduling,
    rescheduleServices, setRescheduleServices,
    rescheduleDate, setRescheduleDate,
    rescheduleTime, setRescheduleTime,
    existingBookingsForReschedule,
    loadingSlots,
    isSavingReschedule,
    rescheduleStep, setRescheduleStep,
    handleStartReschedule,
    handleConfirmReschedule,
    cancelReschedule,
    handleComplete,
    handleSendThankYou,
    handleCancelThankYou,
    confirmDelete,
  };
}
