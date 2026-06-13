import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { getServices, createBooking } from '../lib/api';
import type { Service } from '../types';

interface BookingFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

const BookingFlow: React.FC<BookingFlowProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [userInfo, setUserInfo] = useState({ name: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingServices(true);
      getServices()
        .then(setServices)
        .catch(console.error)
        .finally(() => setLoadingServices(false));
    }
  }, [isOpen]);

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
      onClose();
      // Reset state
      setStep(1);
      setSelectedServices([]);
      setSelectedDate('');
      setSelectedTime('');
      setUserInfo({ name: '', phone: '' });
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar agendamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 font-sans">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0A0A0B] border border-white/5 w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl rounded-2xl"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Agendamento Online</h3>
            <div className="flex gap-1.5 mt-2">
              {[1, 2, 3, 4].map((s) => (
                <div 
                  key={s} 
                  className={`h-1 w-8 rounded-full transition-all duration-500 ${
                    s <= step ? 'bg-gold-600' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h4 className="text-xs font-bold text-gold-600 uppercase tracking-widest">01. Selecione os serviços</h4>
                {loadingServices ? (
                  <div className="text-center text-zinc-500 py-12">Carregando serviços...</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => toggleService(service)}
                        className={`group flex justify-between items-center p-5 border rounded-xl transition-all ${
                          selectedServices.find(s => s.id === service.id)
                            ? 'border-gold-600 bg-gold-600/5'
                            : 'border-white/5 hover:border-gold-600/30 bg-white/[0.02]'
                        }`}
                      >
                        <div className="text-left">
                          <div className={`font-bold uppercase tracking-tight ${selectedServices.find(s => s.id === service.id) ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>{service.name}</div>
                          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{service.duration} min</div>
                        </div>
                        <div className="font-black text-gold-600">R$ {Number(service.price).toFixed(0)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gold-600 uppercase tracking-widest">02. Escolha o dia</h4>
                  <input 
                    type="date" 
                    className="w-full bg-neutral-800/50 border border-white/5 text-white p-5 rounded-xl outline-none focus:ring-2 focus:ring-gold-600 transition-all font-bold uppercase tracking-widest text-xs"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gold-600 uppercase tracking-widest">Horários disponíveis</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-4 border rounded-lg text-xs font-bold transition-all ${
                          selectedTime === time
                            ? 'border-gold-600 bg-gold-600 text-black'
                            : 'border-white/5 hover:border-gold-600/30 text-zinc-500 bg-white/[0.02]'
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
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <h4 className="text-xs font-bold text-gold-600 uppercase tracking-widest">03. Informe seus dados</h4>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      placeholder="COMO DEVEMOS TE CHAMAR?"
                      className="w-full bg-neutral-800/50 border border-white/5 text-white p-5 rounded-xl outline-none focus:ring-2 focus:ring-gold-600 transition-all font-bold uppercase tracking-widest text-xs placeholder:text-zinc-700"
                      value={userInfo.name}
                      onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input 
                      type="tel" 
                      placeholder="(00) 00000-0000"
                      className="w-full bg-neutral-800/50 border border-white/5 text-white p-5 rounded-xl outline-none focus:ring-2 focus:ring-gold-600 transition-all font-bold uppercase tracking-widest text-xs placeholder:text-zinc-700"
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
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-8"
              >
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-gold-600/10 flex items-center justify-center border border-gold-600/20">
                    <CheckCircle size={40} className="text-gold-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-white uppercase tracking-tighter">Resumo do Agendamento</h4>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Confira se está tudo correto</p>
                </div>
                <div className="bg-white/[0.02] p-8 border border-white/5 rounded-2xl text-left space-y-6">
                  <div className="flex justify-between border-b border-white/5 pb-4 text-xs font-bold uppercase tracking-widest">
                    <span className="text-zinc-500">Serviços</span>
                    <span className="text-white max-w-[200px] text-right">{selectedServices.map(s => s.name).join(', ')}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-4 text-xs font-bold uppercase tracking-widest">
                    <span className="text-zinc-500">Data e Hora</span>
                    <span className="text-white">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-zinc-500">Total</span>
                    <span className="text-gold-600 text-lg font-black">R$ {totalPrice.toFixed(0)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] italic">
                  * UM LEMBRETE SERÁ ENVIADO PARA SEU WHATSAPP 24H ANTES.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-white/5 flex justify-between items-center bg-black/40">
          {step > 1 ? (
            <button 
              onClick={() => setStep(step - 1)}
              className="flex items-center text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <ChevronLeft size={18} className="mr-1" /> Voltar
            </button>
          ) : <div></div>}

          {step < 4 ? (
            <button 
              disabled={step === 1 && selectedServices.length === 0}
              onClick={() => setStep(step + 1)}
              className="bg-white hover:bg-zinc-200 text-black font-black px-10 py-4 rounded-lg text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-xl"
            >
              Próximo Passo <ChevronRight size={18} className="inline ml-1" />
            </button>
          ) : (
            <button 
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="bg-gold-600 hover:bg-gold-500 text-black font-black px-10 py-4 rounded-lg text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-xl shadow-gold-600/20"
            >
              {isSubmitting ? 'Processando...' : 'Confirmar'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BookingFlow;
