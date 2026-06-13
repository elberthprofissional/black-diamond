import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle, Scissors, Calendar, User, Phone } from 'lucide-react';
import { getServices, createBooking, getBookings } from '../lib/api';
import type { Service } from '../types';
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
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  const timeSlots = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

  useEffect(() => {
    if (selectedDate) {
      getBookings()
        .then((data: any[]) => {
          const filtered = data.filter((b: any) => b.booking_date === selectedDate && b.status !== 'cancelled');
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
    setLoadingServices(true);
    getServices()
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoadingServices(false));
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

  // DEFININDO ANTES DE USAR
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
          date: selectedDate,
          time: selectedTime,
          total_price: totalPrice,
          total_duration: totalDuration
        },
        {
          name: userInfo.name,
          phone: userInfo.phone
        }
      );
      sendWhatsAppReceipt(); // CHAMADA AQUI
      setStep(5);
    } catch (error) {
      console.error(error);
      setToast({ message: 'Erro ao realizar agendamento.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-hidden relative selection:bg-gold-600/30">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-10 left-1/2 z-[100] px-8 py-4 rounded-xl border backdrop-blur-md shadow-2xl ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 bg-cover bg-center z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("/assets/img/agendamento-bg.webp")' }} />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[#09090B]/60 to-[#09090B] z-0 pointer-events-none" />

      <div className="container mx-auto max-w-4xl relative z-10 py-10 px-6">
        <div className="flex flex-col items-center text-center mb-10">
          <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-500 hover:text-gold-600 transition-colors mb-6 group">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Início</span>
          </button>

          <h2 className="text-gold-600 font-sans font-bold text-[9px] tracking-[0.5em] uppercase mb-2">Black Diamond</h2>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-2 uppercase tracking-tighter italic">Agendamento</h1>
          <div className="h-[1px] w-10 bg-gold-600/30"></div>
        </div>

        {step < 5 && (
          <div className="flex justify-center items-center space-x-4 mb-12">
            {[1, 2, 3, 4].map((i) => (
              <React.Fragment key={i}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all duration-500 ${step >= i ? 'bg-gold-600 text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-white/5 text-gray-600 border border-white/5'}`}>{i}</div>
                {i < 4 && <div className={`w-8 h-[1px] ${step > i ? 'bg-gold-600' : 'bg-white/5'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-6 md:p-10 shadow-2xl min-h-[400px] flex flex-col rounded-2xl">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                  <div className="flex items-center space-x-4 mb-4"><Scissors className="text-gold-600" size={20} /><h3 className="text-xl font-serif font-bold uppercase tracking-widest text-white italic">Escolha os Serviços</h3></div>
                  {loadingServices ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold-600 border-t-transparent rounded-full animate-spin"></div></div> : (
                    <div className="grid grid-cols-1 gap-4">
                      {services.map((service) => (
                        <button key={service.id} onClick={() => toggleService(service)} className={`flex justify-between items-center p-6 border transition-all duration-500 text-left rounded-xl ${selectedServices.find(s => s.id === service.id) ? 'border-gold-600 bg-gold-600/5' : 'border-white/5 hover:border-white/10 bg-black/20'}`}>
                          <div><div className="font-serif font-bold text-lg text-white mb-1 uppercase tracking-tight">{service.name}</div><div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{service.duration} MINUTOS</div></div>
                          <div className="text-xl font-serif font-bold text-gold-600 tracking-tighter">R$ {Number(service.price).toFixed(0)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="flex items-center space-x-4"><Calendar className="text-gold-600" size={20} /><h3 className="text-xl font-serif font-bold uppercase tracking-widest text-white italic">Escolha a Data</h3></div>
                    <input type="date" className="w-full bg-black/20 border border-white/5 text-white p-5 rounded-xl outline-none focus:border-gold-600 transition-colors uppercase text-[11px] font-bold tracking-[0.2em]" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  </div>
                  <div className="space-y-8">
                    <div className="flex items-center space-x-4"><ChevronRight className="text-gold-600" size={20} /><h3 className="text-xl font-serif font-bold uppercase tracking-widest text-white italic">Horário</h3></div>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((time) => {
                        const isOccupied = existingBookings.some(b => b.booking_time.slice(0, 5) === time);
                        return (
                          <button key={time} disabled={isOccupied} onClick={() => setSelectedTime(time)} className={`p-4 border text-[10px] font-bold tracking-widest transition-all duration-500 rounded-lg ${selectedTime === time ? 'border-gold-600 bg-gold-600/10 text-white shadow-[0_0_15px_rgba(212,175,55,0.15)]' : isOccupied ? 'border-white/5 bg-white/5 text-zinc-800 cursor-not-allowed' : 'border-white/5 hover:border-white/10 text-gray-500 bg-black/20'}`}>{time}</button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12 max-w-xl mx-auto">
                  <div className="flex flex-col items-center text-center space-y-4"><User className="text-gold-600" size={24} /><h3 className="text-xl font-serif font-bold uppercase tracking-widest text-white italic">Seus Dados</h3></div>
                  <div className="space-y-6">
                    <div className="group relative"><label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2 block group-focus-within:text-gold-600 transition-colors ml-1">Nome Completo</label><input type="text" placeholder="Ex: João Silva" className="w-full bg-black/20 border border-white/5 text-white p-5 rounded-xl outline-none focus:border-gold-600 transition-colors text-sm font-medium tracking-wide" value={userInfo.name} onChange={(e) => setUserInfo({...userInfo, name: e.target.value})} /></div>
                    <div className="group relative"><label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2 block group-focus-within:text-gold-600 transition-colors ml-1">WhatsApp</label><input type="tel" placeholder="Ex: (31) 99999-9999" className="w-full bg-black/20 border border-white/5 text-white p-5 rounded-xl outline-none focus:border-gold-600 transition-colors text-sm font-medium tracking-wide" value={userInfo.phone} onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})} /></div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center space-y-12">
                  <div className="flex flex-col items-center space-y-4"><CheckCircle size={48} className="text-gold-600" /><h3 className="text-3xl font-serif font-bold text-white uppercase tracking-widest italic">Resumo Final</h3></div>
                  <div className="bg-black/20 p-10 border border-white/5 text-left space-y-6 max-w-lg mx-auto rounded-2xl">
                    <div className="flex justify-between border-b border-white/5 pb-4"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Serviços</span><span className="text-sm font-bold text-white text-right max-w-[200px]">{selectedServices.map(s => s.name).join(', ')}</span></div>
                    <div className="flex justify-between border-b border-white/5 pb-4"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Agendado para</span><span className="text-sm font-bold text-white">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span></div>
                    <div className="flex justify-between items-baseline pt-4"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Investimento</span><span className="text-3xl font-serif font-bold text-gold-600 tracking-tighter">R$ {totalPrice.toFixed(2)}</span></div>
                  </div>
                  <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">Clique abaixo para confirmar sua reserva na Black Diamond.</p>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="step5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center space-y-10 py-10">
                  <div className="relative"><div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20"><CheckCircle size={40} className="text-emerald-500" /></div><motion.div initial={{ scale: 0 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-emerald-500 rounded-full" /></div>
                  <div className="space-y-4"><h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tighter italic">Reserva Confirmada!</h2><p className="text-sm text-gray-400 font-medium tracking-wide max-w-sm mx-auto">Seu agendamento foi registrado com sucesso. Você foi redirecionado para o WhatsApp para enviar os detalhes.</p></div>
                  <div className="flex flex-col gap-4 w-full max-w-xs"><button onClick={() => navigate('/')} className="w-full bg-white hover:bg-zinc-200 text-black font-black py-5 rounded-xl text-[10px] uppercase tracking-[0.3em] transition-all shadow-lg">Voltar para Início</button></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {step < 5 && (
            <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/5">
              {step > 1 ? <button onClick={() => setStep(step - 1)} className="flex items-center text-gray-500 hover:text-white transition-all uppercase text-[10px] font-black tracking-[0.3em]"><ChevronLeft size={16} className="mr-2" /> Voltar</button> : <div />}
              {step < 4 ? <button disabled={(step === 1 && selectedServices.length === 0) || (step === 2 && (!selectedDate || !selectedTime)) || (step === 3 && (!userInfo.name || !userInfo.phone))} onClick={() => setStep(step + 1)} className="bg-transparent border border-gold-600 text-gold-600 hover:bg-gold-600 hover:text-black font-black px-12 py-4 text-[10px] uppercase tracking-[0.4em] transition-all disabled:opacity-30 rounded-lg">Próximo Passo <ChevronRight size={16} className="inline ml-2" /></button> : (
                <button disabled={isSubmitting} onClick={handleConfirm} className="bg-gold-600 text-black font-black px-16 py-5 text-[10px] uppercase tracking-[0.5em] hover:bg-[#F5E0A3] transition-all duration-500 shadow-[0_0_30px_rgba(212,175,55,0.2)] disabled:opacity-50 rounded-xl">{isSubmitting ? 'Processando...' : 'Confirmar Reserva'}</button>
              )}
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-center items-center space-x-10 text-[9px] font-bold text-gray-700 uppercase tracking-[0.3em]">
           <div className="flex items-center space-x-2"><Phone size={12} className="text-gold-600/30" /><span>Dúvidas? (31) 99955-3580</span></div>
           <div className="h-4 w-[1px] bg-white/5" /><div className="flex items-center space-x-2"><Scissors size={12} className="text-gold-600/30" /><span>Ambiente Exclusivo</span></div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
