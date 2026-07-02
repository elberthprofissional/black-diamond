import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooking, getAvailableSlots, getBookings, getClientByPhone } from '../lib/api';
import { getNextDays, formatPhone, getTimeSlotsForDate, getErrorMessage, generateGoogleCalendarUrl } from '../lib/utils';
import { useServices } from './useServices';
import { supabase } from '../lib/supabase';
import type { Service } from '../types';

const MENSALISTA_EXCLUDED_SERVICES = ['Corte de Cabelo'];

export function useBookingWizard(showError: (msg: string) => void) {
  const allNextDays = useMemo(() => getNextDays(), []);
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
  const [isMensalista, setIsMensalista] = useState(false);
  const [clientLookupLoading, setClientLookupLoading] = useState(false);
  const [barberPhone, setBarberPhone] = useState('');

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

  // Lookup client by phone when phone has 11 digits
  useEffect(() => {
    const phone = userInfo.phone.replace(/\D/g, '');
    if (phone.length < 11) {
      setIsMensalista(false);
      return;
    }

    let cancelled = false;
    setClientLookupLoading(true);

    getClientByPhone(phone)
      .then((client) => {
        if (!cancelled) {
          setIsMensalista(!!client?.is_mensalista);
          if (client?.name && !userInfo.name.trim()) {
            setUserInfo(prev => ({ ...prev, name: client.name }));
          }
        }
      })
      .catch(() => {
        if (!cancelled) setIsMensalista(false);
      })
      .finally(() => {
        if (!cancelled) setClientLookupLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo.phone]);

  // Reset selected services when mensalista status changes
  useEffect(() => {
    if (isMensalista && selectedServices.length > 0) {
      const allowed = selectedServices.filter(s => !MENSALISTA_EXCLUDED_SERVICES.includes(s.name));
      if (allowed.length !== selectedServices.length) {
        setSelectedServices(allowed);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMensalista]);

  // Filter services for mensalista
  const filteredServices = useMemo(() => {
    if (!isMensalista) return services;
    return services.filter(s => !MENSALISTA_EXCLUDED_SERVICES.includes(s.name));
  }, [services, isMensalista]);

  // Filter days for mensalista (MON-THU only)
  const filteredNextDays = useMemo(() => {
    if (!isMensalista) return allNextDays;
    return allNextDays.filter(d => {
      const date = new Date(d.fullDate + 'T12:00:00');
      const dow = date.getDay();
      return dow >= 1 && dow <= 4; // MON=1, THU=4
    });
  }, [allNextDays, isMensalista]);

  // Fetch barber phone from database (falls back to env var)
  useEffect(() => {
    const fetchPhone = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'barber_phone')
          .single();
        if (data?.value) {
          setBarberPhone(data.value);
        } else {
          setBarberPhone(import.meta.env.VITE_BARBER_WHATSAPP || '');
        }
      } catch {
        setBarberPhone(import.meta.env.VITE_BARBER_WHATSAPP || '');
      }
    };
    fetchPhone();
  }, []);

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

  // Inverted steps: 1=Data, 2=Services, 3=DateTime, 4=Review
  const isStepDisabled = useMemo(() => {
    if (step === 1) return !userInfo.name.trim() || userInfo.name.trim().length < 3 || userInfo.phone.replace(/\D/g, '').length < 11;
    if (step === 2) return selectedServices.length === 0;
    if (step === 3) return !selectedDate || !selectedTime;
    if (step === 4) return isSubmitting;
    return false;
  }, [step, selectedServices, selectedDate, selectedTime, userInfo, isSubmitting]);

  const stepTitle = step === 1 ? 'Seus dados' : step === 2 ? 'Escolha os serviços' : step === 3 ? 'Data e horário' : 'Revisar agendamento';

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

  const handleCalendarChoice = useCallback((wantsReminder: boolean) => {
    if (wantsReminder) {
      const serviceNames = selectedServices.map(s => s.name).join(' + ');
      const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
      const gcalUrl = generateGoogleCalendarUrl(serviceNames, selectedDate, selectedTime, totalDuration);
      window.open(gcalUrl, '_blank');
    }
    setShowCalendarModal(false);
    setStep(5);

    if (barberPhone) {
      const serviceNames = selectedServices.map(s => s.name).join(', ');
      const formattedDate = selectedDate.split('-').reverse().join('/');
      const mensalistaTag = isMensalista ? ' [MENSALISTA]' : '';
      const msg = `*NOVO AGENDAMENTO - BLACK DIAMOND*\n\n*Cliente:* ${userInfo.name.trim()}${mensalistaTag}\n*Servico:* ${serviceNames}\n*Data:* ${formattedDate}\n*Horario:* ${selectedTime}\n*Valor:* R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
      const waUrl = `https://wa.me/${barberPhone}?text=${encodeURIComponent(msg)}`;
      setTimeout(() => { window.open(waUrl, '_blank'); }, 200);
    }
  }, [selectedServices, selectedDate, selectedTime, userInfo, totalPrice, barberPhone, isMensalista]);

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
    services: filteredServices,
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
    navigate, nextDays: filteredNextDays,
    formatPhoneValue,
    showCalendarModal, handleCalendarChoice,
    isMensalista,
    clientLookupLoading,
  };
}
