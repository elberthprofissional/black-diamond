import { type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModalA11y } from '../../../hooks/useModalA11y';
import type { BookingWithClient } from '../../../types';

interface UnblockModalProps {
  booking: BookingWithClient | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const UnblockModal: FC<UnblockModalProps> = ({ booking, onConfirm, onCancel }) => {
  const { dialogRef } = useModalA11y(!!booking, onCancel);

  return (
    <AnimatePresence>
      {booking && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/70"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Desbloquear horário"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-[280px] bg-[#161618] border border-white/[0.06] rounded-2xl overflow-hidden"
          >
            <div className="p-6 text-center">
              <p className="text-[11px] font-bold text-white uppercase tracking-wider">
                Desbloquear horário?
              </p>
              <div className="mt-4 inline-flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tabular-nums">
                  {booking.booking_time.slice(0, 5)}
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider mt-2">
                {new Date(booking.booking_date + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                })}
              </p>
            </div>
            <div className="flex border-t border-white/[0.06]">
              <button
                onClick={onCancel}
                className="flex-1 py-3.5 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all cursor-pointer border-r border-white/[0.06]"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3.5 text-[10px] font-bold text-[#C5A059] hover:bg-[#C5A059]/5 transition-all cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UnblockModal;
