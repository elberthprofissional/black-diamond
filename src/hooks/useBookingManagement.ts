import { useState, useEffect } from 'react';
import { updateBookingStatus, deleteBooking } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useServices } from '../hooks/useServices';
import { useReschedule } from '../hooks/useReschedule';
import type { BookingWithClient } from '../types';

export function useBookingManagement(loadData: () => Promise<void>) {
  const { services } = useServices();
  const { toast, showSuccess, showError } = useToast();
  const [completingBooking, setCompletingBooking] = useState<BookingWithClient | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithClient | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<BookingWithClient | null>(null);
  const [filter, setFilter] = useState<'occupied' | 'free' | 'blocked'>('occupied');

  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  const handleComplete = async () => {
    if (!completingBooking) return;
    try {
      await updateBookingStatus(completingBooking.id, 'completed');
      setCompletingBooking(null);
      loadData();
      showSuccess('Atendimento concluído!');
    } catch {
      showError('Erro ao finalizar agendamento.');
    }
  };

  const confirmDelete = async () => {
    const id = bookingToDelete?.id;
    if (!id) return;
    setBookingToDelete(null);
    setSelectedBooking(null);
    try {
      await deleteBooking(id);
      await loadData();
      showSuccess('Agendamento excluído!');
    } catch {
      showError('Erro ao excluir.');
    }
  };

  return {
    services,
    toast, showSuccess, showError,
    completingBooking, setCompletingBooking,
    selectedBooking, setSelectedBooking,
    bookingToDelete, setBookingToDelete,
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
    confirmDelete,
  };
}
