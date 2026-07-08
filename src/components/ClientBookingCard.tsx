import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Calendar, Clock, Scissors, DollarSign, X } from 'lucide-react';
import { formatDateBR } from '../lib/utils';
import { useClientBooking } from '../hooks/useClientBooking';

const ClientBookingCard: React.FC = () => {
  const navigate = useNavigate();
  const { booking, isExpired, dismissCard, notificationAvailable, requestNotification } =
    useClientBooking();
  const [showConfirmDismiss, setShowConfirmDismiss] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!booking || isExpired) return null;

  const handleReschedule = () => {
    navigate('/cancelar', { state: { phone: booking.clientPhone } });
  };

  const confirmDismiss = () => {
    dismissCard();
    setShowConfirmDismiss(false);
  };

  const services = booking.serviceName.split(',').map((s) => s.trim());
  const firstService = services[0];
  const extraCount = services.length - 1;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-[60px] left-0 right-0 z-[90]"
        >
          <div className="container mx-auto px-4 sm:px-6 pt-3">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#111111] via-[#0f0f0f] to-[#0a0a0a] shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              {/* Gold accent line at top */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent" />

              <div className="p-4 sm:p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Eyebrow */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full bg-[#C5A059]/10 flex items-center justify-center">
                        <Scissors size={10} className="text-[#C5A059]" />
                      </div>
                      <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em]">
                        Seu horário
                      </span>
                    </div>

                    {/* Date + Time — primary info */}
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-[#C5A059]/60" />
                        <span className="text-[15px] font-bold text-white tracking-wide">
                          {formatDateBR(booking.date)}
                        </span>
                      </div>
                      <div className="w-px h-3.5 bg-white/[0.08]" />
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-[#C5A059]/60" />
                        <span className="text-[15px] font-black text-[#C5A059] tabular-nums">
                          {booking.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmDismiss(true)}
                    className="w-7 h-7 rounded-full border border-white/[0.06] flex items-center justify-center text-zinc-600 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.04] transition-all cursor-pointer shrink-0"
                    aria-label="Ocultar card"
                  >
                    <X size={12} />
                  </button>
                </div>

                {/* Service + Price row */}
                <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-500 truncate">
                      {firstService}
                      {extraCount > 0 && <span className="text-zinc-600"> +{extraCount}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <DollarSign size={11} className="text-[#C5A059]/50" />
                    <span className="text-[13px] font-bold text-white tabular-nums">
                      R${' '}
                      {Number(booking.totalPrice).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* Expand for more services */}
                {extraCount > 0 && !isExpanded && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="mt-2 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
                  >
                    +{extraCount} {extraCount === 1 ? 'outro serviço' : 'outros serviços'}
                  </button>
                )}

                {isExpanded && extraCount > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-2 pt-2 border-t border-white/[0.04] space-y-1"
                  >
                    {services.slice(1).map((service, i) => (
                      <p key={i} className="text-[10px] text-zinc-500 pl-5">
                        {service}
                      </p>
                    ))}
                  </motion.div>
                )}

                {/* Action buttons */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReschedule}
                    className="flex-1 h-10 rounded-xl bg-[#C5A059] text-black font-black text-[10px] uppercase tracking-[0.15em] hover:bg-[#d4b06a] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Reagendar
                  </button>
                  <button
                    type="button"
                    onClick={handleReschedule}
                    className="h-10 px-4 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.03] transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">Cancelar</span>
                  </button>
                  {notificationAvailable && !booking.notificationEnabled && (
                    <button
                      type="button"
                      onClick={requestNotification}
                      className="h-10 px-3 hidden sm:flex items-center gap-1.5 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-[#C5A059] hover:border-[#C5A059]/20 transition-all cursor-pointer"
                      aria-label="Ativar lembrete"
                    >
                      <Bell size={12} />
                    </button>
                  )}
                </div>
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
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowConfirmDismiss(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-[300px] bg-[#111111] rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                  <X size={16} className="text-zinc-500" />
                </div>
                <p className="text-[14px] font-bold text-white">Ocultar agendamento?</p>
                <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
                  Remove apenas este aviso. O agendamento continua ativo.
                </p>
              </div>
              <div className="flex border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowConfirmDismiss(false)}
                  className="flex-1 py-3.5 text-[11px] font-bold text-zinc-500 hover:text-white transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Voltar
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  type="button"
                  onClick={confirmDismiss}
                  className="flex-1 py-3.5 text-[11px] font-bold text-red-500 hover:text-red-400 transition-colors cursor-pointer uppercase tracking-wider"
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
