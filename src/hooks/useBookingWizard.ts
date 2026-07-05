import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooking, getAvailableSlots, getBookings } from '../lib/api';
import { getNextDays, formatPhone, fetchTimeSlotsForDate, getErrorMessage } from '../lib/utils';
import { useServices } from './useServices';
import { useWizardStep } from './useWizardStep';
import { useClientLookup } from './useClientLookup';
import { useDateDragScroll } from './useDateDragScroll';
import { supabase } from '../lib/supabase';
import type { Service } from '../types';

import { MENSALISTA_EXCLUDED_SERVICES } from '../lib/constants';

export function useBookingWizard(showError: (msg: string) => void) {
  const allNextDays = useMemo(() => getNextDays(), []);
  const navigate = useNavigate();

  // Step control
  const {
    step,
    setStep,
    isStepDisabled,
    stepTitle,
    goNext: wizardGoNext,
    goBack,
  } = useWizardStep();

  // Services
  const { services } = useServices();
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);

  // Date & time
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // User info
  const [userInfo, setUserInfo] = useState({ name: '', phone: '' });

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Existing bookings & slots
  const [existingBookings, setExistingBookings] = useState<
    { booking_time: string; status: string }[]
  >([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Client lookup & mensalista
  const handleNameFound = useCallback((name: string) => {
    setUserInfo((prev) => ({ ...prev, name }));
  }, []);
  const { isMensalista, clientLookupLoading } = useClientLookup(userInfo.phone, handleNameFound);

  // Drag scroll
  const { dateContainerRef, handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove } =
    useDateDragScroll();

  // Barber settings
  const [barberPhone, setBarberPhone] = useState('');
  const [workingDays, setWorkingDays] = useState<string>('1,2,3,4,5,6');

  // Filter days by working days
  const nextDays = useMemo(() => {
    const enabled = workingDays.split(',').map(Number);
    return allNextDays.filter((d) => {
      const dow = new Date(d.fullDate + 'T12:00:00').getDay();
      return enabled.includes(dow);
    });
  }, [allNextDays, workingDays]);

  // Filter days for mensalista (MON-THU only)
  const filteredNextDays = useMemo(() => {
    if (!isMensalista) return nextDays;
    return nextDays.filter((d) => {
      const date = new Date(d.fullDate + 'T12:00:00');
      const dow = date.getDay();
      return dow >= 1 && dow <= 4;
    });
  }, [nextDays, isMensalista]);

  // Filter services for mensalista
  const filteredServices = useMemo(() => {
    if (!isMensalista) return services;
    return services.filter((s) => !MENSALISTA_EXCLUDED_SERVICES.includes(s.name));
  }, [services, isMensalista]);

  // Reset selected services when mensalista status changes
  useEffect(() => {
    if (isMensalista && selectedServices.length > 0) {
      const allowed = selectedServices.filter(
        (s) => !MENSALISTA_EXCLUDED_SERVICES.includes(s.name)
      );
      if (allowed.length !== selectedServices.length) {
        setSelectedServices(allowed);
      }
    }
  }, [isMensalista, selectedServices]);

  // Fetch working_days and barber phone from database
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['barber_phone', 'working_days']);

        if (data) {
          for (const row of data) {
            if (row.key === 'barber_phone' && row.value) {
              setBarberPhone(row.value);
            } else if (row.key === 'working_days' && row.value) {
              setWorkingDays(row.value);
            }
          }
        }

        if (!data?.find((r) => r.key === 'barber_phone')) {
          setBarberPhone(import.meta.env.VITE_BARBER_WHATSAPP || '');
        }
      } catch {
        setBarberPhone(import.meta.env.VITE_BARBER_WHATSAPP || '');
      }
    };
    fetchSettings();
  }, []);

  // Load bookings & slots when date changes
  useEffect(() => {
    setSelectedTime('');
    if (selectedDate) {
      let active = true;
      const loadData = async () => {
        try {
          const [bookingsData, slotsData] = await Promise.all([
            getBookings(selectedDate).catch(() => []),
            getAvailableSlots(selectedDate).catch(() => fetchTimeSlotsForDate(selectedDate)),
          ]);
          if (!active) return;
          setExistingBookings(bookingsData);
          setAvailableSlots(slotsData);
        } catch {
          if (active) showError('Erro ao carregar dados.');
        }
      };
      loadData();
      return () => {
        active = false;
      };
    }
  }, [selectedDate, showError]);

  const toggleService = useCallback((service: Service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
  }, []);

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price), 0),
    [selectedServices]
  );

  const handleConfirm = useCallback(async () => {
    if (
      isSubmitting ||
      !selectedTime ||
      !userInfo.name ||
      !userInfo.phone ||
      selectedServices.length === 0
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
      await createBooking(
        {
          service_ids: selectedServices.map((s) => s.id),
          booking_date: selectedDate,
          booking_time: selectedTime,
          total_price: totalPrice,
          total_duration: totalDuration,
        },
        { name: userInfo.name, phone: userInfo.phone }
      );

      if (barberPhone) {
        const serviceNames = selectedServices.map((s) => s.name).join(', ');
        const formattedDate = selectedDate.split('-').reverse().join('/');
        const mensalistaTag = isMensalista ? ' [MENSALISTA]' : '';
        const msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━\nBLACK DIAMOND BARBEARIA\nNOVO AGENDAMENTO\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nCliente:\n${userInfo.name.trim()}${mensalistaTag}\n\nServiços:\n${serviceNames
          .split(', ')
          .map((s) => `• ${s}`)
          .join(
            '\n'
          )}\n\nData:\n${formattedDate}\n\nHorário:\n${selectedTime}\n\nValor Total:\nR$ ${totalPrice.toFixed(2).replace('.', ',')}`;
        const waUrl = `https://wa.me/${barberPhone}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
      }

      setStep(5);
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    selectedTime,
    userInfo,
    selectedServices,
    selectedDate,
    totalPrice,
    showError,
    barberPhone,
    isMensalista,
    setStep,
  ]);

  // Wrap wizardGoNext to pass handleConfirm for the last step
  const goNext = useCallback(() => {
    wizardGoNext(handleConfirm);
  }, [wizardGoNext, handleConfirm]);

  const validationInput = useMemo(
    () => ({
      step,
      name: userInfo.name,
      phone: userInfo.phone,
      selectedServices,
      selectedDate,
      selectedTime,
      isSubmitting,
    }),
    [step, userInfo, selectedServices, selectedDate, selectedTime, isSubmitting]
  );

  const disabled = useMemo(
    () => isStepDisabled(validationInput),
    [isStepDisabled, validationInput]
  );

  return {
    step,
    setStep,
    services: filteredServices,
    selectedServices,
    toggleService,
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    userInfo,
    setUserInfo,
    isSubmitting,
    existingBookings,
    availableSlots,
    dateContainerRef,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove,
    totalPrice,
    isStepDisabled: disabled,
    stepTitle,
    handleConfirm,
    goNext,
    goBack,
    navigate,
    nextDays: filteredNextDays,
    formatPhoneValue: formatPhone,
    isMensalista,
    clientLookupLoading,
  };
}
