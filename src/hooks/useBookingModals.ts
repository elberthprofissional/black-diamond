import { useState } from 'react';
import { updateBookingStatus } from '../lib/api';
import { incrementVisit } from '../lib/api/loyalty';
import { useToast } from './useToast';
import { useAuditLog } from './useAuditLog';
import { getErrorMessage } from '../lib/utils';
import { supabase } from '../lib/supabase';
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

      // Incrementa fidelidade (visitas acumulativas, checa milestones)
      if (completingBooking.client_id) {
        incrementVisit(completingBooking.client_id).catch(() => {
          // Falha ao incrementar fidelidade — não crítica, o booking já foi concluído
        });
      }

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

    return `Oi ${firstName}! Obrigado por cortar com a gente no Black Diamond 💈❤️\n\nServico: ${serviceText}\n\nAte a proxima! 🏆`;
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
      await updateBookingStatus(id, 'cancelled');
      logBooking('booking_cancelled', id, {
        client_name: clientName,
        date: bookingDate,
        time: bookingTime,
      });

      // Close panel + refresh dashboard immediately
      setBookingToDelete(null);
      setSelectedBooking(null);
      await loadData();

      // Fire-and-forget: create notification (don't block UI)
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: 'Agendamento Cancelado',
            body: `${clientName || 'Cliente'} — ${bookingDate} às ${bookingTime?.slice(0, 5)}`,
            tag: `booking-cancelled-${id}`,
            url: '/admin',
          })
          .then(
            () => {},
            () => {}
          );
      });

      showSuccess('Agendamento cancelado!');
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
