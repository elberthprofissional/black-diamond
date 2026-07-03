import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createBooking, getBookings, getClients, getBookingsForStats, deleteBooking } from '../lib/api';
import { formatPhone, getNextDays } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useServices } from '../hooks/useServices';
import type { Service, Client, Booking } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import BottomTabs from '../components/Admin/BottomTabs';
const BookingSearchModal = lazy(() => import('../components/Admin/shared/BookingSearchModal'));

import AdminLayout from '../components/Admin/AdminLayout';
import {
  RescheduleBanner,
  BookingStepIndicator,
  DesktopClientStep,
  DesktopServicesStep,
  DesktopDateTimeStep,
  MobileClientStep,
  MobileServicesStep,
  MobileDateTimeStep,
} from '../components/Admin/booking';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { ArrowLeft } from 'lucide-react';

const MENSALISTA_EXCLUDED_SERVICES = ['Corte de Cabelo'];

const AdminBooking: React.FC = () => {
  const allNextDays = useMemo(() => getNextDays(), []);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const prefilledClientName = searchParams.get('client');
  const prefilledClientPhone = searchParams.get('phone');
  const rescheduleBooking = location.state?.rescheduleBooking;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { services } = useServices();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClientsForModal, setFilteredClientsForModal] = useState<Client[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const { showSuccess, showError } = useToast();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ name: '', phone: '' });
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [isMensalista, setIsMensalista] = useState(false);

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

  const [searchQuery, setSearchQuery] = useState('');
  const [multipleMatches, setMultipleMatches] = useState<Client[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const isPreFilled = !!location.state?.date && !!location.state?.time && !rescheduleBooking;

  const STEPS = [
    { step: 1, label: 'CLIENTE', num: '01' },
    { step: 2, label: 'SERVIÇOS', num: '02' },
    { step: 3, label: isPreFilled ? 'CONFIRMAR' : 'AGENDA', num: '03' },
  ];

  // Filter services for mensalista
  const filteredServices = useMemo(() => {
    if (!isMensalista) return services;
    return services.filter(s => !MENSALISTA_EXCLUDED_SERVICES.includes(s.name));
  }, [services, isMensalista]);

  // Filter days for mensalista (MON-THU only)
  const nextDays = useMemo(() => {
    if (!isMensalista) return allNextDays;
    return allNextDays.filter(d => {
      const date = new Date(d.fullDate + 'T12:00:00');
      const dow = date.getDay();
      return dow >= 1 && dow <= 4; // MON=1, THU=4
    });
  }, [allNextDays, isMensalista]);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsData, bookingsData] = await Promise.all([getClients(), getBookingsForStats()]);
        setClients(clientsData);

        // Filter clients: only those with 2+ bookings or manually added
        const enrichedClients = clientsData.filter((c: Client) => {
          const bookingsCount = (bookingsData || []).filter((b: { client_id: string; status: string }) => b.client_id === c.id && b.status !== 'cancelled').length;
          return bookingsCount >= 2 || c.manually_added;
        });
        setFilteredClientsForModal(enrichedClients);

        if (rescheduleBooking) {
          const match = clientsData.find((c: Client) => c.id === rescheduleBooking.client_id || c.phone === rescheduleBooking.clients?.phone);
          if (match) {
            setSelectedClient(match);
            setIsManualEntry(false);
            setIsMensalista(!!match.is_mensalista);
          } else {
            setNewClient({ name: rescheduleBooking.clients?.name || '', phone: rescheduleBooking.clients?.phone || '' });
            setIsManualEntry(true);
          }
        } else if (prefilledClientName && prefilledClientPhone) {
          const match = clientsData.find((c: Client) => c.phone === prefilledClientPhone || c.name === prefilledClientName);
          if (match) {
            setSelectedClient(match);
            setIsManualEntry(false);
            setIsMensalista(!!match.is_mensalista);
          } else {
            setNewClient({ name: prefilledClientName, phone: prefilledClientPhone });
            setIsManualEntry(true);
          }
        }
      } catch (e) { console.error('Erro ao buscar clientes:', e); showError('Erro ao carregar clientes.'); }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleBooking, prefilledClientName, prefilledClientPhone]);

  useEffect(() => {
    if (selectedDate) {
      const loadBookings = async () => {
        try {
          const data = await getBookings(selectedDate);
          setExistingBookings(data || []);
        } catch (e) { console.error('Erro ao buscar bookings:', e); showError('Erro ao carregar agendamentos.'); }
      };
      loadBookings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    if (rescheduleBooking && services.length > 0 && rescheduleBooking.service_ids) {
      const matchedServices = services.filter(s => rescheduleBooking.service_ids.includes(s.id));
      Promise.resolve().then(() => { setSelectedServices(matchedServices); });
    }
  }, [rescheduleBooking, services]);

  const toggleService = (service: Service) => {
    if (selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  const handleFinish = async () => {
    const name = selectedClient ? selectedClient.name : newClient.name;
    const phone = selectedClient ? selectedClient.phone : newClient.phone;

    if (!name || !phone || selectedServices.length === 0 || !selectedDate || !selectedTime) {
      showError('Preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (rescheduleBooking?.id) {
        await deleteBooking(rescheduleBooking.id);
      }

      await createBooking(
        {
          service_ids: selectedServices.map(s => s.id),
          booking_date: selectedDate,
          booking_time: selectedTime,
          total_price: totalPrice,
          total_duration: totalDuration
        },
        { name, phone }
      );

      showSuccess(rescheduleBooking?.id ? 'Agendamento reagendado com sucesso!' : 'Agendamento realizado!');
      setTimeout(() => navigate('/admin'), 300);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro ao agendar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      showError('Digite um WhatsApp ou Nome.');
      return;
    }

    setIsSearchingClient(true);

    setTimeout(() => {
      const term = searchQuery.trim().toLowerCase();
      const isPhone = /^\+?\d[\d\s\-()]*$/.test(term);
      const matches = isPhone
        ? filteredClientsForModal.filter(c => c.phone.replace(/\D/g, '').includes(term.replace(/\D/g, '')))
        : filteredClientsForModal.filter(c => c.name.toLowerCase().includes(term));

      setIsSearchingClient(false);

      if (matches.length > 0) {
        setSelectedClient(null);
        setMultipleMatches(matches);
        setIsManualEntry(false);
      } else {
        setSelectedClient(null);
        setMultipleMatches([]);
        const prefilledPhone = isPhone ? formatPhone(term) : '';
        setNewClient({ name: '', phone: prefilledPhone });
        setIsManualEntry(true);
        showError('Cliente não encontrado. Preencha o nome.');
      }
    }, 400);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!selectedClient && (!newClient.name.trim() || newClient.phone.trim().length < 8)) {
        showError('Preencha o nome e telefone do cliente.');
        return;
      }
    }
    if (currentStep === 2 && !isMensalista && selectedServices.length === 0) {
      showError('Selecione ao menos um serviço.');
      return;
    }
    if (currentStep === 3 && (!selectedDate || !selectedTime)) {
      showError('Selecione o dia e o horário.');
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const isStepValid = (step: number) => {
    if (step === 1) {
      if (selectedClient) return true;
      return newClient.name.trim() !== '' && newClient.phone.trim().length >= 8;
    }
    if (step === 2) return isMensalista || selectedServices.length > 0;
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
              <button type="button" onClick={() => navigate('/admin')} className="w-11 h-11 rounded-xl border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer" aria-label="Voltar para a Agenda">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white uppercase">
                  {rescheduleBooking ? 'Reagendar' : 'Novo Agendamento'}
                </h1>
                <p className="text-[13px] text-zinc-500 mt-1">
                  {rescheduleBooking ? 'Altere a data ou horário do agendamento' : 'Preencha os dados para criar um novo agendamento'}
                </p>
              </div>
            </div>
            <div className="mt-3 h-px bg-gradient-to-r from-[#C5A059]/40 via-[#C5A059]/10 to-transparent" />
          </div>

          {/* Step Indicator */}
          {!rescheduleBooking && (
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.step}>
                  <button
                    onClick={() => s.step <= currentStep && setCurrentStep(s.step)}
                    disabled={s.step > currentStep}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-all cursor-pointer ${
                      currentStep === s.step
                        ? 'bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#C5A059]'
                        : s.step < currentStep
                          ? 'bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white'
                          : 'bg-white/[0.02] border border-white/[0.04] text-zinc-500'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      currentStep === s.step
                        ? 'bg-[#C5A059] text-black shadow-lg shadow-[#C5A059]/20'
                        : s.step < currentStep
                          ? 'bg-[#C5A059]/30 text-[#C5A059]'
                          : 'bg-white/[0.06] text-zinc-500'
                    }`}>
                      {s.step < currentStep ? '✓' : s.num}
                    </span>
                    <span className="hidden xl:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`w-10 h-px ${s.step < currentStep ? 'bg-[#C5A059]/50' : 'bg-white/[0.08]'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {rescheduleBooking && <RescheduleBanner booking={rescheduleBooking} />}

          {/* Step Content */}
          <div className="bg-[#0C0C0C]/80 border border-white/[0.05] p-6 rounded-2xl backdrop-blur-xl min-h-[420px]">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step-client" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <DesktopClientStep
                    selectedClient={selectedClient}
                    newClient={newClient}
                    searchQuery={searchQuery}
                    multipleMatches={multipleMatches}
                    isManualEntry={isManualEntry}
                    isSearchingClient={isSearchingClient}
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
                <motion.div key="step-services" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <DesktopServicesStep
                    services={filteredServices}
                    selectedServices={selectedServices}
                    isMensalista={isMensalista}
                    onToggleService={toggleService}
                    onNextStep={handleNextStep}
                  />
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="step-datetime" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <DesktopDateTimeStep
                    nextDays={nextDays}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    existingBookings={existingBookings}
                    rescheduleBookingId={rescheduleBooking?.id}
                    onSelectDate={(date) => { setSelectedDate(date); setSelectedTime(''); }}
                    onSelectTime={setSelectedTime}
                    onFinish={handleFinish}
                    isSubmitting={isSubmitting}
                    isStepValid={isStepValid}
                    isPreFilled={!!location.state?.date && !!location.state?.time && !rescheduleBooking}
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
            onSelectClient={(client) => { setSelectedClient(client); setIsSearchOpen(false); setIsManualEntry(false); setIsMensalista(!!client.is_mensalista); }}
            clients={filteredClientsForModal}
          />
        </Suspense>
      </AdminLayout>
    );
  }

  // MOBILE LAYOUT
  return (
    <div className="h-screen lg:min-h-screen bg-[#121212] text-white font-sans selection:bg-[#C5A059]/30 flex flex-col relative overflow-hidden">
      <div className="lg:hidden flex-1 flex flex-col relative z-10 overflow-hidden h-[calc(100dvh-60px)] bg-[#050505]">
        <header className="sticky top-0 z-30 bg-[#050505] border-b border-white/[0.06]">
          <div className="px-5 py-4 flex items-center gap-3">
            <button
              onClick={() => currentStep > 1 && !rescheduleBooking ? setCurrentStep(currentStep - 1) : navigate('/admin')}
              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-sm font-semibold tracking-[0.15em] text-white uppercase">
              {rescheduleBooking ? 'Reagendar' : 'Novo Agendamento'}
            </h1>
          </div>
          {!rescheduleBooking && (
            <BookingStepIndicator
              steps={STEPS}
              currentStep={currentStep}
              variant="mobile"
            />
          )}
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pt-5 pb-44 flex flex-col scrollbar-hide">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div key="m-step-client" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5 h-full flex flex-col">
                <MobileClientStep
                  selectedClient={selectedClient}
                  newClient={newClient}
                  searchQuery={searchQuery}
                  multipleMatches={multipleMatches}
                  isManualEntry={isManualEntry}
                  isSearchingClient={isSearchingClient}
                  onSetNewClient={setNewClient}
                  onSetSearchQuery={setSearchQuery}
                  onSetIsManualEntry={setIsManualEntry}
                  onSetMultipleMatches={setMultipleMatches}
                  onSetSelectedClient={setSelectedClient}
                  onSearch={handleSearch}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="m-step-services" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-4 h-full flex flex-col">
                <MobileServicesStep
                  services={filteredServices}
                  selectedServices={selectedServices}
                  isMensalista={isMensalista}
                  onToggleService={toggleService}
                />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="m-step-calendar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5 h-full flex flex-col">
                <MobileDateTimeStep
                  nextDays={nextDays}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  existingBookings={existingBookings}
                  rescheduleBooking={rescheduleBooking}
                  onSelectDate={(date) => { setSelectedDate(date); setSelectedTime(''); }}
                  onSelectTime={setSelectedTime}
                  isPreFilled={!!location.state?.date && !!location.state?.time && !rescheduleBooking}
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
              onClick={() => currentStep < 3 ? handleNextStep() : handleFinish()}
              disabled={!isStepValid(currentStep) || isSubmitting}
              className={`w-full h-12 rounded-xl font-bold uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                !isStepValid(currentStep)
                  ? 'bg-white/[0.04] border border-white/[0.04] text-zinc-700 cursor-not-allowed'
                  : 'bg-[#C5A059] text-black hover:bg-[#C5A059]/90 shadow-lg shadow-[#C5A059]/20'
              }`}
            >
              <span>{isSubmitting ? 'CONFIRMANDO...' : rescheduleBooking ? 'CONFIRMAR REAGENDAMENTO' : currentStep < 3 ? 'CONTINUAR' : 'CONFIRMAR AGENDAMENTO'}</span>
            </button>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <BookingSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectClient={(client) => { setSelectedClient(client); setIsSearchOpen(false); setIsManualEntry(false); }}
          clients={filteredClientsForModal}
        />
      </Suspense>

      <BottomTabs />

    </div>
  );
};

export default AdminBooking;
