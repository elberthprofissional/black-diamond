import { useState, useEffect } from 'react';
import { getBookings, deleteBooking, createBooking } from '../lib/api';
import type { Booking, BookingWithClient, Service } from '../types';

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
  const [isSaving, setIsSaving] = useState(false);
  const [rescheduleStep, setRescheduleStep] = useState(1);

  useEffect(() => {
    if (!isRescheduling || !rescheduleDate) return;
    let active = true;
    setLoadingSlots(true);
    getBookings(rescheduleDate)
      .then((data) => {
        if (active) setExistingBookings(data || []);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleDate, isRescheduling]);

  const startReschedule = () => {
    if (!selectedBooking) return;
    const initialServices = services.filter((s) => selectedBooking.service_ids?.includes(s.id));
    setRescheduleServices(initialServices);
    setRescheduleDate(selectedBooking.booking_date);
    setRescheduleTime(selectedBooking.booking_time.slice(0, 5));
    setRescheduleStep(1);
    setIsRescheduling(true);
  };

  const confirmReschedule = async () => {
    if (!selectedBooking || rescheduleServices.length === 0 || !rescheduleDate || !rescheduleTime) {
      return;
    }
    setIsSaving(true);
    try {
      const totalPrice = rescheduleServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
      const totalDuration = rescheduleServices.reduce((sum, s) => sum + (s.duration || 0), 0);
      await createBooking(
        {
          service_ids: rescheduleServices.map((s) => s.id),
          booking_date: rescheduleDate,
          booking_time: rescheduleTime,
          total_price: totalPrice,
          total_duration: totalDuration,
        },
        {
          name: selectedBooking.clients?.name || '',
          phone: selectedBooking.clients?.phone || '',
        }
      );
      await deleteBooking(selectedBooking.id);
      setIsRescheduling(false);
      onDone();
      onSuccess();
    } catch {
      showError('Erro ao reagendar.');
    } finally {
      setIsSaving(false);
    }
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
    isSaving,
    rescheduleStep,
    setRescheduleStep,
    startReschedule,
    confirmReschedule,
    cancelReschedule,
  };
}
