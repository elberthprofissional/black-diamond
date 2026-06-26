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
          className="absolute inset-0 bg-black/60"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-[280px] bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden"
        >
          <div className="p-5 text-center space-y-1">
            <p className="text-sm font-semibold text-white">Concluir atendimento?</p>
            <p className="text-xs text-zinc-500">{booking.clients?.name}</p>
          </div>
          <div className="flex border-t border-white/[0.04]">
            <button
              onClick={onCancel}
              className="flex-1 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <div className="w-px bg-white/[0.04]" />
            <button
              onClick={onConfirm}
              className="flex-1 py-3 text-[10px] font-bold text-[#C5A059] uppercase tracking-wider hover:bg-[#C5A059]/10 transition-colors cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CompleteModal;
