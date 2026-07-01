import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createBooking, getBookings, getClients, deleteBooking } from '../lib/api';
import { formatPhone, getNextDays } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useServices } from '../hooks/useServices';
import type { Service, Client, Booking } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import BottomTabs from '../components/Admin/BottomTabs';
import BookingSearchModal from '../components/Admin/shared/BookingSearchModal';
import BookingSummaryPanel from '../components/Admin/shared/BookingSummaryPanel';
import AdminLayout from '../components/Admin/AdminLayout';
import {
  RescheduleBanner,
  CalendarModal,
  BookingStepIndicator,
  DesktopClientStep,
  DesktopServicesStep,
  DesktopDateTimeStep,
  MobileClientStep,
  MobileServicesStep,
  MobileDateTimeStep,
} from '../components/Admin/booking';
import { ArrowLeft } from 'lucide-react';

const STEPS = [
  { step: 1, label: 'CLIENTE', num: '01' },
  { step: 2, label: 'SERVIÇOS', num: '02' },
  { step: 3, label: 'AGENDA', num: '03' },
];

const AdminBooking: React.FC = () => {
  const nextDays = useMemo(() => getNextDays(), []);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const prefilledClientName = searchParams.get('client');
  const prefilledClientPhone = searchParams.get('phone');
  const rescheduleBooking = location.state?.rescheduleBooking;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { services } = useServices();
  const [clients, setClients] = useState<Client[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const { showSuccess, showError } = useToast();
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState('');

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ name: '', phone: '' });
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

  const [searchQuery, setSearchQuery] = useState('');
  const [multipleMatches, setMultipleMatches] = useState<Client[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsData = await getClients();
        setClients(clientsData);
        if (rescheduleBooking) {
          const match = clientsData.find(c => c.id === rescheduleBooking.client_id || c.phone === rescheduleBooking.clients?.phone);
          if (match) { setSelectedClient(match); setIsManualEntry(false); }
          else { setNewClient({ name: rescheduleBooking.clients?.name || '', phone: rescheduleBooking.clients?.phone || '' }); setIsManualEntry(true); }
        } else if (prefilledClientName && prefilledClientPhone) {
          const match = clientsData.find(c => c.phone === prefilledClientPhone || c.name === prefilledClientName);
          if (match) { setSelectedClient(match); setIsManualEntry(false); }
          else { setNewClient({ name: prefilledClientName, phone: prefilledClientPhone }); setIsManualEntry(true); }
        }
      } catch (e) { console.error('Erro ao buscar clientes:', e); }
    };
    fetchData();
  }, [rescheduleBooking, prefilledClientName, prefilledClientPhone]);

  useEffect(() => {
    if (selectedDate) {
      const loadBookings = async () => {
        try {
          const data = await getBookings(selectedDate);
          setExistingBookings(data || []);
        } catch (e) { console.error('Erro ao buscar bookings:', e); }
      };
      loadBookings();
    }
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

      const serviceNames = selectedServices.map(s => s.name).join(', ');
      const endDate = new Date(`${selectedDate}T${selectedTime}`);
      endDate.setMinutes(endDate.getMinutes() + totalDuration);
      const endDateTime = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}${String(endDate.getMinutes()).padStart(2, '0')}00`;
      const startFormatted = `${selectedDate.split('-')[0]}${selectedDate.split('-')[1]}${selectedDate.split('-')[2]}T${selectedTime.replace(':', '')}00`;
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(name + ' - ' + serviceNames)}&dates=${startFormatted}/${endDateTime}&details=${encodeURIComponent('Black Diamond - ' + serviceNames + ' - R$ ' + totalPrice.toFixed(2))}`;

      setCalendarUrl(url);
      showSuccess(rescheduleBooking?.id ? 'Agendamento reagendado com sucesso!' : 'Agendamento realizado!');
      setShowCalendarModal(true);
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
        ? clients.filter(c => c.phone.replace(/\D/g, '').includes(term.replace(/\D/g, '')))
        : clients.filter(c => c.name.toLowerCase().includes(term));

      setIsSearchingClient(false);

      if (matches.length === 1) {
        setSelectedClient(matches[0]);
        setNewClient({ name: '', phone: '' });
        setMultipleMatches([]);
        setIsManualEntry(false);
      } else if (matches.length > 1) {
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
    if (currentStep === 2 && selectedServices.length === 0) {
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
    if (step === 2) return selectedServices.length > 0;
    if (step === 3) return !!selectedDate && !!selectedTime;
    return false;
  };

  if (isDesktop) {
    return (
      <AdminLayout mainClassName="flex-1 w-full max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-8 pb-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate('/admin')} className="text-zinc-400 hover:text-white transition-all cursor-pointer" aria-label="Voltar para a Agenda">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">
                  {rescheduleBooking ? 'Reagendar Reserva' : 'Novo Agendamento'}
                </h1>
                <p className="text-[9px] text-zinc-550 font-bold uppercase tracking-widest mt-0.5">
                  workspace de agendamento administrativo
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-stretch">
            {rescheduleBooking && <RescheduleBanner booking={rescheduleBooking} />}

            {/* COLUMN 1: CLIENT */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-3 bg-[#0C0C0C]/80 border border-white/[0.05] p-5 rounded-2xl flex flex-col justify-between min-h-[580px] backdrop-blur-xl relative">
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
            </div>

            {/* COLUMN 2: SERVICES */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-3 bg-[#0C0C0C]/80 border border-white/[0.05] p-5 rounded-2xl flex flex-col justify-between min-h-[580px] backdrop-blur-xl relative">
              <DesktopServicesStep
                services={services}
                selectedServices={selectedServices}
                onToggleService={toggleService}
                onNextStep={handleNextStep}
              />
            </div>

            {/* COLUMN 3: DATE & TIME */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-3 bg-[#0C0C0C]/80 border border-white/[0.05] p-5 rounded-2xl flex flex-col justify-between min-h-[580px] backdrop-blur-xl relative">
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
              />
            </div>

            {/* COLUMN 4: SUMMARY */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-3 bg-[#0C0C0C]/90 border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between min-h-[580px] shadow-[0_15px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <BookingSummaryPanel
                selectedClient={selectedClient}
                newClient={newClient}
                selectedServices={selectedServices}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                totalPrice={totalPrice}
              />
            </div>
          </div>
        </div>

        <BookingSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectClient={(client) => { setSelectedClient(client); setIsSearchOpen(false); setIsManualEntry(false); }}
          clients={clients}
        />
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

        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pt-5 pb-36 flex flex-col scrollbar-hide">
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
                  services={services}
                  selectedServices={selectedServices}
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

      <BookingSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectClient={(client) => { setSelectedClient(client); setIsSearchOpen(false); setIsManualEntry(false); }}
        clients={clients}
      />

      <BottomTabs />

      <CalendarModal
        isOpen={showCalendarModal}
        calendarUrl={calendarUrl}
        onAddToCalendar={() => { setShowCalendarModal(false); setTimeout(() => navigate('/admin'), 300); }}
        onSkip={() => { setShowCalendarModal(false); navigate('/admin'); }}
      />
    </div>
  );
};

export default AdminBooking;
