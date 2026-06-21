import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BookingWithClient } from '../../../types';

interface DeleteModalProps {
  booking: BookingWithClient | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ booking, onConfirm, onCancel }) => {
  if (!booking) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title-delete"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full sm:max-w-xs bg-[#0E0E0E] border-t sm:border border-[#C5A059]/20 sm:rounded-2xl rounded-t-2xl overflow-hidden"
        >
          <div className="p-6 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </div>

            <div className="space-y-2">
              <h3 id="modal-title-delete" className="text-base font-bold text-white uppercase tracking-[0.15em]">Excluir Agendamento</h3>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px] mx-auto">
                Tem certeza que deseja excluir o agendamento de <span className="text-white font-semibold">{booking.clients?.name}</span>?
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button 
                onClick={onCancel}
                aria-label="Manter agendamento e fechar modal"
                className="flex-1 h-10 border border-white/[0.06] hover:bg-white/[0.03] text-zinc-400 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Manter
              </button>
              <button 
                onClick={onConfirm}
                aria-label="Confirmar exclusão definitiva do agendamento"
                className="flex-1 h-10 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-black text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeleteModal;
