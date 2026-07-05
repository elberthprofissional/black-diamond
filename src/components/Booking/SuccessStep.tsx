import React, { useState } from 'react';
import { Check, ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { generateGoogleCalendarUrl, formatDateBR } from '../../lib/utils';
import type { Service } from '../../types';

interface SuccessStepProps {
  selectedDate: string;
  selectedTime: string;
  totalPrice: number;
  selectedServices: Service[];
  clientName: string;
  layout: 'desktop' | 'mobile';
}

const SuccessStep: React.FC<SuccessStepProps> = ({
  selectedDate,
  selectedTime,
  totalPrice,
  selectedServices,
  layout,
}) => {
  const navigate = useNavigate();
  const formattedDate = formatDateBR(selectedDate);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const handleAddReminder = () => {
    const serviceNames = selectedServices.map((s) => s.name).join(' + ');
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
    const gcalUrl = generateGoogleCalendarUrl(
      serviceNames,
      selectedDate,
      selectedTime,
      totalDuration
    );
    window.open(gcalUrl, '_blank');
    setShowReminderModal(false);
  };

  if (layout === 'desktop') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-[#C5A059]/10 flex items-center justify-center mx-auto mb-8">
          <Check size={36} className="text-[#C5A059]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Agendamento confirmado!</h2>
        <p className="text-base text-zinc-500 mb-8">Seu horário foi reservado com sucesso.</p>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-3 w-full max-w-sm mb-16 text-left">
          <div className="flex justify-between">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Data</span>
            <span className="text-sm font-bold text-white">{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Horário</span>
            <span className="text-sm font-bold text-[#C5A059]">{selectedTime}</span>
          </div>
          <div className="flex justify-between border-t border-white/[0.06] pt-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</span>
            <span className="text-sm font-bold text-white">R$ {totalPrice.toFixed(0)}</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          aria-label="Voltar para a página inicial"
          className="h-12 px-10 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all cursor-pointer"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#050505] z-[200] flex flex-col p-6 text-center">
      <div className="flex justify-start">
        <button
          onClick={() => navigate('/')}
          aria-label="Voltar para a página inicial"
          className="text-zinc-500 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full space-y-10">
        <div className="w-20 h-20 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center mx-auto">
          <Check size={32} className="text-[#C5A059]" />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-white">Corte confirmado com sucesso!</h2>
          <p className="text-sm text-zinc-500">Seu horário foi reservado com sucesso.</p>
        </div>

        <div className="bg-[#111111] border border-white/[0.04] rounded-2xl p-6 space-y-4 text-left w-full">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Data</span>
            <span className="text-sm font-bold text-white">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Horário</span>
            <span className="text-sm font-bold text-[#C5A059]">{selectedTime}</span>
          </div>
          <div className="flex justify-between items-center border-t border-white/[0.04] pt-4">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</span>
            <span className="text-base font-bold text-white">R$ {totalPrice.toFixed(0)}</span>
          </div>
        </div>

        {/* Lembrete Google Calendar */}
        <button
          onClick={() => setShowReminderModal(true)}
          className="flex items-center gap-2 text-[12px] text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer"
        >
          <Calendar size={14} />
          <span>Deseja ser lembrado do agendamento?</span>
        </button>
      </div>

      {/* Modal Lembrete */}
      <AnimatePresence>
        {showReminderModal && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReminderModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative z-10 w-full sm:max-w-[320px] bg-[#1C1C1E] sm:rounded-2xl rounded-t-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Lembrete de agendamento"
            >
              <div className="px-6 pt-6 pb-2 text-center">
                <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 flex items-center justify-center mx-auto mb-4">
                  <Calendar size={20} className="text-[#C5A059]" />
                </div>
                <p className="text-[15px] font-semibold text-white">Deseja receber um lembrete?</p>
                <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                  Enviaremos um lembrete pro seu Google Calendar para você não se esquecer do seu
                  agendamento.
                </p>
              </div>

              <div className="px-6 pb-4 space-y-2">
                <button
                  onClick={handleAddReminder}
                  className="w-full py-3.5 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[11px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer"
                >
                  Sim
                </button>
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="w-full py-3.5 text-[12px] font-medium text-zinc-500 hover:text-white active:bg-white/[0.03] transition-all cursor-pointer"
                >
                  Não
                </button>
              </div>

              <div className="sm:hidden flex justify-center pb-3 pt-1">
                <div className="w-10 h-1 rounded-full bg-white/10" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuccessStep;
