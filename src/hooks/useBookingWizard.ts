import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooking, getAvailableSlots, getBookings } from '../lib/api';
import { getNextDays, formatPhone, getTimeSlotsForDate, getErrorMessage, generateIcsFile } from '../lib/utils';
import { useServices } from './useServices';
import type { Service } from '../types';

export function useBookingWizard(showError: (msg: string) => void) {
  const nextDays = useMemo(() => getNextDays(), []);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { services } = useServices();
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [userInfo, setUserInfo] = useState({ name: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<{ booking_time: string; status: string }[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const dateContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = dateContainerRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
  }, []);

  const handleMouseLeave = useCallback(() => setIsDragging(false), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = dateContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  useEffect(() => {
    setSelectedTime('');
    if (selectedDate) {
      const loadData = async () => {
        try {
          const [bookingsData, slotsData] = await Promise.all([
            getBookings(selectedDate).catch(() => []),
            getAvailableSlots(selectedDate).catch(() => getTimeSlotsForDate(selectedDate))
          ]);
          setExistingBookings(bookingsData);
          setAvailableSlots(slotsData);
        } catch {
          showError('Erro ao carregar dados.');
        }
      };
      loadData();
    }
  }, [selectedDate, showError]);

  const toggleService = useCallback((service: Service) => {
    setSelectedServices(prev =>
      prev.find(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    );
  }, []);

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price), 0),
    [selectedServices]
  );

  const isStepDisabled = useMemo(() => {
    if (step === 1) return selectedServices.length === 0;
    if (step === 2) return !selectedDate || !selectedTime;
    if (step === 3) return !userInfo.name.trim() || userInfo.name.trim().length < 3 || userInfo.phone.replace(/\D/g, '').length < 11;
    if (step === 4) return isSubmitting;
    return false;
  }, [step, selectedServices, selectedDate, selectedTime, userInfo, isSubmitting]);

  const stepTitle = step === 1 ? 'Escolha os serviços' : step === 2 ? 'Data e horário' : step === 3 ? 'Seus dados' : 'Revisar agendamento';

  const handleConfirm = useCallback(async () => {
    if (isSubmitting || !selectedTime || !userInfo.name || !userInfo.phone || selectedServices.length === 0) return;
    setIsSubmitting(true);
    try {
      const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
      await createBooking(
        {
          service_ids: selectedServices.map(s => s.id),
          booking_date: selectedDate,
          booking_time: selectedTime,
          total_price: totalPrice,
          total_duration: totalDuration
        },
        { name: userInfo.name, phone: userInfo.phone }
      );

      setShowCalendarModal(true);
    } catch (error) {
      showError(getErrorMessage(error));
    } finally { setIsSubmitting(false); }
  }, [isSubmitting, selectedTime, userInfo, selectedServices, selectedDate, totalPrice, showError]);

  const barberPhone = import.meta.env.VITE_BARBER_WHATSAPP || '';

  const handleCalendarChoice = useCallback((wantsReminder: boolean) => {
    if (wantsReminder) {
      const serviceNames = selectedServices.map(s => s.name).join(' + ');
      const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
      generateIcsFile(serviceNames, selectedDate, selectedTime, totalDuration);
    }
    setShowCalendarModal(false);

    if (barberPhone) {
      const serviceNames = selectedServices.map(s => s.name).join(', ');
      const formattedDate = selectedDate.split('-').reverse().join('/');
      const message = `*NOVO AGENDAMENTO - BLACK DIAMOND*\n\n*Cliente:* ${userInfo.name.trim()}\n*Servico:* ${serviceNames}\n*Data:* ${formattedDate}\n*Horario:* ${selectedTime}\n*Valor:* R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
      const url = `https://wa.me/${barberPhone}?text=${encodeURIComponent(message)}`;
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setStep(5);
  }, [selectedServices, selectedDate, selectedTime, userInfo, totalPrice, barberPhone]);

  const goNext = useCallback(() => {
    if (step < 4) setStep(step + 1);
    else handleConfirm();
  }, [step, handleConfirm]);

  const goBack = useCallback(() => {
    if (step > 1) setStep(step - 1);
  }, [step]);

  const formatPhoneValue = useCallback((v: string) => formatPhone(v), []);

  return {
    step, setStep,
    services,
    selectedServices, toggleService,
    selectedDate, setSelectedDate,
    selectedTime, setSelectedTime,
    userInfo, setUserInfo,
    isSubmitting,
    existingBookings,
    availableSlots,
    dateContainerRef,
    handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove,
    totalPrice, isStepDisabled, stepTitle,
    handleConfirm, goNext, goBack,
    navigate, nextDays,
    formatPhoneValue,
    showCalendarModal, handleCalendarChoice,
  };
}
