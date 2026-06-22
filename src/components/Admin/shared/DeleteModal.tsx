import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />
        <motion.div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title-delete"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative z-10 w-full sm:w-[340px] bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden"
        >
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">Confirmar exclusão</span>
              <button onClick={onCancel} className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer">
                <X size={12} />
              </button>
            </div>

            <div className="space-y-3 text-center py-4">
              <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center text-red-500 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <div className="space-y-1.5">
                <h3 id="modal-title-delete" className="text-sm font-bold text-white">Excluir agendamento?</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  O agendamento de <span className="text-zinc-300 font-semibold">{booking.clients?.name}</span> será removido permanentemente.
                </p>
              </div>
            </div>
          </div>

          <div className="flex border-t border-white/[0.04]">
            <button 
              onClick={onCancel}
              className="flex-1 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white hover:bg-white/[0.02] transition-all cursor-pointer"
            >
              Manter
            </button>
            <div className="w-px bg-white/[0.04]" />
            <button 
              onClick={onConfirm}
              className="flex-1 py-3.5 text-[10px] font-bold text-red-500 uppercase tracking-wider hover:bg-red-500/10 transition-all cursor-pointer"
            >
              Excluir
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeleteModal;
