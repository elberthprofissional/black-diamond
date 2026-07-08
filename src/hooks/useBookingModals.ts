import { useState } from 'react';
import { updateBookingStatus, deleteBooking } from '../lib/api';
import { useToast } from './useToast';
import { useAuditLog } from './useAuditLog';
import { getErrorMessage } from '../lib/utils';
import type { BookingWithClient } from '../types';

export function useBookingModals(loadData: () => Promise<void>) {
  const { toast, showSuccess, showError } = useToast();
  const { logBooking } = useAuditLog();
  const [completingBooking, setCompletingBooking] = useState<BookingWithClient | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithClient | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<BookingWithClient | null>(null);
  const [thankYouBooking, setThankYouBooking] = useState<BookingWithClient | null>(null);

  const handleComplete = async () => {
    if (!completingBooking) return;
    try {
      await updateBookingStatus(completingBooking.id, 'completed');
      logBooking('booking_completed', completingBooking.id, {
        client_name: completingBooking.clients?.name,
        services: completingBooking.service_ids,
      });
      const completed = completingBooking;
      setCompletingBooking(null);
      loadData();
      // Show thank you modal instead of just a toast
      setThankYouBooking(completed);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  const handleSendThankYou = () => {
    if (!thankYouBooking) return;

    const phone = thankYouBooking.clients?.phone;
    if (!phone) {
      showError('Cliente não tem WhatsApp cadastrado');
      setThankYouBooking(null);
      return;
    }

    const clientName = thankYouBooking.clients?.name || 'Cliente';
    const firstName = clientName.split(' ')[0];

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const message = `Oi ${firstName}! Obrigado por cortar com a gente no Black Diamond 💈❤️\n\nSe precisar de algo, é só chamar! Até a próxima!`;

    setThankYouBooking(null);
    showSuccess('Agradecimento enviado! ✅');

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCancelThankYou = () => {
    setThankYouBooking(null);
    showSuccess('Atendimento concluído!');
  };

  const confirmDelete = async () => {
    const id = bookingToDelete?.id;
    if (!id) return;
    const clientName = bookingToDelete?.clients?.name;
    const bookingDate = bookingToDelete?.booking_date;
    const bookingTime = bookingToDelete?.booking_time;
    try {
      await deleteBooking(id);
      logBooking('booking_cancelled', id, {
        client_name: clientName,
        date: bookingDate,
        time: bookingTime,
      });
      setBookingToDelete(null);
      setSelectedBooking(null);
      await loadData();
      showSuccess('Agendamento excluído!');
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  return {
    toast,
    showSuccess,
    showError,
    completingBooking,
    setCompletingBooking,
    selectedBooking,
    setSelectedBooking,
    bookingToDelete,
    setBookingToDelete,
    thankYouBooking,
    setThankYouBooking,
    handleComplete,
    handleSendThankYou,
    handleCancelThankYou,
    confirmDelete,
  };
}
