import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle, Scissors, Calendar, User, Phone } from 'lucide-react';
import { getServices, createBooking } from '../lib/api';
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
  const navigate = useNavigate();

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
      alert('Agendamento realizado com sucesso!');
      navigate('/');
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar agendamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-hidden relative">
      {/* Background Image using user-provided 'agendamento-bg.webp' */}
      <div 
        className="fixed inset-0 bg-cover bg-center z-0 opacity-20 pointer-events-none" 
        style={{ backgroundImage: 'url("/assets/img/agendamento-bg.webp")' }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[#09090B]/60 to-[#09090B] z-0 pointer-events-none" />

      <div className="container mx-auto max-w-4xl relative z-10 py-20 px-6">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-500 hover:text-gold-600 transition-colors mb-8 group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Voltar para o Início</span>
          </button>
          
          <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.5em] uppercase mb-4">Experiência Black Diamond</h2>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Agendamento</h1>
          <div className="h-[1px] w-12 bg-gold-600/30"></div>
        </div>

        {/* Progress Bar */}
        <div className="flex justify-center items-center space-x-4 mb-20">
          {[1, 2, 3, 4].map((i) => (
            <React.Fragment key={i}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500 ${step >= i ? 'bg-gold-600 text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'bg-white/5 text-gray-600 border border-white/5'}`}>
                {i}
              </div>
              {i < 4 && <div className={`w-12 h-[1px] ${step > i ? 'bg-gold-600' : 'bg-white/5'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Main Content Card */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-8 md:p-12 shadow-2xl min-h-[500px] flex flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <Scissors className="text-gold-600" size={20} />
                    <h3 className="text-xl font-serif font-bold uppercase tracking-widest text-white">Escolha os Serviços</h3>
                  </div>
                  
                  {loadingServices ? (
                    <div className="flex justify-center py-20">
                      <div className="w-8 h-8 border-2 border-gold-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {services.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => toggleService(service)}
                          className={`flex justify-between items-center p-6 border transition-all duration-500 text-left ${
                            selectedServices.find(s => s.id === service.id)
                              ? 'border-gold-600 bg-gold-600/5'
                              : 'border-white/5 hover:border-white/10 bg-black/20'
                          }`}
                        >
                          <div>
                            <div className="font-serif font-bold text-lg text-white mb-1">{service.name}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{service.duration} MINUTOS</div>
                          </div>
                          <div className="text-xl font-serif font-bold text-gold-600">R$ {Number(service.price).toFixed(0)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-12"
                >
                  <div className="space-y-8">
                    <div className="flex items-center space-x-4">
                      <Calendar className="text-gold-600" size={20} />
                      <h3 className="text-xl font-serif font-bold uppercase tracking-widest text-white">Escolha a Data</h3>
                    </div>
                    <input 
                      type="date" 
                      className="w-full bg-black/20 border border-white/5 text-white p-5 rounded-none outline-none focus:border-gold-600 transition-colors uppercase text-[10px] font-bold tracking-[0.2em]"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-8">
                    <div className="flex items-center space-x-4">
                      <ChevronRight className="text-gold-600" size={20} />
                      <h3 className="text-xl font-serif font-bold uppercase tracking-widest text-white">Horário</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-4 border text-[10px] font-bold tracking-widest transition-all duration-500 ${
                            selectedTime === time
                              ? 'border-gold-600 bg-gold-600/10 text-white'
                              : 'border-white/5 hover:border-white/10 text-gray-500 bg-black/20'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12 max-w-xl mx-auto"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <User className="text-gold-600" size={24} />
                    <h3 className="text-xl font-serif font-bold uppercase tracking-widest text-white">Seus Dados</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="group relative">
                      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2 block group-focus-within:text-gold-600 transition-colors">Nome Completo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: João Silva"
                        className="w-full bg-black/20 border border-white/5 text-white p-5 rounded-none outline-none focus:border-gold-600 transition-colors text-sm font-light tracking-wide"
                        value={userInfo.name}
                        onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                      />
                    </div>
                    <div className="group relative">
                      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2 block group-focus-within:text-gold-600 transition-colors">WhatsApp</label>
                      <input 
                        type="tel" 
                        placeholder="Ex: (31) 99999-9999"
                        className="w-full bg-black/20 border border-white/5 text-white p-5 rounded-none outline-none focus:border-gold-600 transition-colors text-sm font-light tracking-wide"
                        value={userInfo.phone}
                        onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center space-y-12"
                >
                  <div className="flex flex-col items-center space-y-4">
                    <CheckCircle size={48} className="text-gold-600" />
                    <h3 className="text-3xl font-serif font-bold text-white uppercase tracking-widest">Resumo Final</h3>
                  </div>
                  
                  <div className="bg-black/20 p-10 border border-white/5 text-left space-y-6 max-w-lg mx-auto">
                    <div className="flex justify-between border-b border-white/5 pb-4">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Serviços</span>
                      <span className="text-sm font-bold text-white text-right max-w-[200px]">{selectedServices.map(s => s.name).join(', ')}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-4">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Agendado para</span>
                      <span className="text-sm font-bold text-white">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-4">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Investimento</span>
                      <span className="text-3xl font-serif font-bold text-gold-600">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em] max-w-sm mx-auto">
                    Um lembrete será enviado para seu WhatsApp 24h antes do seu compromisso.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/5">
            {step > 1 ? (
              <button 
                onClick={() => setStep(step - 1)}
                className="flex items-center text-gray-500 hover:text-white transition-all uppercase text-[10px] font-black tracking-[0.3em]"
              >
                <ChevronLeft size={16} className="mr-2" /> Voltar
              </button>
            ) : <div />}

            {step < 4 ? (
              <button 
                disabled={(step === 1 && selectedServices.length === 0) || (step === 2 && (!selectedDate || !selectedTime)) || (step === 3 && (!userInfo.name || !userInfo.phone))}
                onClick={() => setStep(step + 1)}
                className="bg-transparent border border-gold-600 text-gold-600 hover:bg-gold-600 hover:text-black font-black px-12 py-4 text-[10px] uppercase tracking-[0.4em] transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gold-600"
              >
                Próximo Passo <ChevronRight size={16} className="inline ml-2" />
              </button>
            ) : (
              <button 
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="bg-gold-600 text-black font-black px-16 py-5 text-[10px] uppercase tracking-[0.5em] hover:bg-gold-hover transition-all duration-500 shadow-[0_0_30px_rgba(212,175,55,0.2)] disabled:opacity-50"
              >
                {isSubmitting ? 'Processando...' : 'Confirmar Agendamento'}
              </button>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 flex justify-center items-center space-x-10 text-[9px] font-bold text-gray-700 uppercase tracking-[0.3em]">
           <div className="flex items-center space-x-2">
             <Phone size={12} className="text-gold-600/30" />
             <span>Dúvidas? (31) 99955-3580</span>
           </div>
           <div className="h-4 w-[1px] bg-white/5" />
           <div className="flex items-center space-x-2">
             <Scissors size={12} className="text-gold-600/30" />
             <span>Ambiente Exclusivo</span>
           </div>
        </div>

      </div>
    </div>
  );
};

export default BookingPage;
