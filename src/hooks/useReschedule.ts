import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getBookings, deleteBooking, createBooking } from '../lib/api';
import { useAuditLog } from './useAuditLog';
import { fireAndForget } from '../lib/fire-and-forget';
import { createNotification } from '../lib/api/notifications';
import type { Booking, BookingWithClient, Service } from '../types';
import { logError } from '../lib/logger';

export function useReschedule(
  selectedBooking: BookingWithClient | null,
  services: Service[],
  onSuccess: () => void,
  onDone: () => void,
  showError: (msg: string) => void
) {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleServices, setRescheduleServices] = useState<Service[]>([]);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduleStep, setRescheduleStep] = useState(1);
  const { logBooking } = useAuditLog();

  // Carrega bookings existentes quando a data muda
  useEffect(() => {
    if (!isRescheduling || !rescheduleDate) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingSlots(true);
    // Só os bookings do MESMO barbeiro (ou bloqueios globais) aparecem ocupados
    getBookings(rescheduleDate, { barberId: selectedBooking?.barber_id || undefined })
      .then((result) => {
        if (active) setExistingBookings(result.data || []);
      })
      .catch(() => {
        showError('Erro ao carregar horários.');
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [rescheduleDate, isRescheduling, selectedBooking?.barber_id, showError]);

  // Mutation para confirmar o reagendamento
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (
        !selectedBooking ||
        rescheduleServices.length === 0 ||
        !rescheduleDate ||
        !rescheduleTime
      ) {
        throw new Error('Dados incompletos para reagendamento.');
      }

      const totalPrice = rescheduleServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
      const totalDuration = rescheduleServices.reduce((sum, s) => sum + (s.duration || 0), 0);

      // Cria novo booking PRIMEIRO (se falhar, o antigo ainda existe)
      await createBooking(
        {
          service_ids: rescheduleServices.map((s) => s.id),
          booking_date: rescheduleDate,
          booking_time: rescheduleTime,
          total_price: totalPrice,
          total_duration: totalDuration,
          // Mantém o mesmo barbeiro no reagendamento
          barber_id: selectedBooking.barber_id || undefined,
        },
        {
          name: selectedBooking.clients?.name || '',
          phone: selectedBooking.clients?.phone || '',
        }
      );

      // Cancela o booking antigo
      await deleteBooking(selectedBooking.id);

      // Retorna dados para o onSuccess
      return {
        clientName: selectedBooking.clients?.name || 'Cliente',
        bookingId: selectedBooking.id,
        oldDate: selectedBooking.booking_date,
        oldTime: selectedBooking.booking_time,
        newDate: rescheduleDate,
        newTime: rescheduleTime,
      };
    },
    onSuccess: (result) => {
      // Cria notificação de reagendamento (fire-and-forget)
      fireAndForget(
        createNotification({
          title: 'Agendamento Reagendado',
          body: `${result.clientName} — agora em ${result.newDate} às ${result.newTime?.slice(0, 5)}`,
          tag: `booking-rescheduled-${result.bookingId}`,
          url: '/admin',
        }),
        { context: 'useReschedule/createNotification' }
      );

      // Audit log
      logBooking('booking_rescheduled', result.bookingId, {
        client_name: result.clientName,
        old_date: result.oldDate,
        old_time: result.oldTime,
        new_date: result.newDate,
        new_time: result.newTime,
      });

      setIsRescheduling(false);
      onDone();
      onSuccess();
    },
    onError: (e) => {
      logError(e);
      showError('Erro ao reagendar.');
    },
  });

  const startReschedule = () => {
    if (!selectedBooking) return;
    const initialServices = services.filter((s) => selectedBooking.service_ids?.includes(s.id));
    setRescheduleServices(initialServices);
    setRescheduleDate(selectedBooking.booking_date);
    setRescheduleTime(selectedBooking.booking_time.slice(0, 5));
    setRescheduleStep(1);
    setLoadingSlots(true);
    setIsRescheduling(true);
  };

  const confirmReschedule = async () => {
    await confirmMutation.mutateAsync();
  };

  const cancelReschedule = () => {
    setIsRescheduling(false);
    setRescheduleStep(1);
    setRescheduleServices([]);
    setRescheduleDate('');
    setRescheduleTime('');
  };

  return {
    isRescheduling,
    rescheduleServices,
    setRescheduleServices,
    rescheduleDate,
    setRescheduleDate,
    rescheduleTime,
    setRescheduleTime,
    existingBookings,
    loadingSlots,
    isSaving: confirmMutation.isPending,
    rescheduleStep,
    setRescheduleStep,
    startReschedule,
    confirmReschedule,
    cancelReschedule,
  };
}
