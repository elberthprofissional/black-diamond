import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useModalA11y } from '../../../hooks/useModalA11y';
import type { BookingWithClient } from '../../../types';

interface DeleteModalProps {
  booking: BookingWithClient | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ booking, onConfirm, onCancel }) => {
  const { dialogRef } = useModalA11y(!!booking, onCancel);

  return (
    <AnimatePresence>
      {booking && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div 
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Excluir agendamento"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-10 w-full sm:w-[320px] bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden"
          >
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Excluir agendamento?</h3>
                <button onClick={onCancel} aria-label="Fechar" className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-600 hover:text-white transition-all cursor-pointer">
                  <X size={11} />
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                O agendamento de <span className="text-zinc-300">{booking.clients?.name}</span> será removido permanentemente.
              </p>
            </div>

            <div className="flex border-t border-white/[0.04]">
              <button 
                onClick={onCancel}
                className="flex-1 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white transition-all cursor-pointer"
              >
                Manter
              </button>
              <div className="w-px bg-white/[0.04]" />
              <button 
                onClick={onConfirm}
                className="flex-1 py-3 text-[10px] font-bold text-red-500 uppercase tracking-wider hover:bg-red-500/10 transition-all cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteModal;
