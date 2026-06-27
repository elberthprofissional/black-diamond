import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createBooking, getBookings, getClients, deleteBooking } from '../lib/api';
import { getTimeSlotsForDate, formatPhone, getNextDays, isTimeOccupied } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useServices } from '../hooks/useServices';
import type { Service, Client, Booking } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import BottomTabs from '../components/Admin/BottomTabs';
import BookingSearchModal from '../components/Admin/shared/BookingSearchModal';
import BookingSummaryPanel from '../components/Admin/shared/BookingSummaryPanel';
import AdminLayout from '../components/Admin/AdminLayout';
import { 
  ArrowLeft, 
  ChevronRight,
  Check,
  Loader2,
  Search,
  User as UserIcon,
  Scissors,
  Calendar as CalendarIcon,
  Phone,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

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
          if (match) {
            setSelectedClient(match);
            setIsManualEntry(false);
          } else {
            setNewClient({
              name: rescheduleBooking.clients?.name || '',
              phone: rescheduleBooking.clients?.phone || ''
            });
            setIsManualEntry(true);
          }
        } else if (prefilledClientName && prefilledClientPhone) {
          const match = clientsData.find(c => c.phone === prefilledClientPhone || c.name === prefilledClientName);
          if (match) {
            setSelectedClient(match);
            setIsManualEntry(false);
          } else {
            setNewClient({ name: prefilledClientName, phone: prefilledClientPhone });
            setIsManualEntry(true);
          }
        }
      } catch { /* ignored */ }
    };
    fetchData();
  }, [rescheduleBooking, prefilledClientName, prefilledClientPhone]);

  useEffect(() => {
    if (selectedDate) {
      const loadBookings = async () => {
        try {
          const data = await getBookings(selectedDate);
          setExistingBookings(data || []);
        } catch { /* ignored */ }
      };
      loadBookings();
    }
  }, [selectedDate]);

  useEffect(() => {
    if (rescheduleBooking && services.length > 0 && rescheduleBooking.service_ids) {
      const matchedServices = services.filter(s => rescheduleBooking.service_ids.includes(s.id));
      Promise.resolve().then(() => {
        setSelectedServices(matchedServices);
      });
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

  const isOccupied = (time: string) => {
    let bookingsToCheck = existingBookings;
    if (rescheduleBooking) {
      bookingsToCheck = existingBookings.filter(b => b.id !== rescheduleBooking.id);
    }
    return isTimeOccupied(time, bookingsToCheck);
  };

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
    
    // Smooth lookup delay to feel premium and fast
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
          {/* Header */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="text-zinc-400 hover:text-white transition-all cursor-pointer"
                aria-label="Voltar para a Agenda"
              >
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
            {/* Reschedule Banner */}
            {rescheduleBooking && (
              <div className="col-span-12 p-4 bg-[#C5A059]/[0.08] border border-[#C5A059]/30 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-[#C5A059] tracking-[0.2em] uppercase block">Modo Reagendamento</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                      Reagendando o cliente <span className="text-[#C5A059]">{rescheduleBooking.clients?.name}</span>
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Original</span>
                  <span className="text-xs font-bold text-zinc-300">
                    {new Date(rescheduleBooking.booking_date.replace(/-/g, '/')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {rescheduleBooking.booking_time.slice(0, 5)}
                  </span>
                </div>
              </div>
            )}

            {/* COLUMN 1: CLIENT SELECTION */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-3 bg-[#0C0C0C]/80 border border-white/[0.05] p-5 rounded-2xl flex flex-col justify-between min-h-[580px] backdrop-blur-xl relative">
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-white/[0.04]">
                  <UserIcon size={18} className="text-[#C5A059] shrink-0" />
                  <div>
                    <h2 className="text-xs font-black tracking-[0.2em] text-white uppercase leading-none">CLIENTE</h2>
                  </div>
                </div>

                {selectedClient ? (
                  /* Selected Client Card */
                  <div className="p-4 bg-[#111111]/60 border border-[#C5A059]/20 rounded-xl space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-lg flex items-center justify-center text-[#C5A059] text-base font-bold shrink-0">
                        {selectedClient.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] font-black text-[#C5A059] tracking-widest uppercase block mb-0.5">Cadastrado</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide truncate">{selectedClient.name}</h3>
                        <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                          <Phone size={10} className="text-zinc-500" />
                          {selectedClient.phone}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setSearchQuery('');
                        setIsManualEntry(false);
                      }}
                      className="w-full py-2.5 bg-white/[0.02] border border-white/[0.06] hover:bg-[#C5A059]/5 hover:border-[#C5A059]/30 text-zinc-400 hover:text-[#C5A059] text-[9px] font-black uppercase tracking-[0.2em] rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={10} />
                      Alterar Cliente
                    </button>
                  </div>
                ) : (
                  /* Form/Search Mode */
                  <div className="space-y-4">
                    {/* Mode Selector Tab */}
                    <div className="flex bg-[#111111] p-1 rounded-xl border border-white/[0.04]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualEntry(true);
                          setSearchQuery('');
                          setMultipleMatches([]);
                        }}
                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-[0.15em] rounded-lg transition-all cursor-pointer ${
                          isManualEntry 
                            ? 'bg-[#C5A059] text-black shadow-md' 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Novo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualEntry(false);
                          setSearchQuery('');
                          setMultipleMatches([]);
                        }}
                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-[0.15em] rounded-lg transition-all cursor-pointer ${
                          !isManualEntry 
                            ? 'bg-[#C5A059] text-black shadow-md' 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Buscar
                      </button>
                    </div>

                    {!isManualEntry ? (
                      /* Search Form */
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-zinc-550 uppercase tracking-[0.2em]">Telefone ou Nome</label>
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-650" />
                            <input
                              type="text"
                              placeholder="Buscar cliente..."
                              className="w-full bg-[#111111] border border-white/[0.06] focus:border-[#C5A059] rounded-xl py-3 pl-9 pr-3 text-xs text-white outline-none transition-all placeholder:text-zinc-700"
                              value={searchQuery}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d/.test(val) || val === '') {
                                  setSearchQuery(formatPhone(val));
                                } else {
                                  setSearchQuery(val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSearch();
                                }
                              }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsSearchOpen(true)}
                          className="w-full text-center text-[8px] font-black text-[#C5A059]/70 hover:text-[#C5A059] uppercase tracking-widest pt-2 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Search size={10} />
                          Ver lista completa
                        </button>
                      </div>
                    ) : (
                      /* New Client Form */
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-zinc-550 uppercase tracking-[0.2em]">Nome Completo</label>
                          <input
                            type="text"
                            placeholder="Insira o nome do cliente"
                            className="w-full bg-[#111111] border border-white/[0.06] focus:border-[#C5A059] rounded-xl px-4 py-3 text-xs text-white outline-none transition-all placeholder:text-zinc-700"
                            value={newClient.name}
                            onChange={(e) => setNewClient({ ...newClient, name: e.target.value.toUpperCase() })}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-zinc-550 uppercase tracking-[0.2em]">Telefone</label>
                          <input
                            type="tel"
                            placeholder="(00) 00000-0000"
                            className="w-full bg-[#111111] border border-white/[0.06] focus:border-[#C5A059] rounded-xl px-4 py-3 text-xs text-white outline-none transition-all placeholder:text-zinc-700"
                            value={newClient.phone}
                            onChange={(e) => setNewClient({ ...newClient, phone: formatPhone(e.target.value) })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {((!selectedClient && isManualEntry) || selectedClient) && (
                <div className="pt-4 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <AlertCircle size={12} className="shrink-0 text-zinc-550" />
                    <p className="text-[9px] font-bold leading-normal">
                      {selectedClient 
                        ? 'Cliente selecionado.' 
                        : 'Preencha o nome e o telefone para cadastrar o cliente na hora da reserva.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 2: SERVICES SELECTION */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-3 bg-[#0C0C0C]/80 border border-white/[0.05] p-5 rounded-2xl flex flex-col justify-between min-h-[580px] backdrop-blur-xl relative">
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-2 pb-4 border-b border-white/[0.04] shrink-0">
                  <Scissors size={18} className="text-[#C5A059] shrink-0" />
                  <div>
                    <h2 className="text-xs font-black tracking-[0.2em] text-white uppercase leading-none">SERVIÇOS</h2>
                  </div>
                  <span className="ml-auto bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded text-[9px] font-black tracking-wider">
                    {selectedServices.length} SEL
                  </span>
                </div>

                <div className="space-y-2 overflow-y-auto pr-1 scrollbar-hide flex-1 min-h-0">
                  {services.map(service => {
                    const isSelected = selectedServices.some(s => s.id === service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`w-full text-left p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all relative cursor-pointer ${
                          isSelected
                            ? 'border-[#C5A059] bg-[#C5A059]/[0.04] shadow-[0_0_15px_rgba(197,160,89,0.04)]'
                            : 'border-white/[0.04] bg-[#111111] hover:border-white/[0.1] hover:bg-white/[0.01]'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full gap-2">
                          <span className={`text-[11px] font-black uppercase tracking-wider leading-none truncate ${
                            isSelected ? 'text-[#C5A059]' : 'text-zinc-300'
                          }`}>
                            {service.name}
                          </span>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'border-[#C5A059] bg-[#C5A059]' : 'border-zinc-700'
                          }`}>
                            {isSelected && <Check size={10} className="text-black" strokeWidth={3.5} />}
                          </div>
                        </div>
                        <div className="flex justify-between items-end w-full pt-1.5 border-t border-white/[0.02]">
                          <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">
                            Valor
                          </span>
                          <span className={`text-xs font-black ${
                            isSelected ? 'text-[#C5A059]' : 'text-zinc-400'
                          }`}>
                            R$ {Number(service.price).toFixed(0)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUMN 3: DATE & TIME SELECTION */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-3 bg-[#0C0C0C]/80 border border-white/[0.05] p-5 rounded-2xl flex flex-col justify-between min-h-[580px] backdrop-blur-xl relative">
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-2 pb-4 border-b border-white/[0.04] shrink-0">
                  <CalendarIcon size={18} className="text-[#C5A059] shrink-0" />
                  <div>
                    <h2 className="text-xs font-black tracking-[0.2em] text-white uppercase leading-none">AGENDA</h2>
                  </div>
                </div>

                {/* Day Horizontal Ribbon Picker */}
                <div className="shrink-0 space-y-2">
                  <span className="text-[8px] font-black text-zinc-550 uppercase tracking-[0.2em] pl-0.5 block">Selecione o Dia</span>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/[0.06] scrollbar-track-transparent snap-x -mx-1 px-1">
                    {nextDays.map(day => {
                      const isSelected = selectedDate === day.fullDate;
                      const monthAbbr = new Date(day.fullDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                      return (
                        <button
                          key={day.fullDate}
                          type="button"
                          onClick={() => {
                            setSelectedDate(day.fullDate);
                            setSelectedTime('');
                          }}
                          className={`min-w-[68px] py-3 rounded-xl border flex flex-col items-center gap-0.5 transition-all text-center snap-center cursor-pointer shrink-0 ${
                            isSelected
                              ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059] font-black shadow-[0_0_15px_rgba(197,160,89,0.06)]'
                              : 'border-white/[0.04] bg-[#111111] text-zinc-500 hover:text-white hover:border-white/[0.1]'
                          }`}
                        >
                          <span className="text-[8px] font-black uppercase tracking-wider opacity-60 leading-none">{day.dayName}</span>
                          <span className="text-base font-light leading-none my-0.5">{day.dayNumber}</span>
                          <span className="text-[8px] font-bold uppercase tracking-wider opacity-45 leading-none">{monthAbbr}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots Selector */}
                <div className="flex-1 min-h-0 flex flex-col space-y-2.5 pt-3 border-t border-white/[0.04]">
                  <span className="text-[8px] font-black text-zinc-550 uppercase tracking-[0.2em] pl-0.5 block">Horários Disponíveis</span>
                  {selectedDate ? (
                    <div className="grid grid-cols-3 gap-1.5 overflow-y-auto pr-1 scrollbar-hide flex-1 min-h-0">
                      {getTimeSlotsForDate(selectedDate).map(time => {
                        const occupied = isOccupied(time);
                        const isSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            type="button"
                            disabled={occupied}
                            onClick={() => setSelectedTime(time)}
                            className={`py-1.5 rounded-md border text-[10px] font-bold tracking-wider text-center transition-all cursor-pointer ${
                              occupied
                                ? 'text-zinc-800 border-transparent opacity-15 cursor-not-allowed line-through bg-transparent'
                                : isSelected
                                  ? 'text-[#C5A059] border-[#C5A059] bg-[#C5A059]/[0.03] font-black'
                                  : 'text-zinc-500 border-white/[0.04] bg-transparent hover:border-white/10 hover:text-zinc-200'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center p-4 border border-dashed border-white/[0.04] rounded-xl">
                      <p className="text-zinc-550 text-[10px] uppercase tracking-widest leading-relaxed">
                        Selecione um dia da semana para listar os horários livres.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 4: BOOKING SUMMARY & SUBMIT */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-3 bg-[#0C0C0C]/90 border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between min-h-[580px] shadow-[0_15px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#C5A059] to-transparent" />
              
              <div className="space-y-6">
                <div className="text-center pb-1">
                  <h2 className="text-[10px] font-black tracking-[0.3em] text-[#C5A059] uppercase">RESUMO</h2>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/[0.04]">
                  {/* Client Summary */}
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] block">Cliente</span>
                    {selectedClient || newClient.name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                        <p className="text-sm font-bold text-white uppercase italic truncate">
                          {selectedClient ? selectedClient.name : newClient.name}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-zinc-800 uppercase tracking-widest">—</p>
                    )}
                  </div>

                  {/* Services Summary */}
                  <div className="space-y-1.5 border-t border-white/[0.03] pt-3">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] block">Serviços</span>
                    {selectedServices.length > 0 ? (
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-hide">
                        {selectedServices.map(s => (
                          <div key={`desk-sum-${s.id}`} className="flex justify-between items-center text-[11px]">
                            <span className="text-zinc-300 font-bold uppercase tracking-tight truncate max-w-[70%]">{s.name}</span>
                            <span className="text-[#C5A059] font-black italic">R$ {Number(s.price).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-zinc-800 uppercase tracking-widest">—</p>
                    )}
                  </div>

                  {/* Date & Time Summary */}
                  <div className="border-t border-white/[0.03] pt-3 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] block mb-1">Data</span>
                      {selectedDate ? (
                        <p className="text-xs font-black text-white italic">
                          {selectedDate.split('-').reverse().join('/')}
                        </p>
                      ) : (
                        <p className="text-zinc-700 font-bold text-[10px] tracking-widest">—</p>
                      )}
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-zinc-550 uppercase tracking-[0.2em] block mb-1">Horário</span>
                      {selectedTime ? (
                        <p className="text-xs font-black text-[#C5A059] italic">
                          {selectedTime}
                        </p>
                      ) : (
                        <p className="text-zinc-700 font-bold text-[10px] tracking-widest">—</p>
                      )}
                    </div>
                  </div>


                </div>
              </div>

              <div className="pt-6 border-t border-white/[0.04] space-y-4 shrink-0">
                <div className="flex justify-between items-end">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">TOTAL</span>
                  <p className="text-2xl font-black text-white italic tracking-tighter leading-none">
                    <span className="text-[10px] font-bold text-[#C5A059] mr-0.5">R$</span>
                    {totalPrice.toFixed(0)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSubmitting || !selectedTime || !isStepValid(1) || !isStepValid(2) || !isStepValid(3)}
                  className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                    isSubmitting || !selectedTime || !isStepValid(1) || !isStepValid(2) || !isStepValid(3)
                      ? 'bg-white/[0.02] border border-white/[0.04] text-zinc-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#C5A059] to-[#E5C07B] text-black hover:opacity-90 shadow-lg shadow-[#C5A059]/10'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin text-black" />
                      <span>Confirmando...</span>
                    </>
                  ) : (
                    <span>{rescheduleBooking ? 'Confirmar Reagendamento' : 'Finalizar Reserva'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <BookingSearchModal
          isOpen={isSearchOpen}
          onClose={() => { setIsSearchOpen(false); }}
          onSelectClient={(client) => {
            setSelectedClient(client);
            setIsSearchOpen(false);
            setIsManualEntry(false);
          }}
          clients={clients}
        />
      </AdminLayout>
    );
  }

  return (
    <div className="h-screen lg:min-h-screen bg-[#121212] text-white font-sans selection:bg-[#C5A059]/30 flex flex-col relative overflow-hidden">
      
      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex flex-col flex-1 relative z-10 overflow-visible w-full bg-[#0A0A0A]">

        {/* Header */}
        <header className="w-full px-10 py-4 flex items-center justify-between shrink-0 sticky top-0 z-30 bg-[#0A0A0A] border-b border-white/[0.04]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xs font-bold tracking-[0.2em] text-white uppercase">
                {rescheduleBooking ? 'Reagendar Atendimento' : 'Novo Agendamento'}
              </h1>
              <div className="w-px h-4 bg-white/[0.08]" />
              <span className="text-[9px] font-bold tracking-[0.15em] text-zinc-600 uppercase">Black Diamond</span>
            </div>
          </div>
        </header>

        {/* Steps */}
        {!rescheduleBooking && (
          <div className="w-full px-10 py-5 border-b border-white/[0.03] shrink-0 bg-[#0A0A0A]">
            <div className="max-w-lg mx-auto flex items-center gap-0">
              {[
                { step: 1, num: '01', title: 'CLIENTE' },
                { step: 2, num: '02', title: 'SERVIÇOS' },
                { step: 3, num: '03', title: 'AGENDA' },
              ].map((s, idx) => {
                const isActive = currentStep === s.step;
                const isPassed = s.step < currentStep;
                const canClick = s.step < currentStep || (s.step === 2 && selectedClient) || (s.step === 3 && selectedClient && selectedServices.length > 0);
                return (
                  <React.Fragment key={s.step}>
                    <button
                      disabled={!canClick}
                      onClick={() => setCurrentStep(s.step)}
                      className="flex items-center gap-2.5 transition-all cursor-pointer group shrink-0"
                    >
                      <div className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all rounded-xl ${
                        isActive ? 'bg-[#C5A059] text-black' : isPassed ? 'bg-[#C5A059]/15 text-[#C5A059]' : 'bg-white/[0.04] text-zinc-600 border border-white/[0.04] group-hover:border-white/[0.1]'
                      }`}>
                        {isPassed ? <Check size={12} strokeWidth={3} /> : s.num}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${
                        isActive ? 'text-[#C5A059]' : isPassed ? 'text-white/50' : 'text-zinc-600 group-hover:text-zinc-400'
                      }`}>{s.title}</span>
                    </button>
                    {idx < 2 && (
                      <div className={`flex-1 h-[1px] mx-4 transition-all ${
                        isPassed ? 'bg-[#C5A059]/30' : 'bg-white/[0.04]'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="w-full max-w-6xl mx-auto px-10 pt-8 pb-12 flex-1 flex flex-col overflow-visible">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start flex-1 overflow-visible h-full">

            {/* LEFT: Steps */}
            <div className="lg:col-span-8 flex flex-col h-full overflow-visible">
              <AnimatePresence mode="wait">
                    {/* STEP 1: CLIENT IDENTIFICATION */}
                    {currentStep === 1 && (
                      <motion.div
                        key="step-client"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6 lg:space-y-8 h-full flex flex-col justify-between overflow-visible pr-1 scrollbar-hide"
                      >
                        <div className="space-y-2">
                          <h2 className="text-2xl font-bold uppercase tracking-tight">CLIENTE</h2>
                          <p className="text-zinc-500 text-sm">
                            {selectedClient 
                              ? 'Cliente selecionado com sucesso.' 
                              : isManualEntry 
                                ? 'Insira os dados do cliente abaixo.' 
                                : 'Busque pelo WhatsApp ou nome cadastrado.'}
                          </p>
                        </div>

                        {selectedClient ? (
                          <div className="p-5 sm:p-6 bg-[#111111] border border-white/[0.06] flex items-center justify-between gap-4 min-w-0 transition-all group hover:border-[#C5A059]/30 rounded-xl">
                            <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
                              <div className="w-12 h-12 bg-[#0A0A0A] border border-white/[0.08] flex items-center justify-center text-[#C5A059] text-lg font-bold transition-all duration-300 shrink-0">
                                {selectedClient.name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[8px] font-bold text-[#C5A059] tracking-[0.25em] uppercase block mb-1">CLIENTE CADASTRADO</span>
                                <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide leading-none truncate">{selectedClient.name}</h3>
                                <p className="text-xs text-zinc-500 mt-2 truncate">{selectedClient.phone}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClient(null);
                                setSearchQuery('');
                                setIsManualEntry(true);
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] hover:text-white transition-all cursor-pointer px-3 py-1.5 shrink-0 bg-white/[0.03] border border-[#C5A059]/20 rounded-xl hover:bg-white/[0.08] hover:border-[#C5A059]/40 active:scale-95"
                            >
                              Alterar
                            </button>
                          </div>
                        ) : !isManualEntry ? (
                          multipleMatches.length > 0 ? (
                            <div className="space-y-4">
                              <div className="p-4 bg-[#111111] border border-white/[0.06] text-xs text-zinc-400 uppercase tracking-wider">
                                Múltiplos clientes encontrados. Selecione o correto abaixo:
                              </div>
                              <div className="divide-y divide-white/[0.04] border border-white/[0.06] max-h-60 overflow-y-auto scrollbar-hide bg-[#111111]">
                                {multipleMatches.map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedClient(c);
                                      setMultipleMatches([]);
                                    }}
                                    className="w-full text-left p-4 hover:bg-white/[0.02] transition-all flex items-center justify-between cursor-pointer group"
                                  >
                                    <div>
                                      <p className="text-base font-bold text-zinc-300 group-hover:text-white uppercase tracking-wide leading-none">{c.name}</p>
                                      <p className="text-xs text-zinc-600 group-hover:text-zinc-500 mt-1.5 transition-colors">{c.phone}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-[#C5A059] group-hover:translate-x-0.5 transition-all" />
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setMultipleMatches([]);
                                  setSearchQuery('');
                                }}
                                className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] hover:text-white transition-colors cursor-pointer"
                              >
                                Fazer nova busca
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="space-y-3">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-0.5">TELEFONE OU NOME DO CLIENTE</label>
                                <div className="flex gap-3">
                                  <div className="relative flex-1">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                                    <input
                                      type="text"
                                      placeholder="Digite o número (ou nome)..."
                                      className="w-full bg-transparent border-b-2 border-white/[0.06] focus:border-[#C5A059] py-4 pl-12 pr-4 text-base text-white outline-none transition-all placeholder:text-zinc-700 font-medium"
                                      value={searchQuery}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (/^\d/.test(val) || val === '') {
                                          setSearchQuery(formatPhone(val));
                                        } else {
                                          setSearchQuery(val);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSearch();
                                        }
                                      }}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleSearch}
                                    disabled={!searchQuery.trim() || isSearchingClient}
                                    className="px-8 bg-[#111111] border border-white/[0.06] hover:border-[#C5A059]/30 hover:bg-[#C5A059]/5 text-[#C5A059] text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    {isSearchingClient ? (
                                      <Loader2 size={12} className="animate-spin text-[#C5A059]" />
                                    ) : (
                                      'Buscar'
                                    )}
                                  </button>
                                </div>
                              </div>
                              
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => setIsSearchOpen(true)}
                                  className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#C5A059] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Search size={11} />
                                  <span>Buscar Cliente Cadastrado</span>
                                </button>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-0.5">NOME DO CLIENTE</label>
                                <input 
                                  type="text" 
                                  placeholder="Digite o nome completo"
                                  className="w-full bg-transparent border-b-2 border-white/[0.06] focus:border-[#C5A059] px-0 py-3.5 text-base text-white outline-none transition-all placeholder:text-zinc-700 font-medium"
                                  value={newClient.name}
                                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value.toUpperCase() })}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-0.5">TELEFONE (WHATSAPP)</label>
                                <input 
                                  type="tel" 
                                  placeholder="(00) 00000-0000"
                                  className="w-full bg-transparent border-b-2 border-white/[0.06] focus:border-[#C5A059] px-0 py-3.5 text-base text-white outline-none transition-all placeholder:text-zinc-700 font-medium"
                                  value={newClient.phone}
                                  onChange={(e) => setNewClient({ ...newClient, phone: formatPhone(e.target.value) })}
                                />
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-6">
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setIsSearchOpen(true)}
                                  className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#C5A059] hover:text-white transition-colors flex items-center gap-2 cursor-pointer group"
                                >
                                  <Search size={11} className="text-[#C5A059] group-hover:text-white transition-colors" />
                                  <span>Buscar Cliente Cadastrado</span>
                                </button>
                              </div>
                              
                              <div className="pt-6 border-t border-white/[0.04]">
                                <button
                                  type="button"
                                  onClick={handleNextStep}
                                  disabled={!isStepValid(1)}
                                  className="px-10 py-4 bg-white text-black hover:bg-[#C5A059] hover:text-black text-[10px] font-bold uppercase tracking-[0.3em] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  Avançar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* STEP 2: SERVICE TILES SELECTION */}
                    {currentStep === 2 && (
                      <motion.div
                        key="step-services"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6 lg:space-y-8 h-full flex flex-col overflow-visible"
                      >
                        <div className="space-y-2">
                          <h2 className="text-2xl font-bold uppercase tracking-tight">ESCOLHA OS SERVIÇOS</h2>
                          <p className="text-zinc-500 text-sm">Selecione os serviços que farão parte do atendimento.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-1 pb-0">
                          {services.map(service => {
                            const isSelected = selectedServices.some(s => s.id === service.id);
                            return (
                              <div 
                                key={service.id}
                                onClick={() => toggleService(service)}
                                className={`p-5 border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[140px] relative group select-none ${
                                  isSelected 
                                    ? 'border-[#C5A059] bg-[#C5A059]/[0.04]' 
                                    : 'border-white/[0.06] bg-[#111111] hover:border-white/[0.12]'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <div className="space-y-1 min-w-0">
                                    <h3 className={`font-bold uppercase tracking-tight text-base leading-none truncate ${isSelected ? 'text-[#C5A059]' : 'text-zinc-300 group-hover:text-white'}`}>
                                      {service.name}
                                    </h3>
                                  </div>
                                  <div className={`w-4 h-4 border flex items-center justify-center transition-all shrink-0 ${isSelected ? 'border-[#C5A059] bg-transparent' : 'border-white/[0.08] group-hover:border-white/[0.15]'}`}>
                                    {isSelected && <Check size={10} className="text-[#C5A059]" strokeWidth={3} />}
                                  </div>
                                </div>
                                <div className="flex justify-between items-end pt-4 border-t border-white/[0.04] mt-4">
                                  <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest">Valor</span>
                                  <span className={`font-bold text-lg ${isSelected ? 'text-[#C5A059]' : 'text-white'}`}>
                                    R$ {Number(service.price).toFixed(0)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-6 border-t border-white/[0.04]">
                          <button
                            type="button"
                            onClick={handleNextStep}
                            disabled={selectedServices.length === 0}
                            className="px-10 py-4 bg-white text-black hover:bg-[#C5A059] text-[10px] font-bold uppercase tracking-[0.3em] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Avançar
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 3: SCHEDULE / CALENDAR & SHIFTS */}
                    {currentStep === 3 && (
                      <motion.div
                        key="step-calendar"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6 lg:space-y-10 h-full flex flex-col overflow-visible"
                      >
                        {rescheduleBooking ? (
                          <div className="p-5 bg-[#111111] border border-[#C5A059]/20 flex flex-col gap-2 relative text-left">
                            <span className="text-[8px] font-bold text-[#C5A059] uppercase tracking-[0.25em]">REAGENDANDO ATENDIMENTO</span>
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                              <h3 className="text-base font-bold text-white uppercase tracking-wide leading-none">{rescheduleBooking.clients?.name}</h3>
                              <span className="text-zinc-600 hidden sm:inline">•</span>
                              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{selectedServices.map(s => s.name).join(' + ')}</p>
                            </div>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
                              Original: {new Date(rescheduleBooking.booking_date.replace(/-/g, '/')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {rescheduleBooking.booking_time.slice(0, 5)}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <h2 className="text-2xl font-bold uppercase tracking-tight">ESCOLHA DATA E HORÁRIO</h2>
                            <p className="text-zinc-500 text-sm">Defina o dia e horário do agendamento.</p>
                          </div>
                        )}

                        <div className="space-y-3">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] block pl-0.5">Selecione o Dia</span>
                          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                            {nextDays.map(day => {
                              const isSelected = selectedDate === day.fullDate;
                              return (
                                <button
                                  key={day.fullDate}
                                  type="button"
                                  onClick={() => setSelectedDate(day.fullDate)}
                                  className={`flex flex-col items-center gap-1 select-none cursor-pointer group shrink-0 p-4 min-w-[75px] transition-all duration-300 border ${
                                    isSelected 
                                      ? 'border-[#C5A059] bg-[#C5A059]/[0.04] text-[#C5A059]' 
                                      : 'border-white/[0.06] bg-[#111111] text-zinc-500 hover:border-white/[0.12] hover:text-white'
                                  }`}
                                >
                                  <span className="text-[9px] font-bold tracking-widest uppercase">{day.dayName}</span>
                                  <span className="text-2xl font-light">{day.dayNumber}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-4 pr-1 pb-0">
                          {selectedDate ? (
                            <div className="flex flex-col gap-3">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] pl-0.5">
                                Horários Disponíveis
                              </span>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {getTimeSlotsForDate(selectedDate).map(time => {
                                  const occupied = isOccupied(time);
                                  const isSelected = selectedTime === time;
                                  return (
                                    <button
                                      key={time}
                                      type="button"
                                      disabled={occupied}
                                      onClick={() => setSelectedTime(time)}
                                      className={`py-4 border text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                        occupied 
                                          ? 'text-zinc-800/10 border-transparent cursor-not-allowed line-through opacity-20 bg-transparent' 
                                          : isSelected 
                                            ? 'text-[#C5A059] border-[#C5A059] bg-[#C5A059]/[0.04] font-black' 
                                            : 'text-zinc-400 border-white/[0.06] bg-[#111111] hover:border-white/[0.12] hover:text-white'
                                      }`}
                                    >
                                      {time}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-zinc-500 text-xs py-4 text-center">Selecione um dia da semana acima para ver os horários disponíveis.</p>
                          )}
                        </div>

                        <div className="pt-6 border-t border-white/[0.04]">
                          <button
                            type="button"
                            onClick={handleFinish}
                            disabled={isSubmitting || !selectedTime || !isStepValid(1) || !isStepValid(2) || !isStepValid(3)}
                            className={`px-10 py-4 text-xs font-bold uppercase tracking-[0.3em] transition-all duration-300 cursor-pointer ${
                              isSubmitting || !selectedTime || !isStepValid(1) || !isStepValid(2) || !isStepValid(3)
                                ? 'bg-[#111111] text-zinc-600 border border-white/[0.04] opacity-30 cursor-not-allowed'
                                : 'bg-white text-black hover:bg-[#C5A059] hover:text-black active:scale-[0.98]'
                            }`}
                          >
                            {isSubmitting ? 'CONFIRMANDO...' : rescheduleBooking ? 'CONFIRMAR REAGENDAMENTO' : 'FINALIZAR RESERVA'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* RIGHT: Summary */}
            <BookingSummaryPanel
              selectedClient={selectedClient}
              newClient={newClient}
              selectedServices={selectedServices}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              totalPrice={totalPrice}
            />
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full max-w-6xl mx-auto px-10 pt-6 pb-6 mt-auto border-t border-white/[0.03] flex justify-center">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-700">
            © 2026 Black Diamond
          </p>
        </footer>
      </div>

      {/* MOBILE LAYOUT - APP-LIKE FIXED VIEWPORT */}
      <div className="lg:hidden flex-1 flex flex-col relative z-10 overflow-hidden h-[calc(100dvh-60px)] bg-[#050505]">
        {/* Sticky Header with Step Indicator */}
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
          {/* 3-Segment Progress Bar */}
          {!rescheduleBooking && (
            <div className="px-5 pb-3 flex items-center gap-2">
              {[
                { step: 1, label: 'Cliente' },
                { step: 2, label: 'Serviços' },
                { step: 3, label: 'Data' },
              ].map((s, idx) => {
                const isActive = currentStep === s.step;
                const isPassed = s.step < currentStep;
                return (
                  <React.Fragment key={s.step}>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1" aria-current={isActive ? 'step' : undefined}>
                      <div className={`w-5 h-5 flex items-center justify-center text-[8px] font-bold rounded-full transition-all shrink-0 ${
                        isActive 
                          ? 'bg-[#C5A059] text-black' 
                          : isPassed 
                            ? 'bg-[#C5A059]/20 text-[#C5A059]' 
                            : 'bg-white/[0.06] text-zinc-600'
                      }`}>
                        {isPassed ? <Check size={10} strokeWidth={3} /> : s.step}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider truncate transition-all ${
                        isActive ? 'text-[#C5A059]' : isPassed ? 'text-white/50' : 'text-zinc-600'
                      }`}>{s.label}</span>
                    </div>
                    {idx < 2 && (
                      <div className={`h-[2px] flex-1 rounded-full transition-all duration-500 ${
                        isPassed ? 'bg-[#C5A059]/30' : 'bg-white/[0.06]'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pt-5 pb-36 flex flex-col scrollbar-hide">
          <AnimatePresence mode="wait">
            {/* STEP 1: CLIENTE */}
            {currentStep === 1 && (
              <motion.div
                key="m-step-client"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5 h-full flex flex-col"
              >
                <div className="space-y-1 shrink-0">
                  <h2 className="text-lg font-bold text-white uppercase tracking-tight">Cliente</h2>
                  <p className="text-xs text-zinc-500">Busque ou cadastre o cliente</p>
                </div>

                {selectedClient ? (
                  <div className="p-3.5 sm:p-4 bg-[#111111] border border-[#C5A059]/30 rounded-2xl flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 bg-[#050505] border border-white/[0.08] rounded-xl flex items-center justify-center text-[#C5A059] text-base font-bold shrink-0">
                        {selectedClient.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] font-bold text-[#C5A059] tracking-widest uppercase block mb-0.5">CADASTRADO</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide leading-none truncate">{selectedClient.name}</h3>
                        <p className="text-[11px] text-zinc-500 mt-1 truncate">{selectedClient.phone}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setSearchQuery('');
                        setIsManualEntry(true);
                      }}
                      className="text-[9px] font-bold uppercase tracking-widest text-[#C5A059] cursor-pointer px-3 py-1.5 shrink-0 bg-white/[0.03] border border-[#C5A059]/20 rounded-xl hover:bg-white/[0.08] hover:border-[#C5A059]/40 hover:text-white transition-all duration-200 active:scale-95"
                    >
                      Alterar
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col space-y-4">
                    {isManualEntry ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">NOME DO CLIENTE</label>
                          <input 
                            type="text" 
                            placeholder="Nome completo"
                            className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-[#C5A059]/60 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-700"
                            value={newClient.name}
                            onChange={(e) => setNewClient({ ...newClient, name: e.target.value.toUpperCase() })}
                          />
                          {newClient.name.trim().length > 0 && newClient.name.trim().length < 3 && (
                            <p className="text-[9px] text-zinc-600 ml-1">Mínimo 3 caracteres</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TELEFONE (WHATSAPP)</label>
                          <input 
                            type="tel" 
                            placeholder="(00) 00000-0000"
                            className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-[#C5A059]/60 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-700"
                            value={newClient.phone}
                            onChange={(e) => setNewClient({ ...newClient, phone: formatPhone(e.target.value) })}
                          />
                          {newClient.phone.trim().length > 0 && newClient.phone.replace(/\D/g, '').length < 8 && (
                            <p className="text-[9px] text-zinc-600 ml-1">Telefone muito curto</p>
                          )}
                        </div>

                        <div className="pt-4 border-t border-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => {
                              setIsManualEntry(false);
                              setSearchQuery('');
                            }}
                            className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059] transition-colors cursor-pointer"
                          >
                            Buscar Cliente Existente →
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">WHATSAPP OU NOME</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                              <input
                                type="text"
                                placeholder="Digite para buscar..."
                                className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-[#C5A059]/60 rounded-xl py-3 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-zinc-700"
                                value={searchQuery}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (/^\d/.test(val) || val === '') {
                                    setSearchQuery(formatPhone(val));
                                  } else {
                                    setSearchQuery(val);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSearch();
                                  }
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleSearch}
                              disabled={!searchQuery.trim() || isSearchingClient}
                              className="px-5 bg-[#C5A059] text-black text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[90px] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                            >
                              {isSearchingClient ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
                            </button>
                          </div>
                        </div>

                        {multipleMatches.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Selecione o cliente:</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                              {multipleMatches.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClient(c);
                                    setMultipleMatches([]);
                                  }}
                                  className="w-full text-left p-3.5 bg-[#111111] border border-white/[0.06] rounded-xl hover:border-[#C5A059]/30 transition-all flex items-center justify-between cursor-pointer"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-white uppercase tracking-wide truncate">{c.name}</p>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">{c.phone}</p>
                                  </div>
                                  <ChevronRight size={14} className="text-[#C5A059] shrink-0 ml-2" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t border-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => {
                              setIsManualEntry(true);
                              setSearchQuery('');
                            }}
                            className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059] transition-colors cursor-pointer"
                          >
                            ← Cadastrar Novo Cliente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: SERVIÇOS */}
            {currentStep === 2 && (
              <motion.div
                key="m-step-services"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 h-full flex flex-col"
              >
                <div className="space-y-1 shrink-0">
                  <h2 className="text-lg font-bold text-white uppercase tracking-tight">Serviços</h2>
                  <p className="text-xs text-zinc-500">Selecione os serviços desejados</p>
                </div>

                <div className="divide-y divide-white/[0.04] border-t border-b border-white/[0.04] overflow-y-auto flex-1 scrollbar-hide pb-4">
                  {services.map(service => {
                    const isSelected = selectedServices.some(s => s.id === service.id);
                    return (
                      <button 
                        key={service.id} 
                        onClick={() => toggleService(service)} 
                        className="w-full flex items-center justify-between py-4 px-1 bg-transparent transition-all active:opacity-70 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Minimalist Check Indicator */}
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            {isSelected ? (
                              <Check size={16} className="text-[#C5A059]" strokeWidth={3} />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-white/20" />
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <p className={`text-[13px] font-bold tracking-wide uppercase ${
                              isSelected ? 'text-[#C5A059]' : 'text-zinc-200'
                            }`}>
                              {service.name}
                            </p>
                          </div>
                        </div>

                        <span className={`font-black text-sm shrink-0 ${
                          isSelected ? 'text-[#C5A059]' : 'text-zinc-400'
                        }`}>
                          R$ {Number(service.price).toFixed(0)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 3: DATA / HORÁRIO */}
            {currentStep === 3 && (
              <motion.div
                key="m-step-calendar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5 h-full flex flex-col"
              >
                {rescheduleBooking ? (
                  <div className="p-4 bg-[#111111] border border-[#C5A059]/20 rounded-2xl flex flex-col gap-1.5 shrink-0">
                    <span className="text-[8px] font-bold text-[#C5A059] uppercase tracking-[0.25em]">REAGENDANDO ATENDIMENTO</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide leading-none">{rescheduleBooking.clients?.name}</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">{selectedServices.map(s => s.name).join(' + ')}</p>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                      Original: {new Date(rescheduleBooking.booking_date.replace(/-/g, '/')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {rescheduleBooking.booking_time.slice(0, 5)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 shrink-0">
                    <h2 className="text-lg font-bold text-white uppercase tracking-tight">Data e horário</h2>
                    <p className="text-xs text-zinc-500">Selecione o melhor dia e horário</p>
                  </div>
                )}

                {/* Date Ribbon */}
                <div className="space-y-2 shrink-0">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SELECIONE O DIA</span>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 snap-x">
                    {nextDays.map(day => {
                      const isSelected = selectedDate === day.fullDate;
                      const monthAbbr = new Date(day.fullDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                      return (
                        <button 
                          key={day.fullDate} 
                          onClick={() => {
                            setSelectedDate(day.fullDate);
                            setSelectedTime('');
                          }} 
                          className={`min-w-[64px] py-3 transition-all duration-300 snap-center flex flex-col items-center gap-0.5 rounded-xl border ${
                            isSelected 
                              ? 'bg-[#C5A059]/10 border-[#C5A059]/50 text-[#C5A059]' 
                              : 'bg-[#111111] border-white/[0.06] text-zinc-500 hover:text-white hover:border-white/[0.12]'
                          }`}
                        >
                          <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">{day.dayName}</span>
                          <span className="text-xl font-bold text-white">{day.dayNumber}</span>
                          <span className="text-[8px] font-bold uppercase tracking-wider opacity-50">{monthAbbr}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-4 overflow-y-auto flex-1 scrollbar-hide pb-4">
                  {selectedDate ? (
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Horários Disponíveis</span>
                      <div className="grid grid-cols-4 gap-2">
                        {getTimeSlotsForDate(selectedDate).map(time => {
                          const occupied = isOccupied(time);
                          const isSelected = selectedTime === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={occupied}
                              onClick={() => setSelectedTime(time)}
                              className={`py-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                occupied 
                                  ? 'text-zinc-800 border-transparent cursor-not-allowed opacity-20 bg-transparent' 
                                  : isSelected 
                                    ? 'text-[#C5A059] border-[#C5A059]/50 bg-[#C5A059]/[0.08]' 
                                    : 'text-zinc-400 border-white/[0.06] bg-[#111111] hover:border-white/[0.12] hover:text-white'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <p className="text-zinc-600 text-xs">Selecione um dia acima para ver os horários.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Bottom Button - ALWAYS visible */}
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
              {!isSubmitting && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH CLIENT MODAL */}
      <BookingSearchModal
        isOpen={isSearchOpen}
        onClose={() => { setIsSearchOpen(false); }}
        onSelectClient={(client) => {
          setSelectedClient(client);
          setIsSearchOpen(false);
          setIsManualEntry(false);
        }}
        clients={clients}
      />

      <BottomTabs />

      {/* GOOGLE CALENDAR MODAL */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm text-center"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-emerald-500" />
            </div>
            <h3 className="text-white font-bold text-base mb-1">Agendamento confirmado!</h3>
            <p className="text-zinc-400 text-sm mb-6">Deseja adicionar no Google Agenda?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCalendarModal(false); navigate('/admin'); }}
                className="flex-1 h-11 rounded-xl bg-white/[0.06] border border-white/[0.06] text-zinc-400 text-sm font-medium hover:bg-white/[0.1] transition-colors"
              >
                Não
              </button>
              <button
                onClick={() => { window.open(calendarUrl, '_blank'); setShowCalendarModal(false); setTimeout(() => navigate('/admin'), 300); }}
                className="flex-1 h-11 rounded-xl bg-[#C5A059] text-black text-sm font-bold hover:bg-[#C5A059]/90 transition-colors"
              >
                Sim
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminBooking;
