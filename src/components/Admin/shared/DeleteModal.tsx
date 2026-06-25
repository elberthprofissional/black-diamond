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
            <div className="flex items-center justify-between mb-6">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Excluir</span>
              <button onClick={onCancel} className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer">
                <X size={12} />
              </button>
            </div>

            <div className="space-y-4">
              <h3 id="modal-title-delete" className="text-sm font-bold text-white">Excluir agendamento?</h3>
              <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 space-y-2">
                <p className="text-xs text-zinc-400">
                  <span className="text-zinc-500">Cliente</span>{' '}
                  <span className="text-zinc-200 font-medium">{booking.clients?.name}</span>
                </p>
                <p className="text-xs text-zinc-400">
                  <span className="text-zinc-500">Data</span>{' '}
                  <span className="text-zinc-200 font-medium">{booking.booking_date?.split('-').reverse().join('/')}</span>
                </p>
                <p className="text-xs text-zinc-400">
                  <span className="text-zinc-500">Horário</span>{' '}
                  <span className="text-zinc-200 font-medium">{booking.booking_time?.slice(0, 5)}</span>
                </p>
              </div>
              <p className="text-[11px] text-zinc-600">Esta ação não pode ser desfeita.</p>
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
