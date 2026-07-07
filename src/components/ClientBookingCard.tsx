import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Calendar, Clock, X } from 'lucide-react';
import { formatDateBR } from '../lib/utils';
import { useClientBooking } from '../hooks/useClientBooking';

const ClientBookingCard: React.FC = () => {
  const navigate = useNavigate();
  const { booking, isExpired, dismissCard, notificationAvailable, requestNotification } =
    useClientBooking();
  const [showConfirmDismiss, setShowConfirmDismiss] = useState(false);

  if (!booking || isExpired) return null;

  const handleReschedule = () => {
    navigate('/cancelar', { state: { phone: booking.clientPhone } });
  };

  const confirmDismiss = () => {
    dismissCard();
    setShowConfirmDismiss(false);
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
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-[#C5A059] uppercase tracking-[0.2em] mb-0.5">
                  Meu agendamento
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Calendar size={10} className="text-zinc-500" />
                    <span className="text-[12px] text-white font-medium">
                      {formatDateBR(booking.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-zinc-500" />
                    <span className="text-[12px] text-white font-medium">{booking.time}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notificationAvailable && !booking.notificationEnabled && (
                  <button
                    type="button"
                    onClick={requestNotification}
                    className="h-8 px-3 hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
                    aria-label="Ativar lembrete"
                  >
                    <Bell size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Lembrete</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReschedule}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] hover:bg-[#C5A059]/20 transition-all cursor-pointer"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">Reagendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDismiss(true)}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-white/[0.06] text-zinc-500 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
                >
                  <X size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Ocultar</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmDismiss && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowConfirmDismiss(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[300px] bg-[#141414] rounded-xl border border-white/[0.06] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5">
                <p className="text-[14px] font-semibold text-white">Ocultar agendamento?</p>
                <p className="text-[12px] text-zinc-500 mt-1.5">
                  Isso remove apenas este aviso do aparelho. O agendamento continua ativo.
                </p>
              </div>
              <div className="flex border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowConfirmDismiss(false)}
                  className="flex-1 py-3 text-[12px] font-medium text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  type="button"
                  onClick={confirmDismiss}
                  className="flex-1 py-3 text-[12px] font-semibold text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Ocultar
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
