import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createBooking, getBookings, getClients, deleteBooking } from '../lib/api';
import { TIME_SLOTS, getPeriod, formatPhone, getNextDays, isTimeOccupied } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useServices } from '../hooks/useServices';
import type { Service, Client, Booking } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import BottomTabs from '../components/Admin/BottomTabs';
import BookingSearchModal from '../components/Admin/shared/BookingSearchModal';
import BookingSummaryPanel from '../components/Admin/shared/BookingSummaryPanel';
import { 
  ArrowLeft, 
  ChevronRight,
  Check,
  Loader2,
  Search
} from 'lucide-react';

const AdminBooking: React.FC = () => {
  const nextDays = useMemo(() => getNextDays(), []);
  const location = useLocation();
  const navigate = useNavigate();
  const rescheduleBooking = location.state?.rescheduleBooking;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { services } = useServices();
  const [clients, setClients] = useState<Client[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const { showSuccess, showError } = useToast();
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ name: '', phone: '' });
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  
  const [currentStep, setCurrentStep] = useState(() => {
    if (location.state?.rescheduleBooking) return 3;
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
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [rescheduleBooking]);

  useEffect(() => {
    if (selectedDate) {
      const loadBookings = async () => {
        try {
          const data = await getBookings(selectedDate);
          setExistingBookings(data || []);
        } catch (error) {
          console.error(error);
        }
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
      showSuccess(rescheduleBooking?.id ? 'Agendamento reagendado com sucesso!' : 'Agendamento realizado!');
      setTimeout(() => navigate('/admin'), 1500);
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

  return (
    <div className="h-screen lg:min-h-screen bg-[#121212] text-white font-sans selection:bg-[#C5A059]/30 flex flex-col relative overflow-hidden">
      
      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex flex-col flex-1 relative z-10 overflow-visible w-full bg-[#0A0A0A]">

        {/* Premium Minimal Header */}
        <div className="w-full px-10 py-5 flex items-center justify-between shrink-0 sticky top-0 z-30 bg-[#0A0A0A] border-b border-white/[0.04]">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/admin')}
              className="w-9 h-9 flex items-center justify-center border border-white/[0.06] text-zinc-400 hover:text-white hover:border-[#C5A059]/40 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-sm font-semibold tracking-[0.2em] text-white uppercase">
              {rescheduleBooking ? 'Reagendar Atendimento' : 'Novo Agendamento'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]/60" />
            <span className="text-[9px] font-medium tracking-[0.15em] text-zinc-500 uppercase">Black Diamond</span>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="w-full max-w-7xl mx-auto px-10 pt-8 pb-16 flex-1 flex flex-col overflow-visible">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-16 items-start flex-1 overflow-visible h-full">
            
            {/* LEFT SIDE: Booking Steps */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full justify-between overflow-visible">
              <div>
                
                {/* Premium Step Indicator */}
                {!rescheduleBooking && (
                  <div className="flex items-center justify-center gap-0 mb-10 px-4">
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
                            className="flex items-center gap-3 shrink-0 transition-all cursor-pointer group"
                          >
                            <div className={`w-8 h-8 flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                              isActive 
                                ? 'bg-[#C5A059] text-black' 
                                : isPassed 
                                  ? 'bg-[#C5A059]/15 text-[#C5A059]' 
                                  : 'bg-white/[0.03] text-zinc-600 border border-white/[0.04]'
                            }`}>
                              {isPassed ? <Check size={13} strokeWidth={3} /> : s.num}
                            </div>
                            <div className="flex flex-col items-start">
                              <span className={`text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${
                                isActive ? 'text-[#C5A059]' : isPassed ? 'text-white/70' : 'text-zinc-600'
                              }`}>{s.title}</span>
                              <div className={`h-[1px] mt-1 transition-all duration-300 ${
                                isActive ? 'w-full bg-[#C5A059]/40' : isPassed ? 'w-full bg-[#C5A059]/20' : 'w-0 bg-white/10'
                              }`} />
                            </div>
                          </button>
                          {idx < 2 && (
                            <div className={`w-12 h-[1px] mx-3 transition-all duration-500 ${
                              s.step < currentStep ? 'bg-[#C5A059]/30' : 'bg-white/[0.04]'
                            }`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {/* Animated Step Slides */}
                <div className="relative flex-1 overflow-visible">
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
                          <div className="p-6 bg-[#111111] border border-white/[0.06] flex items-center justify-between transition-all group hover:border-[#C5A059]/30">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 bg-[#0A0A0A] border border-white/[0.08] flex items-center justify-center text-[#C5A059] text-lg font-bold transition-all duration-300">
                                {selectedClient.name.charAt(0)}
                              </div>
                              <div>
                                <span className="text-[8px] font-bold text-[#C5A059] tracking-[0.25em] uppercase block mb-1">CLIENTE CADASTRADO</span>
                                <h3 className="text-lg font-bold text-white uppercase tracking-wide leading-none">{selectedClient.name}</h3>
                                <p className="text-xs text-zinc-500 mt-2">{selectedClient.phone}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClient(null);
                                setSearchQuery('');
                                setIsManualEntry(true);
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] hover:text-white transition-colors cursor-pointer"
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
                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-0.5">WHATSAPP OU NOME DO CLIENTE</label>
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

                        <div className="space-y-8 pr-1 pb-0">
                          {selectedDate ? (
                            ['Manhã', 'Tarde', 'Noite'].map((period) => {
                              const periodSlots = TIME_SLOTS.filter(time => getPeriod(time) === period);
                              if (periodSlots.length === 0) return null;

                              return (
                                <div key={period} className="flex flex-col gap-3">
                                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] pl-0.5">
                                    Turno da {period}
                                  </span>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                    {periodSlots.map(time => {
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
                              );
                            })
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
              </div>
            </div>

            {/* RIGHT SIDE: Booking Summary Panel */}
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

        {/* Minimal Footer */}
        <footer className="w-full max-w-7xl mx-auto px-10 pt-8 pb-8 mt-auto border-t border-white/[0.04] flex justify-center items-center gap-4 relative z-10">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-600">
            © 2026 BLACK DIAMOND — TODOS OS DIREITOS RESERVADOS
          </p>
        </footer>
      </div>

      {/* MOBILE LAYOUT - APP-LIKE FIXED VIEWPORT */}
      <div className="lg:hidden flex-1 flex flex-col relative z-10 overflow-hidden h-[calc(100dvh-60px)] bg-[#121212]">
        {/* Custom Mobile Header */}
        <header className="px-6 py-5 flex items-center gap-4 shrink-0">
          <button 
            onClick={() => currentStep > 1 && !rescheduleBooking ? setCurrentStep(currentStep - 1) : navigate('/admin')}
            className="text-zinc-500 hover:text-white transition-all mr-1 active:scale-95 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-white tracking-tighter uppercase italic leading-none">
            {rescheduleBooking ? 'Reagendar Atendimento' : 'Novo Agendamento'}
          </h1>
        </header>

        {/* Frozen Content Area */}
        <div className="flex-1 overflow-hidden px-6 pt-5 pb-32 flex flex-col">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="m-step-client"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 h-full flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between shrink-0">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white uppercase italic tracking-tight">Cliente</h2>
                    <p className="text-xs text-zinc-500 font-light">Busque ou cadastre o cliente</p>
                  </div>
                  {!selectedClient && (
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(true)}
                      className="px-3 py-1.5 bg-white/[0.02] border border-white/[0.06] hover:bg-white hover:text-black rounded-lg text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <Search size={11} />
                      <span>Buscar</span>
                    </button>
                  )}
                </div>

                {selectedClient ? (
                  <div className="p-5 border border-[#C5A059]/35 bg-[#C5A059]/5 flex items-center justify-between transition-all group rounded-none">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-zinc-950 border border-white/[0.05] flex items-center justify-center text-[#C5A059] text-base font-black italic">
                        {selectedClient.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-[#C5A059] tracking-widest uppercase block mb-0.5">CLIENTE CADASTRADO</span>
                        <h3 className="text-base font-bold text-white uppercase italic leading-none">{selectedClient.name}</h3>
                        <p className="text-[11px] text-zinc-555 mt-1.5 font-medium">{selectedClient.phone}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setSearchQuery('');
                        setIsManualEntry(true);
                      }}
                      className="text-[9px] font-bold uppercase tracking-widest text-[#C5A059] hover:text-white underline underline-offset-4 cursor-pointer"
                    >
                      Alterar
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-hidden pr-1 scrollbar-hide pb-4 space-y-6">
                      {isManualEntry ? (
                        <div className="space-y-6">
                          <div className="space-y-2.5">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-0.5">NOME DO CLIENTE</label>
                            <input 
                              type="text" 
                              placeholder="DIGITE O NOME COMPLETO"
                              className="w-full bg-transparent border-b border-white/[0.06] focus:border-[#C5A059] py-3 text-base text-white outline-none transition-all placeholder:text-zinc-800 uppercase italic font-bold tracking-wider"
                              value={newClient.name}
                              onChange={(e) => setNewClient({ ...newClient, name: e.target.value.toUpperCase() })}
                            />
                            {newClient.name.trim().length > 0 && newClient.name.trim().length < 3 && (
                              <p className="text-[8px] text-zinc-700 uppercase tracking-widest ml-0.5 italic">Mínimo 3 caracteres</p>
                            )}
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-0.5">TELEFONE (WHATSAPP)</label>
                            <input 
                              type="tel" 
                              placeholder="(00) 00000-0000"
                              className="w-full bg-transparent border-b border-white/[0.06] focus:border-[#C5A059] py-3 text-base text-white outline-none transition-all placeholder:text-zinc-800 italic font-bold tracking-wider"
                              value={newClient.phone}
                              onChange={(e) => setNewClient({ ...newClient, phone: formatPhone(e.target.value) })}
                            />
                            {newClient.phone.trim().length > 0 && newClient.phone.replace(/\D/g, '').length < 8 && (
                              <p className="text-[8px] text-zinc-700 uppercase tracking-widest ml-0.5 italic">Telefone muito curto</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-0.5">WHATSAPP OU NOME</label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                  type="text"
                                  placeholder="DIGITE PARA BUSCAR..."
                                  className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-[#C5A059] py-3 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-zinc-800 italic font-bold uppercase tracking-wider"
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
                                className="px-5 bg-zinc-900 border border-white/[0.04] text-[#C5A059] text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[90px] disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                {isSearchingClient ? <Loader2 size={12} className="animate-spin text-[#C5A059]" /> : 'Buscar'}
                              </button>
                            </div>
                          </div>

                          {multipleMatches.length > 0 && (
                            <div className="space-y-3">
                              <div className="p-3 bg-zinc-950 border border-white/[0.03] text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                                Selecione o cliente abaixo:
                              </div>
                              <div className="divide-y divide-white/[0.02] border border-white/[0.04] max-h-48 overflow-y-auto scrollbar-hide bg-[#121212]/40">
                                {multipleMatches.map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedClient(c);
                                      setMultipleMatches([]);
                                    }}
                                    className="w-full text-left p-3.5 hover:bg-white/[0.02] transition-all flex items-center justify-between cursor-pointer group"
                                  >
                                    <div>
                                      <p className="text-sm font-bold text-zinc-300 group-hover:text-white uppercase italic leading-none">{c.name}</p>
                                      <p className="text-[10px] text-zinc-600 mt-1 transition-colors">{c.phone}</p>
                                    </div>
                                    <ChevronRight size={12} className="text-[#C5A059]" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Minimalist register switch link at the bottom */}
                          <div className="pt-6 border-t border-white/[0.02] flex justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setIsManualEntry(true);
                                setSearchQuery('');
                              }}
                              className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#C5A059] hover:underline transition-colors cursor-pointer"
                            >
                              ← Cadastrar Novo Cliente
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="m-step-services"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 h-full flex flex-col overflow-hidden"
              >
                <div className="space-y-1 shrink-0">
                  <h2 className="text-xl font-bold text-white uppercase italic tracking-tight">Serviços</h2>
                  <p className="text-xs text-zinc-500 font-light">Selecione os serviços desejados</p>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 scrollbar-hide pb-24">
                  {services.map(service => {
                    const isSelected = selectedServices.some(s => s.id === service.id);
                    return (
                      <button 
                        key={service.id} 
                        onClick={() => toggleService(service)} 
                        className={`w-full flex items-center justify-between p-4 transition-all duration-300 rounded-none border-b ${
                          isSelected 
                            ? 'bg-[#C5A059]/5 border-[#C5A059] shadow-[0_0_20px_rgba(184,155,73,0.02)]' 
                            : 'bg-transparent border-white/[0.04] hover:border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 text-left min-w-0">
                          <div className={`w-4 h-4 border flex items-center justify-center transition-all shrink-0 ${isSelected ? 'border-[#C5A059]' : 'border-zinc-850'}`}>
                            {isSelected && <Check size={10} className="text-[#C5A059] stroke-[4px]" />}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className={`text-sm font-bold italic uppercase tracking-tight ${isSelected ? 'text-[#C5A059]' : 'text-zinc-200'}`}>{service.name}</p>
                          </div>
                        </div>
                        <span className={`font-black italic text-sm tracking-tight shrink-0 ${isSelected ? 'text-[#C5A059]' : 'text-zinc-500'}`}>R$ {Number(service.price).toFixed(0)}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="m-step-calendar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 h-full flex flex-col overflow-hidden"
              >
                {rescheduleBooking ? (
                  <div className="p-4 bg-white/[0.01] border border-[#C5A059]/25 rounded-none flex flex-col gap-1 text-left shrink-0">
                    <span className="text-[8px] font-black text-[#C5A059] uppercase tracking-[0.25em]">REAGENDANDO ATENDIMENTO</span>
                    <h3 className="text-sm font-bold text-white uppercase italic leading-none">{rescheduleBooking.clients?.name}</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">{selectedServices.map(s => s.name).join(' + ')}</p>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                      Original: {new Date(rescheduleBooking.booking_date.replace(/-/g, '/')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {rescheduleBooking.booking_time.slice(0, 5)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 shrink-0">
                    <h2 className="text-xl font-bold text-white uppercase italic tracking-tight">Data e horário</h2>
                    <p className="text-xs text-zinc-500 font-light">Selecione o melhor dia e horário</p>
                  </div>
                )}

                {/* Elegant Date Picker */}
                <div className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide -mx-6 px-6 snap-x shrink-0 border-b border-white/[0.02]">
                  {nextDays.map(day => {
                    const isSelected = selectedDate === day.fullDate;
                    return (
                      <button 
                        key={day.fullDate} 
                        onClick={() => {
                          setSelectedDate(day.fullDate);
                          setSelectedTime('');
                        }} 
                        className={`min-w-[70px] py-3.5 transition-all duration-300 snap-center flex flex-col items-center gap-1 rounded-none border ${
                          isSelected 
                            ? 'bg-[#C5A059]/5 border-[#C5A059] text-[#C5A059] shadow-[0_0_15px_rgba(184,155,73,0.05)]' 
                            : 'bg-transparent border-white/[0.04] text-zinc-500 hover:text-white'
                        }`}
                      >
                        <span className="text-[8px] font-bold uppercase tracking-widest">{day.dayName}</span>
                        <span className="text-xl font-black italic">{day.dayNumber}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 scrollbar-hide pb-28">
                  {selectedDate ? (
                    <div className="grid grid-cols-4 gap-2">
                      {TIME_SLOTS.map(time => {
                        const occupied = isOccupied(time);
                        const isSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            type="button"
                            disabled={occupied}
                            onClick={() => setSelectedTime(time)}
                            className={`py-3 border text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-none ${
                              occupied 
                                ? 'text-zinc-800/10 border-transparent cursor-not-allowed line-through opacity-20 bg-transparent' 
                                : isSelected 
                                  ? 'text-[#C5A059] border-[#C5A059] bg-[#C5A059]/5 font-black shadow-[0_0_15px_rgba(184,155,73,0.05)]' 
                                  : 'text-zinc-400 border-white/[0.04] hover:border-zinc-800 hover:text-white bg-transparent'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-xs py-6 text-center">Selecione um dia acima para ver os horários disponíveis.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Action Button Footer */}
        {((currentStep === 1 && (selectedClient || newClient.name)) || selectedServices.length > 0) && (
          <div className="absolute bottom-[60px] left-0 right-0 px-6 py-4 bg-gradient-to-t from-[#121212] via-[#121212]/98 to-transparent z-[90] flex flex-col items-center gap-2.5">
            <button 
              onClick={() => currentStep < 3 ? handleNextStep() : handleFinish()}
              disabled={!isStepValid(currentStep) || isSubmitting}
              className={`w-full h-12 rounded-none font-bold uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                !isStepValid(currentStep)
                  ? 'bg-zinc-950 border border-white/[0.03] text-zinc-700 cursor-not-allowed shadow-none'
                  : 'bg-white text-black hover:bg-[#C5A059] hover:text-black shadow-lg shadow-white/5'
              }`}
            >
              <span>{isSubmitting ? 'CONFIRMANDO...' : rescheduleBooking ? 'CONFIRMAR REAGENDAMENTO' : currentStep < 3 ? 'CONTINUAR' : 'CONFIRMAR AGENDAMENTO'}</span>
              {!isSubmitting && <ChevronRight size={12} />}
            </button>
          </div>
        )}
      </div>

      {/* SEARCH CLIENT MODAL */}
      <BookingSearchModal
        isOpen={isSearchOpen}
        onClose={() => { setIsSearchOpen(false); setMultipleMatches([]); }}
        onSelectClient={(client) => {
          setSelectedClient(client);
          setMultipleMatches([]);
          setIsSearchOpen(false);
          setIsManualEntry(false);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        multipleMatches={multipleMatches}
        isSearchingClient={isSearchingClient}
        onSearch={handleSearch}
      />

      <BottomTabs />
    </div>
  );
};

export default AdminBooking;
