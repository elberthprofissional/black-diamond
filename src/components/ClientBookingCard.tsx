import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, X, ExternalLink, Bell, BellOff, Smartphone } from 'lucide-react';
import { formatDateBR } from '../lib/utils';
import { useClientBooking } from '../hooks/useClientBooking';

const ClientBookingCard: React.FC = () => {
  const navigate = useNavigate();
  const { booking, isExpired, timeLeft, notificationAvailable, dismissCard, requestNotification } =
    useClientBooking();

  if (!booking || isExpired) return null;

  const formattedDate = formatDateBR(booking.date);

  const handleReschedule = () => {
    navigate('/cancelar', { state: { phone: booking.clientPhone } });
  };

  const handleSendSelfReminder = () => {
    let phone = booking.clientPhone.replace(/\D/g, '');
    // Add Brazil country code if not present
    if (phone.length === 10 || phone.length === 11) {
      phone = '55' + phone;
    }
    const msg = `🔔 Black Diamond 💈\n\nLembrete: ${booking.serviceName}\nData: ${formattedDate}\nHorário: ${booking.time}\n\nPrecisa cancelar ou reagendar? Acesse: ${window.location.origin}/cancelar`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full bg-[#0A0A0A] border-b border-white/[0.04]"
      >
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-start sm:items-center justify-between gap-3">
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em]">
                  Meu Agendamento
                </span>
                {booking.notificationEnabled && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <Bell size={8} className="text-emerald-400" />
                    <span className="text-[7px] font-bold text-emerald-400 uppercase tracking-wider">
                      Notificado
                    </span>
                  </span>
                )}
              </div>

              <h3 className="text-[13px] sm:text-sm font-bold text-white truncate">
                {booking.serviceName}
              </h3>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                <div className="flex items-center gap-1">
                  <Calendar size={10} className="text-[#C5A059] shrink-0" />
                  <span className="text-[11px] text-zinc-400">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={10} className="text-[#C5A059] shrink-0" />
                  <span className="text-[11px] text-zinc-400">{booking.time}</span>
                </div>
                {timeLeft.total > 0 && (
                  <span className="text-[10px] text-zinc-600">
                    · Desaparece em {timeLeft.hours > 0 ? `${timeLeft.hours}h ` : ''}
                    {timeLeft.minutes}min
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* WhatsApp self-reminder */}
              <button
                onClick={handleSendSelfReminder}
                title="Enviar lembrete pro seu WhatsApp"
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                <Smartphone size={13} />
              </button>

              {/* Notification toggle */}
              {!booking.notificationEnabled && notificationAvailable && (
                <button
                  onClick={requestNotification}
                  title="Ativar notificação"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.06] text-zinc-500 hover:text-[#C5A059] hover:border-[#C5A059]/30 transition-all cursor-pointer"
                >
                  <BellOff size={13} />
                </button>
              )}

              {/* Reschedule */}
              <button
                onClick={handleReschedule}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] hover:bg-[#C5A059]/20 transition-all cursor-pointer"
              >
                <ExternalLink size={10} />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  Cancelar / Reagendar
                </span>
              </button>

              {/* Dismiss */}
              <button
                onClick={dismissCard}
                title="Fechar"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.06] text-zinc-500 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ClientBookingCard;
