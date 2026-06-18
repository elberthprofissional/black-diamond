import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getServices, createBooking, getBookings, getClients } from '../lib/api';
import type { Service, Client } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import AdminNavbar from '../components/Admin/Navbar';
import BottomTabs from '../components/Admin/BottomTabs';
import { 
  ArrowLeft, 
  X, 
  User, 
  Phone,
  Search, 
  ChevronRight, 
  Check, 
  Calendar, 
  Clock, 
  Tag 
} from 'lucide-react';

const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

const AdminBooking: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ name: '', phone: '' });
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  
  // Mobile Stepper State
  const [currentStep, setCurrentStep] = useState(1);

  const [selectedDate, setSelectedDate] = useState<string>(
    location.state?.date || new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    location.state?.time || ''
  );
  
  const [searchClient, setSearchClient] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  
  const today = new Date();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesData, clientsData] = await Promise.all([
          getServices(),
          getClients()
        ]);
        setServices(servicesData);
        setClients(clientsData);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

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
    return existingBookings.some(b => b.booking_time === time && b.status !== 'cancelled');
  };

  const handleFinish = async () => {
    const name = selectedClient ? selectedClient.name : newClient.name;
    const phone = selectedClient ? selectedClient.phone : newClient.phone;

    if (!name || !phone || selectedServices.length === 0 || !selectedDate || !selectedTime) {
      alert('Preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    try {
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
      navigate('/admin');
    } catch (error) {
      alert('Erro ao agendar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchClient.toLowerCase()) || 
    c.phone.includes(searchClient)
  );

  // Stepper Handlers
  const handleNextStep = () => {
    if (currentStep === 1 && !selectedClient && !newClient.name) return alert('Selecione ou insira um cliente.');
    if (currentStep === 2 && selectedServices.length === 0) return alert('Selecione ao menos um serviço.');
    if (currentStep === 3 && !selectedTime) return alert('Selecione um horário.');
    setCurrentStep(prev => prev + 1);
  };
  
  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
    else navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans flex overflow-hidden selection:bg-[#B89B49]/30 relative">
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0A0A0A]">
        <AdminNavbar />

        <main className="flex-1 flex flex-col lg:block overflow-hidden lg:overflow-y-auto p-6 lg:p-10 pt-24 lg:pt-10 pb-4 lg:pb-40 scrollbar-hide">
          <div className="max-w-[1200px] mx-auto space-y-8 flex-1 flex flex-col lg:block">
            
            {/* 1. HEADER - MOBILE */}
            <div className="lg:hidden flex flex-col pb-2 flex-shrink-0">
              <div className="flex items-center gap-4 mb-3">
                <button 
                  onClick={handlePrevStep}
                  className="text-zinc-400 hover:text-white transition-all p-1"
                >
                  <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {currentStep === 1 ? 'Novo Agendamento' : 
                   currentStep === 2 ? 'Serviços' : 
                   currentStep === 3 ? 'Data e Hora' : 'Resumo'}
                </h1>
              </div>
              <p className="text-sm font-normal text-zinc-400 pl-11">
                {currentStep === 1 ? 'Preencha os dados do cliente.' : 
                 currentStep === 2 ? 'Selecione os procedimentos desejados.' : 
                 currentStep === 3 ? 'Escolha o melhor momento para o atendimento.' : 'Confirme os dados da reserva.'}
              </p>
            </div>

            {/* 1. HEADER - DESKTOP */}
            <div className="hidden lg:flex flex-col border-b border-white/[0.03] pb-6 flex-shrink-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/admin')}
                  className="text-zinc-500 hover:text-white transition-all p-1"
                >
                  <ArrowLeft size={24} />
                </button>
                <h1 className="text-sm font-black uppercase tracking-[0.4em] text-white">
                  Novo Agendamento
                </h1>
              </div>
            </div>

            {/* 2. VERSÃO MOBILE (Stepper) */}
            <div className="lg:hidden flex-1 flex flex-col justify-between overflow-hidden pb-20">
              
              <div className="flex-1 overflow-y-auto scrollbar-hide py-6">
                <AnimatePresence mode="wait">
                  
                  {/* STEP 1: CLIENTE */}
                  {currentStep === 1 && (
                    <motion.section 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="h-full flex flex-col pt-4 pb-8 space-y-12"
                    >
                      {selectedClient ? (
                        <div className="flex flex-col items-center justify-center space-y-6 flex-1">
                          <div className="w-20 h-20 bg-[#151515] border border-white/5 flex items-center justify-center text-3xl font-light text-[#B89B49] rounded-full shadow-xl">
                            {selectedClient.name.charAt(0)}
                          </div>
                          <div className="text-center space-y-2">
                            <p className="text-2xl font-bold text-white tracking-tight">{selectedClient.name}</p>
                            <p className="text-sm font-normal text-zinc-400 tabular-nums">{selectedClient.phone}</p>
                          </div>
                          <button onClick={() => setSelectedClient(null)} className="mt-4 text-xs font-semibold text-[#B89B49] hover:text-white transition-colors">
                            Trocar Cliente
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col space-y-8 flex-1 w-full">
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                               <label className="text-xs font-semibold text-zinc-500 ml-1">Dados do cliente</label>
                               <div className="relative group">
                                 <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#B89B49] transition-colors" />
                                 <input 
                                   type="text"
                                   placeholder="Nome do cliente"
                                   className="w-full bg-[#151515] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none focus:border-[#B89B49]/50 transition-all placeholder:text-zinc-600 placeholder:font-normal text-white"
                                   value={newClient.name}
                                   onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                 />
                               </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#B89B49] transition-colors" size={20} />
                                <input 
                                  type="tel"
                                  placeholder="WhatsApp"
                                  className="w-full bg-[#151515] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none focus:border-[#B89B49]/50 transition-all placeholder:text-zinc-600 placeholder:font-normal text-white"
                                  value={newClient.phone}
                                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                />
                              </div>
                              
                              <div className="flex justify-between items-center px-1 pt-2">
                                <span className="text-xs text-zinc-500">Cliente já cadastrado?</span>
                                <button 
                                  onClick={() => setShowClientList(true)}
                                  className="text-xs font-semibold text-[#B89B49] hover:text-white transition-colors"
                                >
                                  Buscar cliente &rarr;
                                </button>
                              </div>
                            </div>
                          </div>
                          
                        </div>
                      )}
                    </motion.section>
                  )}

                  {/* STEP 2: SERVIÇOS */}
                  {currentStep === 2 && (
                    <motion.section 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-6 h-full flex flex-col pt-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        {services.map(service => {
                          const isSelected = selectedServices.some(s => s.id === service.id);
                          return (
                            <button
                              key={service.id}
                              onClick={() => toggleService(service)}
                              className={`flex items-center justify-between p-5 rounded-2xl border transition-all w-full ${
                                isSelected 
                                  ? 'bg-[#151515] text-white border-[#B89B49] shadow-lg shadow-[#B89B49]/10' 
                                  : 'bg-[#0D0D0D] border-white/5 text-zinc-400'
                              }`}
                            >
                              <div className="text-left space-y-1">
                                <p className={`text-base font-semibold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{service.name}</p>
                              </div>
                              <span className={`text-base font-semibold ${isSelected ? 'text-[#B89B49]' : 'text-zinc-500'}`}>R$ {Number(service.price).toFixed(0)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.section>
                  )}

                  {/* STEP 3: DATA E HORA */}
                  {currentStep === 3 && (
                    <motion.section 
                      key="step3"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-10 pt-4"
                    >
                      <div className="space-y-4">
                        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                          {Array.from({ length: 14 }).map((_, i) => {
                            const date = new Date();
                            date.setDate(today.getDate() + i);
                            const dateStr = date.toISOString().split('T')[0];
                            const isSelected = selectedDate === dateStr;
                            return (
                              <button
                                key={dateStr}
                                onClick={() => setSelectedDate(dateStr)}
                                className={`flex flex-col items-center min-w-[72px] py-4 rounded-2xl transition-all border ${
                                  isSelected 
                                    ? 'bg-[#B89B49] text-black border-[#B89B49] shadow-lg shadow-[#B89B49]/20' 
                                    : 'bg-[#151515] border-white/5 text-zinc-400'
                                }`}
                              >
                                <span className={`text-xs font-semibold mb-1 ${isSelected ? 'text-black/70' : 'text-zinc-500'}`}>
                                  {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                </span>
                                <span className={`text-xl font-bold ${isSelected ? 'text-black' : 'text-zinc-300'}`}>{date.getDate()}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-3">
                          {timeSlots.map(time => {
                            const occupied = isOccupied(time);
                            const isSelected = selectedTime === time;
                            return (
                              <button
                                key={time}
                                disabled={occupied}
                                onClick={() => setSelectedTime(time)}
                                className={`py-4 rounded-2xl text-sm font-semibold transition-all ${
                                  occupied 
                                    ? 'bg-transparent border border-dashed border-white/5 text-zinc-700 cursor-not-allowed' 
                                    : isSelected 
                                      ? 'bg-[#B89B49] text-black shadow-lg shadow-[#B89B49]/20' 
                                      : 'bg-[#151515] text-zinc-300 border border-white/5 hover:border-white/10'
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.section>
                  )}

                  {/* STEP 4: RESUMO FINAL */}
                  {currentStep === 4 && (
                    <motion.section 
                      key="step4"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-8 pt-4"
                    >
                      <div className="bg-[#151515] border border-white/5 rounded-3xl p-6 space-y-6">
                        <div className="space-y-1">
                          <span className="text-xs font-normal text-zinc-500">Cliente</span>
                          <p className="text-lg font-semibold text-white tracking-tight">{selectedClient?.name || newClient.name}</p>
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="space-y-3">
                          <span className="text-xs font-normal text-zinc-500">Serviços ({selectedServices.length})</span>
                          {selectedServices.map(s => (
                             <div key={s.id} className="flex justify-between items-center">
                               <p className="text-base font-medium text-zinc-300">{s.name}</p>
                               <span className="text-base font-medium text-zinc-500">R$ {Number(s.price).toFixed(0)}</span>
                             </div>
                          ))}
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="space-y-1">
                          <span className="text-xs font-normal text-zinc-500">Data e Hora</span>
                          <p className="text-lg font-semibold text-white">{selectedDate.split('-').reverse().join('/')} às <span className="text-[#B89B49]">{selectedTime}</span></p>
                        </div>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>
              </div>

              {/* FOOTER ACTION MOBILE COMUM */}
              <div className="pt-6 pb-6 border-t border-white/5 flex-shrink-0">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Total</span>
                  <p className="text-4xl font-bold text-white tracking-tighter">
                    <span className="text-xl text-[#B89B49] mr-1 font-semibold">R$</span>
                    {totalPrice.toFixed(0)}
                  </p>
                </div>
                
                {currentStep < 4 ? (
                  <button 
                    onClick={handleNextStep}
                    className="w-full bg-white text-black font-semibold px-8 py-5 rounded-2xl text-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    Continuar
                  </button>
                ) : (
                  <button 
                    onClick={handleFinish}
                    disabled={isSubmitting}
                    className="w-full bg-[#D4AF37] text-black font-semibold px-8 py-5 rounded-2xl text-sm disabled:opacity-50 shadow-[0_10px_30px_rgba(212,175,55,0.3)] hover:brightness-110 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    {isSubmitting ? 'Processando...' : 'Confirmar Agendamento'}
                  </button>
                )}
              </div>
            </div>

            {/* 3. VERSÃO DESKTOP (Grid Original) */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-12">
                <section className="space-y-6">
                  <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">1. Identificação</h2>
                  {selectedClient ? (
                    <div className="bg-[#111111] border border-white/5 rounded-2xl p-8 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-[#0A0A0A] rounded-2xl flex items-center justify-center border border-[#B89B49]/30 text-2xl font-bold text-[#B89B49]">
                          {selectedClient.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white uppercase tracking-tight italic">{selectedClient.name}</h3>
                          <p className="text-sm font-mono text-zinc-500 mt-1">{selectedClient.phone}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedClient(null)} className="px-6 py-2 border border-white/5 rounded-xl text-[9px] font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-all">Alterar</button>
                    </div>
                  ) : (
                    <div className="bg-[#111111] border border-white/5 rounded-2xl p-8 grid grid-cols-2 gap-6">
                      <div className="relative group">
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input 
                          type="text"
                          placeholder="NOME COMPLETO"
                          className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl py-4 pl-12 text-[11px] font-bold tracking-widest outline-none focus:border-[#B89B49]/30 transition-all placeholder:text-zinc-700 text-white uppercase"
                          value={newClient.name}
                          onChange={(e) => setNewClient({ ...newClient, name: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                        <input 
                          type="tel"
                          placeholder="WHATSAPP / CELULAR"
                          className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl py-4 pl-12 text-[11px] font-bold tracking-widest outline-none focus:border-[#B89B49]/30 transition-all placeholder:text-zinc-700 text-white"
                          value={newClient.phone}
                          onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button onClick={() => setShowClientList(true)} className="text-[9px] font-bold text-[#B89B49] hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1">
                          Buscar na Base de Clientes <ChevronRight size={10} />
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-6">
                  <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">2. Seleção de Serviços</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {services.map(service => {
                      const isSelected = selectedServices.some(s => s.id === service.id);
                      return (
                        <button
                          key={service.id}
                          onClick={() => toggleService(service)}
                          className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${
                            isSelected ? 'bg-[#B89B49]/5 border-[#B89B49]/30' : 'bg-[#111111] border-white/5 hover:border-white/10'
                          }`}
                        >
                          <p className={`text-sm font-bold uppercase tracking-wide ${isSelected ? 'text-white' : 'text-zinc-400'}`}>{service.name}</p>
                          <span className={`text-sm font-bold ${isSelected ? 'text-[#B89B49]' : 'text-zinc-700'}`}>R$ {Number(service.price).toFixed(0)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-6">
                  <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">3. Agendamento</h2>
                  <div className="bg-[#111111] border border-white/5 rounded-2xl p-8 space-y-10">
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const date = new Date();
                        date.setDate(today.getDate() + i);
                        const dateStr = date.toISOString().split('T')[0];
                        const isSelected = selectedDate === dateStr;
                        return (
                          <button
                            key={dateStr}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`flex flex-col items-center min-w-[70px] py-4 rounded-xl border transition-all ${
                              isSelected ? 'bg-[#B89B49] border-[#B89B49] text-black shadow-lg shadow-[#B89B49]/20' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10'
                            }`}
                          >
                            <span className="text-[9px] font-black uppercase mb-1">{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                            <span className="text-base font-black">{date.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-8 gap-3">
                      {timeSlots.map(time => {
                        const occupied = isOccupied(time);
                        const isSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            disabled={occupied}
                            onClick={() => setSelectedTime(time)}
                            className={`py-4 rounded-xl text-[11px] font-black tracking-tighter transition-all ${
                              occupied ? 'bg-transparent border border-white/[0.02] text-zinc-900 opacity-20 cursor-not-allowed' : isSelected ? 'bg-[#B89B49] text-black scale-105' : 'bg-zinc-900/50 border border-white/5 text-zinc-500 hover:border-[#B89B49]/30'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>

              <div className="lg:col-span-4 space-y-6 sticky top-10">
                <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-8 space-y-8">
                    <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                       <div className={`w-3 h-3 rounded-full ${selectedTime && selectedServices.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-800'}`} />
                       <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Resumo da Reserva</span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-zinc-400">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Serviços</span>
                        <span className="text-sm font-bold text-white">{selectedServices.length}</span>
                      </div>
                      <div className="h-px bg-white/5" />
                      <div className="flex justify-between items-end pt-4">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Total a Pagar</span>
                        <p className="text-4xl font-bold tracking-tighter text-white">
                          <span className="text-sm font-medium text-[#B89B49] mr-1">R$</span>
                          {totalPrice.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-900/50 border-t border-white/5">
                    <button 
                      onClick={handleFinish}
                      disabled={isSubmitting || !selectedTime || (selectedServices.length === 0) || (!selectedClient && !newClient.name)}
                      className="w-full py-5 bg-[#B89B49] hover:bg-[#a68a3d] text-black rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-20 shadow-lg shadow-[#B89B49]/10 flex items-center justify-center gap-3"
                    >
                      {isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <AnimatePresence>
          {showClientList && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { setShowClientList(false); setSearchClient(''); }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg bg-[#0C0C0E] border border-white/10 rounded-[40px] shadow-2xl relative z-10 flex flex-col overflow-hidden max-h-[80vh]"
              >
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Selecionar Cliente</h3>
                  <button onClick={() => { setShowClientList(false); setSearchClient(''); }} className="text-zinc-500 hover:text-white transition-all">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-8 overflow-y-auto scrollbar-hide">
                  <div className="relative mb-8">
                    <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-700" />
                    <input 
                      type="text"
                      autoFocus
                      placeholder="PESQUISAR NOME OU WHATSAPP..."
                      className="w-full bg-transparent border-b border-white/10 py-4 pl-8 text-xs font-bold tracking-widest outline-none focus:border-[#B89B49] transition-all placeholder:text-zinc-800 text-white"
                      value={searchClient}
                      onChange={(e) => setSearchClient(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    {filteredClients.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => { setSelectedClient(c); setShowClientList(false); setSearchClient(''); setNewClient({name: '', phone: ''}); }} 
                        className="w-full text-left p-6 bg-zinc-900/20 hover:bg-zinc-900/50 border border-white/5 rounded-[2rem] transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-black uppercase tracking-wide text-zinc-300 group-hover:text-white transition-colors">{c.name}</p>
                          <p className="text-[11px] font-mono text-zinc-600">{c.phone}</p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-800 group-hover:text-[#B89B49] transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <BottomTabs />
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AdminBooking;