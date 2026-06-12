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
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
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
        className="bg-dark-card border border-dark-border w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-dark-border flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-serif font-bold text-white uppercase tracking-wider">Agendamento Online</h3>
            <p className="text-gray-400 text-sm font-light">Passo {step} de 4</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h4 className="text-lg font-bold text-white mb-4">Selecione os serviços:</h4>
                {loadingServices ? (
                  <div className="text-center text-gray-400">Carregando serviços...</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => toggleService(service)}
                        className={`flex justify-between items-center p-4 border transition-all ${
                          selectedServices.find(s => s.id === service.id)
                            ? 'border-gold-600 bg-gold-600/10'
                            : 'border-dark-border hover:border-gold-600/30 bg-black'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-bold text-white">{service.name}</div>
                          <div className="text-sm text-gray-400 font-light">{service.duration} min</div>
                        </div>
                        <div className="font-bold text-gold-600">R$ {Number(service.price).toFixed(2)}</div>
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
                className="space-y-6"
              >
                <div>
                  <h4 className="text-lg font-bold text-white mb-4">Escolha o dia:</h4>
                  <input 
                    type="date" 
                    className="w-full bg-black border border-dark-border text-white p-4 rounded-sm outline-none focus:border-gold-600 transition-colors"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-4">Horários disponíveis:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 border text-sm transition-all ${
                          selectedTime === time
                            ? 'border-gold-600 bg-gold-600/10 text-white'
                            : 'border-dark-border hover:border-gold-600/30 text-gray-400'
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
                className="space-y-4"
              >
                <h4 className="text-lg font-bold text-white mb-4">Informe seus dados:</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: João Silva"
                      className="w-full bg-black border border-dark-border text-white p-4 rounded-sm outline-none focus:border-gold-600 transition-colors"
                      value={userInfo.name}
                      onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">WhatsApp</label>
                    <input 
                      type="tel" 
                      placeholder="Ex: (48) 99999-9999"
                      className="w-full bg-black border border-dark-border text-white p-4 rounded-sm outline-none focus:border-gold-600 transition-colors"
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
                className="text-center space-y-6"
              >
                <div className="flex justify-center">
                  <CheckCircle size={64} className="text-gold-600" />
                </div>
                <h4 className="text-2xl font-serif font-bold text-white">Quase lá!</h4>
                <div className="bg-black p-6 border border-dark-border text-left space-y-4">
                  <div className="flex justify-between border-b border-dark-border pb-2 text-sm">
                    <span className="text-gray-400">Serviços</span>
                    <span className="text-white font-bold max-w-[200px] text-right">{selectedServices.map(s => s.name).join(', ')}</span>
                  </div>
                  <div className="flex justify-between border-b border-dark-border pb-2 text-sm">
                    <span className="text-gray-400">Data e Hora</span>
                    <span className="text-white font-bold">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span>
                  </div>
                  <div className="flex justify-between border-b border-dark-border pb-2 text-sm">
                    <span className="text-gray-400">Total</span>
                    <span className="text-gold-600 font-bold">R$ {totalPrice.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm italic">
                  Um lembrete será enviado para seu WhatsApp 24h antes.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-dark-border flex justify-between items-center bg-black/50">
          {step > 1 ? (
            <button 
              onClick={() => setStep(step - 1)}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} className="mr-1" /> Voltar
            </button>
          ) : <div></div>}

          {step < 4 ? (
            <button 
              disabled={step === 1 && selectedServices.length === 0}
              onClick={() => setStep(step + 1)}
              className="bg-gold-600 text-black font-bold px-8 py-3 rounded-sm text-sm uppercase tracking-widest hover:bg-gold-500 transition-colors disabled:opacity-50"
            >
              Continuar <ChevronRight size={20} className="inline ml-1" />
            </button>
          ) : (
            <button 
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="bg-gold-gradient text-black font-bold px-8 py-3 rounded-sm text-sm uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50"
            >
              {isSubmitting ? 'Processando...' : 'Confirmar Agendamento'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BookingFlow;
