import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { getServices, createBooking, getBookings } from '../lib/api';
import type { Service, Booking } from '../types';
import { useNavigate } from 'react-router-dom';

const BookingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [userInfo, setUserInfo] = useState({ name: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  const timeSlots = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

  useEffect(() => {
    if (selectedDate) {
      getBookings()
        .then((data: Booking[]) => {
          const filtered = data.filter((b: Booking) => b.booking_date === selectedDate && b.status !== 'cancelled');
          setExistingBookings(filtered);
        })
        .catch(console.error);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const loadServices = async () => {
      setLoadingServices(true);
      try {
        const data = await getServices();
        setServices(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingServices(false);
      }
    };
    loadServices();
  }, []);

  const toggleService = (service: Service) => {
    if (selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  const sendWhatsAppReceipt = () => {
    const formattedDate = selectedDate.split('-').reverse().join('/');
    const servicesList = selectedServices.map(s => s.name).join(', ');
    const message = `💎 *NOVO AGENDAMENTO | BLACK DIAMOND* 💎%0A%0A👤 *Cliente:* ${userInfo.name}%0A✂️ *Serviço:* ${servicesList}%0A📅 *Data:* ${formattedDate}%0A⏰ *Horário:* ${selectedTime}`;
    const phone = '31980159559';
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const handleConfirm = async () => {
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
        {
          name: userInfo.name,
          phone: userInfo.phone
        }
      );
      sendWhatsAppReceipt();
      setStep(5);
    } catch (error) {
      console.error(error);
      setToast({ message: 'Erro ao realizar agendamento.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#09090B] text-white overflow-hidden relative selection:bg-gold-600/30 font-sans flex flex-col">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 backdrop-blur-md shadow-2xl"
          >
            <p className="text-[10px] font-black uppercase tracking-widest">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 bg-cover bg-center z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("/assets/img/agendamento-bg.webp")' }} />

      {/* Header Simplificado */}
      <header className="relative z-10 flex items-center h-20 px-6 shrink-0">
        <button 
          onClick={() => navigate('/')} 
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <div className="flex-1 flex justify-center mr-10">
           <h1 className="text-sm font-black uppercase tracking-[0.5em] text-zinc-500">Agendamento</h1>
        </div>
      </header>

      {/* Main Content Area - Fixed & Non-scrollable */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden px-6 pb-6">
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                <div className="flex items-center gap-3 mb-2 px-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-gold-600 shadow-[0_0_8px_#C5A059]" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Escolha os Serviços</h3>
                </div>
                {loadingServices ? (
                  <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gold-600 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {services.map((service) => (
                      <button 
                        key={service.id} 
                        onClick={() => toggleService(service)} 
                        className={`flex justify-between items-center p-5 border transition-all duration-300 text-left rounded-2xl ${
                          selectedServices.find(s => s.id === service.id) 
                          ? 'border-gold-600 bg-gold-600/5' 
                          : 'border-white/5 bg-neutral-900/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-sm text-white uppercase tracking-tight">{service.name}</div>
                          <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">{service.duration} MINUTOS</div>
                        </div>
                        <div className="text-base font-black text-gold-600">R$ {Number(service.price).toFixed(0)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-1">Data do Atendimento</h3>
                  <input 
                    type="date" 
                    className="w-full bg-neutral-900 border border-white/10 text-white p-5 rounded-2xl outline-none focus:border-gold-600 transition-all uppercase text-xs font-black tracking-widest" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-1">Escolha o Horário</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {timeSlots.map((time) => {
                      const isOccupied = existingBookings.some(b => b.booking_time.slice(0, 5) === time);
                      return (
                        <button 
                          key={time} 
                          disabled={isOccupied} 
                          onClick={() => setSelectedTime(time)} 
                          className={`py-4 border text-[10px] font-black tracking-widest transition-all duration-300 rounded-xl ${
                            selectedTime === time 
                            ? 'border-gold-600 bg-gold-600/10 text-white' 
                            : isOccupied 
                              ? 'border-transparent bg-white/5 text-zinc-800 cursor-not-allowed opacity-20' 
                              : 'border-white/5 text-zinc-600 bg-neutral-900/50 hover:border-white/20'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6 max-w-xl mx-auto w-full">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 text-center mb-8">Informações de Contato</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Nome Completo</label>
                    <input type="text" placeholder="Como quer ser chamado?" className="w-full bg-neutral-900 border border-white/10 text-white p-5 rounded-2xl outline-none focus:border-gold-600 transition-all text-sm font-bold placeholder:text-zinc-800" value={userInfo.name} onChange={(e) => setUserInfo({...userInfo, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">WhatsApp</label>
                    <input type="tel" placeholder="(00) 00000-0000" className="w-full bg-neutral-900 border border-white/10 text-white p-5 rounded-2xl outline-none focus:border-gold-600 transition-all text-sm font-bold placeholder:text-zinc-800" value={userInfo.phone} onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})} />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 text-center mb-6">Confirmação do Corte</h3>
                <div className="bg-neutral-900/80 border border-white/10 p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-600/30 to-transparent" />
                   <div className="space-y-1 text-center">
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Horário Marcado</p>
                      <p className="text-6xl font-black text-white tracking-tighter leading-none">{selectedTime}</p>
                   </div>
                   <div className="space-y-3 pt-6 border-t border-white/5">
                      <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Data</span><span className="text-sm font-black text-white uppercase">{selectedDate.split('-').reverse().join('/')}</span></div>
                      <div className="flex justify-between items-start"><span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Serviços</span><span className="text-xs font-bold text-white text-right max-w-[180px] uppercase leading-tight">{selectedServices.map(s => s.name).join(', ')}</span></div>
                      <div className="flex justify-between items-baseline pt-2"><span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Total</span><span className="text-2xl font-black text-gold-600 tracking-tighter italic">R$ {totalPrice.toFixed(0)}</span></div>
                   </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center space-y-10 py-10 h-full">
                <div className="relative"><div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20"><CheckCircle size={32} className="text-emerald-500" /></div></div>
                <div className="space-y-3"><h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Sucesso!</h2><p className="text-xs text-zinc-500 font-bold uppercase tracking-widest leading-relaxed max-w-[240px]">Agendamento confirmado. Redirecionando para o WhatsApp...</p></div>
                <button onClick={() => navigate('/')} className="w-full max-w-[200px] bg-white text-black font-black py-4 rounded-xl text-[10px] uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all">Concluído</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions - Standardized Buttons */}
        {step < 5 && (
          <div className="shrink-0 flex items-center gap-3 pt-4">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)} 
                className="w-14 h-14 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all active:scale-95"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <button 
              disabled={(step === 1 && selectedServices.length === 0) || (step === 2 && (!selectedDate || !selectedTime)) || (step === 3 && (!userInfo.name || !userInfo.phone))} 
              onClick={step === 4 ? handleConfirm : () => setStep(step + 1)} 
              className={`flex-1 h-14 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-2 ${
                step === 4 
                ? 'bg-gold-600 text-black' 
                : 'bg-white text-black hover:bg-zinc-200'
              } disabled:opacity-20 disabled:grayscale`}
            >
              {isSubmitting ? 'Processando...' : step === 4 ? 'Confirmar' : 'Próximo'}
              {step < 4 && <ChevronRight size={16} />}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default BookingPage;
