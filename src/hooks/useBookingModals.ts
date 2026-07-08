import { useState } from 'react';
import { updateBookingStatus, deleteBooking } from '../lib/api';
import { useToast } from './useToast';
import { useAuditLog } from './useAuditLog';
import { getErrorMessage } from '../lib/utils';
import type { BookingWithClient, Service } from '../types';

export function useBookingModals(loadData: () => Promise<void>, services: Service[] = []) {
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
      setThankYouBooking(completed);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  const getThankYouMessage = (booking: BookingWithClient): string => {
    const clientName = booking.clients?.name || 'Cliente';
    const firstName = clientName.split(' ')[0];

    const serviceNames = (booking.service_ids || [])
      .map((id) => services.find((s) => s.id === id)?.name)
      .filter(Boolean);
    const serviceText = serviceNames.length > 0 ? serviceNames.join(' + ') : 'seu serviço';

    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const reviewUrl = `${siteUrl}/avaliar/${booking.id}`;

    return `Oi ${firstName}! Obrigado por cortar com a gente no Black Diamond 💈❤️\n\nServico: ${serviceText}\n\nDeixa sua avaliacao aqui, leva 30 segundos:\n${reviewUrl}\n\nAte a proxima! 🏆`;
  };

  const handleSendThankYou = () => {
    if (!thankYouBooking) return;

    const phone = thankYouBooking.clients?.phone;
    if (!phone) {
      showError('Cliente nao tem WhatsApp cadastrado');
      setThankYouBooking(null);
      return;
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const message = getThankYouMessage(thankYouBooking);

    logBooking('thank_you_sent', thankYouBooking.id, {
      client_name: thankYouBooking.clients?.name,
    });

    setThankYouBooking(null);
    showSuccess('Agradecimento enviado!');

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
