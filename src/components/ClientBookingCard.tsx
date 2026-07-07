import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import { formatDateBR } from '../lib/utils';
import { useClientBooking } from '../hooks/useClientBooking';

const ClientBookingCard: React.FC = () => {
  const navigate = useNavigate();
  const { booking, isExpired, cancelling, dismissCard, handleCancel } = useClientBooking();
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  if (!booking || isExpired) return null;

  const formattedDate = formatDateBR(booking.date);

  const handleReschedule = () => {
    navigate('/cancelar', { state: { phone: booking.clientPhone } });
  };

  const handleCancelClick = () => {
    setShowConfirmCancel(true);
  };

  const confirmCancel = async () => {
    const success = await handleCancel();
    if (!success) {
      // If API fails, just hide the card
      dismissCard();
    }
    setShowConfirmCancel(false);
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-[60px] left-0 right-0 z-[90] bg-[#111111] border-b border-white/[0.04]"
        >
          <div className="container mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.2em] mb-0.5">
                  Agendamento
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Calendar size={10} className="text-zinc-500" />
                    <span className="text-[12px] text-white font-medium">{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-zinc-500" />
                    <span className="text-[12px] text-white font-medium">{booking.time}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleReschedule}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] hover:bg-[#C5A059]/20 transition-all cursor-pointer"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">Reagendar</span>
                </button>
                <button
                  onClick={handleCancelClick}
                  disabled={cancelling}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-white/[0.06] text-zinc-500 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {cancelling ? '...' : 'Cancelar'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Confirm Cancel Modal */}
      <AnimatePresence>
        {showConfirmCancel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowConfirmCancel(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[280px] bg-[#141414] rounded-xl border border-white/[0.06] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5">
                <p className="text-[14px] font-semibold text-white">Cancelar agendamento?</p>
                <p className="text-[12px] text-zinc-500 mt-1.5">Essa ação não pode ser desfeita.</p>
              </div>
              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => setShowConfirmCancel(false)}
                  className="flex-1 py-3 text-[12px] font-medium text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  onClick={confirmCancel}
                  disabled={cancelling}
                  className="flex-1 py-3 text-[12px] font-semibold text-red-500 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? 'Cancelando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ClientBookingCard;
