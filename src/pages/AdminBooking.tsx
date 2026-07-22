import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  Fragment,
  type FC,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBookings } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { getNextDays } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useServices } from '../hooks/useServices';
import { useBarberSettings } from '../hooks/useBarberSettings';
import { useAdminClientSearch } from '../hooks/useAdminClientSearch';
import { useMensalistaFilter } from '../hooks/useMensalistaFilter';
import { useAdminBookingSubmit } from '../hooks/useAdminBookingSubmit';
import type { Service, Booking } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import BottomTabs from '../components/Admin/BottomTabs';
const BookingSearchModal = lazy(() => import('../components/Admin/shared/BookingSearchModal'));

import AdminLayout from '../components/Admin/AdminLayout';
import {
  RescheduleBanner,
  BookingStepIndicator,
  ResponsiveClientStep,
  ResponsiveServicesStep,
  ResponsiveDateTimeStep,
} from '../components/Admin/booking';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { ArrowLeft } from 'lucide-react';
import { logError } from '../lib/logger';

const AdminBooking: FC = () => {
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
  const { barberPhone } = useBarberSettings();
  const { showError } = useToast();
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);

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
    return location.state?.date || '';
  });

  const [selectedTime, setSelectedTime] = useState<string>(() => {
    if (location.state?.rescheduleBooking?.booking_time) {
      return location.state.rescheduleBooking.booking_time.slice(0, 5);
    }
    return location.state?.time || '';
  });

  const [workingDays, setWorkingDays] = useState<string>('1,2,3,4,5,6');
  const isDesktop = useIsDesktop();

  const isPreFilled = !!location.state?.date && !!location.state?.time && !rescheduleBooking;

  const STEPS = [
    { step: 1, label: 'CLIENTE', num: '01' },
    { step: 2, label: 'SERVIÇOS', num: '02' },
    { step: 3, label: isPreFilled ? 'CONFIRMAR' : 'AGENDA', num: '03' },
  ];

  // Mensalista filter (shared hook)
  const handleServicesChange = useCallback((s: Service[]) => setSelectedServices(s), []);

  const { filteredServices, filterDaysForMensalista } = useMensalistaFilter({
    isMensalista,
    currentPlan,
    allServices: services,
    selectedServices,
    onServicesChange: handleServicesChange,
  });

  // Filter days by working_days (from settings) + mensalista filter
  const nextDays = useMemo(() => {
    const enabled = workingDays.split(',').map(Number);
    const days = allNextDays.filter((d) => {
      const dow = new Date(d.fullDate + 'T12:00:00').getDay();
      return enabled.includes(dow);
    });
    return filterDaysForMensalista(days);
  }, [allNextDays, workingDays, filterDaysForMensalista]);

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
        // keep default
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
      .catch(() => {
        // Falha ao carregar clientes — nao bloqueia a UI
      });
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

  // Pre-select services from URL params (Reagendar rápido)
  useEffect(() => {
    if (prefilledServiceIds.length > 0 && services.length > 0 && selectedServices.length === 0) {
      const toSelect = services.filter((s) => prefilledServiceIds.includes(s.id));
      if (toSelect.length > 0) {
        setSelectedServices(toSelect);
      }
    }
  }, [prefilledServiceIds, services, selectedServices.length]);

  // Pre-select date/time from URL params (Reagendar rápido)
  useEffect(() => {
    if (prefilledDate && !selectedDate) setSelectedDate(prefilledDate);
    if (prefilledTime && !selectedTime) setSelectedTime(prefilledTime);
  }, [prefilledDate, prefilledTime, selectedDate, selectedTime]);

  useEffect(() => {
    if (selectedDate) {
      let active = true;
      const loadBookings = async () => {
        try {
          const result = await getBookings(selectedDate);
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
  }, [selectedDate, showError]);

  useEffect(() => {
    if (rescheduleBooking && services.length > 0 && rescheduleBooking.service_ids) {
      const matchedServices = services.filter((s) => rescheduleBooking.service_ids.includes(s.id));
      Promise.resolve().then(() => {
        setSelectedServices(matchedServices);
      });
    }
  }, [rescheduleBooking, services]);

  const toggleService = (service: Service) => {
    if (selectedServices.find((s) => s.id === service.id)) {
      setSelectedServices(selectedServices.filter((s) => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  const { isSubmitting, handleFinish } = useAdminBookingSubmit({
    selectedClient,
    newClient,
    selectedServices,
    selectedDate,
    selectedTime,
    totalPrice,
    totalDuration,
    rescheduleBooking,
    barberPhone,
  });

  const handleNextStep = () => {
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
  };

  const isStepValid = (step: number) => {
    if (step === 1) {
      if (selectedClient) return true;
      return newClient.name.trim() !== '' && newClient.phone.trim().length >= 8;
    }
    if (step === 2) return selectedServices.length > 0;
    if (step === 3) return !!selectedDate && !!selectedTime;
    return false;
  };

  if (isDesktop) {
    return (
      <AdminLayout mainClassName="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-8 pb-10">
        <div className="space-y-6">
          {/* Header */}
          <div className="pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="w-11 h-11 rounded-xl border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
                aria-label="Voltar para a Agenda"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white uppercase">
                  {rescheduleBooking ? 'Reagendar' : 'Novo Agendamento'}
                </h1>
                <p className="text-[13px] text-zinc-500 mt-1">
                  {rescheduleBooking
                    ? 'Altere a data ou horário do agendamento'
                    : 'Preencha os dados para criar um novo agendamento'}
                </p>
              </div>
            </div>
            <div className="mt-3 h-px bg-gradient-to-r from-[#D4AF37]/40 via-[#D4AF37]/10 to-transparent" />
          </div>

          {/* Step Indicator */}
          {!rescheduleBooking && (
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <Fragment key={s.step}>
                  <button
                    onClick={() => s.step <= currentStep && setCurrentStep(s.step)}
                    disabled={s.step > currentStep}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-all cursor-pointer ${
                      currentStep === s.step
                        ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37]'
                        : s.step < currentStep
                          ? 'bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white'
                          : 'bg-white/[0.02] border border-white/[0.04] text-zinc-500'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        currentStep === s.step
                          ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20'
                          : s.step < currentStep
                            ? 'bg-[#D4AF37]/30 text-[#D4AF37]'
                            : 'bg-white/[0.06] text-zinc-500'
                      }`}
                    >
                      {s.step < currentStep ? '✓' : s.num}
                    </span>
                    <span className="hidden xl:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`w-10 h-px ${s.step < currentStep ? 'bg-[#D4AF37]/50' : 'bg-white/[0.08]'}`}
                    />
                  )}
                </Fragment>
              ))}
            </div>
          )}

          {rescheduleBooking && <RescheduleBanner booking={rescheduleBooking} />}

          {/* Step Content */}
          <div className="bg-[#0C0C0C]/80 border border-white/[0.05] p-6 rounded-2xl backdrop-blur-xl min-h-[420px]">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step-client"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ResponsiveClientStep
                    selectedClient={selectedClient}
                    newClient={newClient}
                    searchQuery={searchQuery}
                    multipleMatches={multipleMatches}
                    isManualEntry={isManualEntry}
                    isSearchingClient={isSearchingClient}
                    isMensalista={isMensalista}
                    onSetNewClient={setNewClient}
                    onSetSearchQuery={setSearchQuery}
                    onSetIsManualEntry={setIsManualEntry}
                    onSetMultipleMatches={setMultipleMatches}
                    onSetSelectedClient={setSelectedClient}
                    onSearch={handleSearch}
                    onNextStep={handleNextStep}
                    onOpenSearch={() => setIsSearchOpen(true)}
                    isStepValid={isStepValid}
                  />
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step-services"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ResponsiveServicesStep
                    services={filteredServices}
                    selectedServices={selectedServices}
                    isMensalista={isMensalista}
                    planName={currentPlan?.name}
                    onToggleService={toggleService}
                    onNextStep={handleNextStep}
                  />
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step-datetime"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ResponsiveDateTimeStep
                    nextDays={nextDays}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    existingBookings={existingBookings}
                    rescheduleBookingId={rescheduleBooking?.id}
                    onSelectDate={(date) => {
                      setSelectedDate(date);
                      setSelectedTime('');
                    }}
                    onSelectTime={setSelectedTime}
                    onFinish={handleFinish}
                    isSubmitting={isSubmitting}
                    isStepValid={isStepValid}
                    isPreFilled={isPreFilled}
                    selectedServices={selectedServices}
                    totalPrice={totalPrice}
                    clientName={selectedClient?.name || newClient.name}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Suspense fallback={null}>
          <BookingSearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectClient={(client) => {
              selectClient(client);
              setIsSearchOpen(false);
            }}
            clients={filteredClientsForModal}
          />
        </Suspense>
      </AdminLayout>
    );
  }

  // MOBILE LAYOUT
  return (
    <div className="h-screen lg:min-h-screen bg-[#121212] text-white font-sans selection:bg-[#D4AF37]/30 flex flex-col relative overflow-hidden">
      <div className="lg:hidden flex-1 flex flex-col relative z-10 overflow-hidden h-[calc(100dvh-60px)] bg-[#050505]">
        <header className="sticky top-0 z-30 bg-[#050505] border-b border-white/[0.06]">
          <div className="px-5 py-4 flex items-center gap-3">
            <button
              onClick={() =>
                currentStep > 1 && !rescheduleBooking
                  ? setCurrentStep(currentStep - 1)
                  : navigate('/admin')
              }
              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-sm font-semibold tracking-[0.15em] text-white uppercase">
              {rescheduleBooking ? 'Reagendar' : 'Novo Agendamento'}
            </h1>
          </div>
          {!rescheduleBooking && (
            <BookingStepIndicator steps={STEPS} currentStep={currentStep} variant="mobile" />
          )}
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pt-5 pb-44 flex flex-col scrollbar-hide">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="m-step-client"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5 h-full flex flex-col"
              >
                <ResponsiveClientStep
                  selectedClient={selectedClient}
                  newClient={newClient}
                  searchQuery={searchQuery}
                  multipleMatches={multipleMatches}
                  isManualEntry={isManualEntry}
                  isSearchingClient={isSearchingClient}
                  isMensalista={isMensalista}
                  onSetNewClient={setNewClient}
                  onSetSearchQuery={setSearchQuery}
                  onSetIsManualEntry={setIsManualEntry}
                  onSetMultipleMatches={setMultipleMatches}
                  onSetSelectedClient={setSelectedClient}
                  onSearch={handleSearch}
                  onOpenSearch={() => setIsSearchOpen(true)}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="m-step-services"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 h-full flex flex-col"
              >
                <ResponsiveServicesStep
                  services={filteredServices}
                  selectedServices={selectedServices}
                  isMensalista={isMensalista}
                  planName={currentPlan?.name}
                  onToggleService={toggleService}
                />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="m-step-calendar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5 h-full flex flex-col"
              >
                <ResponsiveDateTimeStep
                  nextDays={nextDays}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  existingBookings={existingBookings}
                  rescheduleBooking={rescheduleBooking}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setSelectedTime('');
                  }}
                  onSelectTime={setSelectedTime}
                  isPreFilled={isPreFilled}
                  selectedServices={selectedServices}
                  totalPrice={totalPrice}
                  clientName={selectedClient?.name || newClient.name}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className="fixed left-0 right-0 z-[90] bg-[#050505]/95 backdrop-blur-sm border-t border-white/[0.06] pb-3"
          style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="px-5 pt-3">
            <button
              onClick={() => (currentStep < 3 ? handleNextStep() : handleFinish())}
              disabled={!isStepValid(currentStep) || isSubmitting}
              className={`w-full h-12 rounded-xl font-bold uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                !isStepValid(currentStep)
                  ? 'bg-white/[0.04] border border-white/[0.04] text-zinc-700 cursor-not-allowed'
                  : 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 shadow-lg shadow-[#D4AF37]/20'
              }`}
            >
              <span>
                {isSubmitting
                  ? 'CONFIRMANDO...'
                  : rescheduleBooking
                    ? 'CONFIRMAR REAGENDAMENTO'
                    : currentStep < 3
                      ? 'CONTINUAR'
                      : 'CONFIRMAR AGENDAMENTO'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <BookingSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectClient={(client) => {
            selectClient(client);
            setIsSearchOpen(false);
          }}
          clients={filteredClientsForModal}
        />
      </Suspense>

      <BottomTabs />
    </div>
  );
};

export default AdminBooking;
