import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BookingWithClient } from '../../../types';

interface CompleteModalProps {
  booking: BookingWithClient | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const CompleteModal: React.FC<CompleteModalProps> = ({ booking, onConfirm, onCancel }) => {
  if (!booking) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title-complete"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm relative z-10 overflow-hidden rounded-2xl shadow-2xl p-10"
        >
          <div className="space-y-8">
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.4em] block">Status do Serviço</span>
              <h3 id="modal-title-complete" className="text-xl font-bold text-white uppercase tracking-tighter">Finalizar Atendimento</h3>
            </div>
            
            <div className="py-8 border-y border-white/[0.03]">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 text-center">Cliente Selecionado</span>
              <p className="text-2xl font-black text-white uppercase tracking-tighter text-center">
                {booking.clients?.name}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={onConfirm}
                aria-label="Confirmar conclusão do atendimento"
                className="w-full h-12 bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-200 active:scale-[0.98] transition-all cursor-pointer"
              >
                Confirmar Conclusão
              </button>
              <button 
                onClick={onCancel}
                aria-label="Cancelar finalização do atendimento"
                className="w-full h-10 text-zinc-500 font-bold text-[9px] uppercase tracking-[0.3em] hover:text-white transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CompleteModal;
