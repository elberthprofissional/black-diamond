import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { getBookings } from '../lib/api';
import { useToast } from './useToast';
import { getNextDays } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useServices } from './useServices';
import { useBarberSettings } from './useBarberSettings';
import { useBarberContext } from '../contexts/BarberContext';
import { useAdminClientSearch } from './useAdminClientSearch';
import { useAdminBookingSubmit } from './useAdminBookingSubmit';
import type { Service, Booking, Barber } from '../types';
import { logError } from '../lib/logger';

export type UseAdminBookingReturn = ReturnType<typeof useAdminBookingState>;

export function useAdminBookingState() {
  const { barberHours } = useBarberSettings();
  const allNextDays = useMemo(() => getNextDays(barberHours || undefined), [barberHours]);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const prefilledClientName = searchParams.get('client');
  const prefilledClientPhone = searchParams.get('phone');
  const prefilledServiceIds = searchParams.get('services')?.split(',').filter(Boolean) || [];
  const prefilledDate = searchParams.get('date') || '';
  const prefilledTime = searchParams.get('time') || '';
  const rescheduleBooking = location.state?.rescheduleBooking;

  const { services } = useServices();
  const { barberPhone: settingsBarberPhone, singleBarberMode } = useBarberSettings();
  const { barbers, currentBarber } = useBarberContext();
  const { showError } = useToast();
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);

  // ── Multi-barbeiro: barbeiro escolhido para o agendamento ──
  // selectedBarber = escolha explícita do admin; effectiveBarber faz fallback
  // para o barbeiro logado (ou o primeiro ativo) quando nada foi escolhido.
  // Em modo solo (singleBarberMode), ignora qualquer seleção explícita: usa
  // sempre o barbeiro principal.
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const defaultBarber = useMemo(() => {
    // Modo solo: sempre o primeiro barbeiro ativo (barbeiro único/principal)
    if (singleBarberMode) {
      return barbers.find((b) => b.is_active) ?? barbers[0] ?? null;
    }
    if (
      currentBarber &&
      currentBarber.is_active &&
      barbers.some((b) => b.id === currentBarber.id)
    ) {
      return currentBarber;
    }
    return barbers.find((b) => b.is_active) ?? barbers[0] ?? null;
  }, [barbers, currentBarber, singleBarberMode]);
  const effectiveBarber = singleBarberMode ? defaultBarber : (selectedBarber ?? defaultBarber);

  const selectedBarberPhone = effectiveBarber?.phone || settingsBarberPhone || '';
  const selectedBarberUserId = effectiveBarber?.user_id;
  const selectedBarberName = effectiveBarber?.name;

  const clientSearch = useAdminClientSearch();
  const {
    selectedClient,
    setSelectedClient,
    newClient,
    setNewClient,
    isMensalista,
    currentPlan,
    searchQuery,
    setSearchQuery,
    multipleMatches,
    setMultipleMatches,
    isSearchingClient,
    isManualEntry,
    setIsManualEntry,
    filteredClientsForModal,
    handleSearch,
    isSearchOpen,
    setIsSearchOpen,
    selectClient,
    loadClients,
  } = clientSearch;

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);

  const [currentStep, setCurrentStep] = useState(() => {
    if (location.state?.rescheduleBooking) return 3;
    if (prefilledClientName && prefilledClientPhone) return 2;
    return 1;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (location.state?.rescheduleBooking?.booking_date) {
      return location.state.rescheduleBooking.booking_date;
    }
    if (prefilledDate) return prefilledDate;
    return location.state?.date || '';
  });

  const [selectedTime, setSelectedTime] = useState<string>(() => {
    if (location.state?.rescheduleBooking?.booking_time) {
      return location.state.rescheduleBooking.booking_time.slice(0, 5);
    }
    if (prefilledTime) return prefilledTime;
    return location.state?.time || '';
  });

  const [workingDays, setWorkingDays] = useState<string>('1,2,3,4,5,6');

  const isPreFilled = !!location.state?.date && !!location.state?.time && !rescheduleBooking;

  const STEPS = [
    { step: 1, label: 'CLIENTE', num: '01' },
    { step: 2, label: 'SERVIÇOS', num: '02' },
    { step: 3, label: isPreFilled ? 'CONFIRMAR' : 'AGENDA', num: '03' },
  ];

  const nextDays = useMemo(() => {
    const enabled = workingDays.split(',').map(Number);
    return allNextDays.filter((d) => {
      const dow = new Date(d.fullDate + 'T12:00:00').getDay();
      return enabled.includes(dow);
    });
  }, [allNextDays, workingDays]);

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price), 0),
    [selectedServices]
  );
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.duration, 0),
    [selectedServices]
  );

  // Fetch working_days from settings
  useEffect(() => {
    const fetchWorkingDays = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'working_days')
          .maybeSingle();
        if (data?.value) setWorkingDays(data.value);
      } catch (e) {
        logError(e);
      }
    };
    fetchWorkingDays();
  }, []);

  // Load clients and handle prefilled/reschedule on mount
  useEffect(() => {
    let mounted = true;
    loadClients()
      .then((clients) => {
        if (!mounted) return;
        if (rescheduleBooking && clients.length > 0) {
          const match = clients.find(
            (c) =>
              c.id === rescheduleBooking.client_id || c.phone === rescheduleBooking.clients?.phone
          );
          if (match) {
            selectClient(match);
          } else {
            setNewClient({
              name: rescheduleBooking.clients?.name || '',
              phone: rescheduleBooking.clients?.phone || '',
            });
            setIsManualEntry(true);
          }
        } else if (prefilledClientName && prefilledClientPhone && clients.length > 0) {
          const match = clients.find(
            (c) => c.phone === prefilledClientPhone || c.name === prefilledClientName
          );
          if (match) {
            selectClient(match);
          } else {
            setNewClient({ name: prefilledClientName, phone: prefilledClientPhone });
            setIsManualEntry(true);
          }
        }
      })
      .catch((e) => logError(e, 'useAdminBookingState/loadClients'));
    return () => {
      mounted = false;
    };
  }, [
    rescheduleBooking,
    prefilledClientName,
    prefilledClientPhone,
    loadClients,
    selectClient,
    setNewClient,
    setIsManualEntry,
  ]);

  // Pre-select initial services from URL params
  const prefilledServiceIdsStr = prefilledServiceIds.join(',');
  useEffect(() => {
    if (prefilledServiceIds.length > 0 && services.length > 0 && selectedServices.length === 0) {
      const toSelect = services.filter((s) => prefilledServiceIds.includes(s.id));
      if (toSelect.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedServices(toSelect);
      }
    }
    // setSelectedServices é estável (useState), chamada dentro de useEffect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledServiceIdsStr, services.length]);

  useEffect(() => {
    if (selectedDate) {
      let active = true;
      const loadBookings = async () => {
        try {
          const result = await getBookings(selectedDate, { barberId: effectiveBarber?.id });
          if (active) setExistingBookings(result.data || []);
        } catch (e) {
          logError(e);
          if (active) showError('Erro ao carregar agendamentos.');
        }
      };
      loadBookings();
      return () => {
        active = false;
      };
    }
  }, [selectedDate, showError, effectiveBarber?.id]);

  useEffect(() => {
    if (rescheduleBooking && services.length > 0 && rescheduleBooking.service_ids) {
      const matchedServices = services.filter((s) => rescheduleBooking.service_ids.includes(s.id));
      Promise.resolve().then(() => {
        setSelectedServices(matchedServices);
      });
    }
    // setSelectedServices é estável (useState), chamada dentro de efeito assíncrono
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleBooking, services.length]);

  const toggleService = useCallback(
    (service: Service) => {
      setSelectedServices((prev) => {
        if (prev.find((s) => s.id === service.id)) {
          return prev.filter((s) => s.id !== service.id);
        }
        return [...prev, service];
      });
    },
    [setSelectedServices]
  );

  const { isSubmitting, handleFinish } = useAdminBookingSubmit({
    selectedClient,
    newClient,
    selectedServices,
    selectedDate,
    selectedTime,
    totalPrice,
    totalDuration,
    rescheduleBooking,
    barberPhone: selectedBarberPhone,
    barberId: effectiveBarber?.id,
    barberUserId: selectedBarberUserId,
    barberName: selectedBarberName,
  });

  const handleNextStep = useCallback(() => {
    if (currentStep === 1) {
      if (!selectedClient && (!newClient.name.trim() || newClient.phone.trim().length < 8)) {
        showError('Preencha o nome e telefone do cliente.');
        return;
      }
    }
    if (currentStep === 2 && selectedServices.length === 0) {
      showError('Selecione ao menos um serviço.');
      return;
    }
    if (currentStep === 3 && (!selectedDate || !selectedTime)) {
      showError('Selecione o dia e o horário.');
      return;
    }
    setCurrentStep((prev) => prev + 1);
  }, [
    currentStep,
    selectedClient,
    newClient,
    selectedServices,
    selectedDate,
    selectedTime,
    showError,
    setCurrentStep,
  ]);

  const isStepValid = useCallback(
    (step: number) => {
      if (step === 1) {
        if (selectedClient) return true;
        return newClient.name.trim() !== '' && newClient.phone.trim().length >= 8;
      }
      if (step === 2) return selectedServices.length > 0;
      if (step === 3) return !!selectedDate && !!selectedTime;
      return false;
    },
    [selectedClient, newClient, selectedServices, selectedDate, selectedTime]
  );

  const handleSelectDate = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setSelectedTime('');
    },
    [setSelectedDate, setSelectedTime]
  );

  return {
    // Navigation
    navigate,
    rescheduleBooking,

    // State
    selectedClient,
    setSelectedClient,
    newClient,
    setNewClient,
    isMensalista,
    currentPlan,
    searchQuery,
    setSearchQuery,
    multipleMatches,
    setMultipleMatches,
    isSearchingClient,
    isManualEntry,
    setIsManualEntry,
    filteredClientsForModal,
    handleSearch,
    isSearchOpen,
    setIsSearchOpen,
    selectClient,
    selectedServices,
    currentStep,
    setCurrentStep,
    selectedDate,
    selectedTime,
    workingDays,
    existingBookings,
    services,
    STEPS,
    nextDays,
    totalPrice,
    totalDuration,
    isPreFilled,
    isSubmitting,
    barbers,
    singleBarberMode,
    selectedBarber: effectiveBarber,
    setSelectedBarber,

    // Handlers
    toggleService,
    handleNextStep,
    isStepValid,
    handleFinish,
    handleSelectDate,
    setSelectedTime,
  };
}
