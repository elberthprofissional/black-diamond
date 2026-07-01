import { useState } from 'react';
import { updateBookingStatus, deleteBooking } from '../lib/api';
import { useToast } from './useToast';
import { getErrorMessage } from '../lib/utils';
import type { BookingWithClient } from '../types';

export function useBookingModals(loadData: () => Promise<void>) {
  const { toast, showSuccess, showError } = useToast();
  const [completingBooking, setCompletingBooking] = useState<BookingWithClient | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithClient | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<BookingWithClient | null>(null);

  const handleComplete = async () => {
    if (!completingBooking) return;
    try {
      await updateBookingStatus(completingBooking.id, 'completed');
      setCompletingBooking(null);
      loadData();
      showSuccess('Atendimento concluído!');
    } catch (error) {
      showError(getErrorMessage(error));
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
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  return {
    toast, showSuccess, showError,
    completingBooking, setCompletingBooking,
    selectedBooking, setSelectedBooking,
    bookingToDelete, setBookingToDelete,
    handleComplete,
    confirmDelete,
  };
}
