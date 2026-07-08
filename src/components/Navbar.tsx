import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Calendar, Clock, Scissors, DollarSign, X } from 'lucide-react';
import { useClientBooking } from '../hooks/useClientBooking';
import { formatDateBR } from '../lib/utils';

interface NavbarProps {
  onBookingClick: () => void;
}

const Navbar: React.FC<NavbarProps> = React.memo(({ onBookingClick }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmDismiss, setShowConfirmDismiss] = useState(false);

  const { booking, isExpired, dismissCard } = useClientBooking();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close expand on scroll
  useEffect(() => {
    if (!isExpanded) return;
    const handleScroll = () => {
      if (window.scrollY > 100) setIsExpanded(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

  const handleNavClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const handleReschedule = () => {
    setIsExpanded(false);
    navigate('/cancelar', { state: { phone: booking?.clientPhone } });
  };

  const handleCancel = () => {
    setIsExpanded(false);
    navigate('/cancelar', { state: { phone: booking?.clientPhone } });
  };

  const confirmDismiss = () => {
    dismissCard();
    setShowConfirmDismiss(false);
    setIsExpanded(false);
  };

  const navLinks = [
    { label: 'SOBRE MIM', id: 'sobre' },
    { label: 'SERVIÇOS', id: 'servicos' },
    { label: 'GALERIA', id: 'galeria' },
    { label: 'ONDE ESTAMOS', id: 'localização' },
  ];

  const hasBooking = booking && !isExpired;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrolled ? 'bg-black/20 backdrop-blur-lg h-20' : 'bg-transparent h-24 md:h-32'
        }`}
      >
        <div className="container mx-auto h-full px-4 md:px-8 flex justify-between items-center max-w-[1920px]">
          <div
            className="flex items-center gap-2 md:gap-6 cursor-pointer group"
            onClick={() => navigate('/')}
            role="button"
            aria-label="Página Inicial - Black Diamond"
          >
            <img
              src="/assets/logo.webp"
              alt="Black Diamond"
              className={`transition-all duration-500 object-contain -ml-2 md:-ml-6 ${
                scrolled ? 'w-16 h-16 md:w-24 md:h-24' : 'w-20 h-20 md:w-36 md:h-36'
              }`}
            />
            <div className="flex items-baseline gap-1.5 md:gap-4">
              <span className="text-[18px] md:text-[28px] font-bebas font-normal tracking-[0.15em] md:tracking-[0.3em] text-white uppercase leading-none">
                BLACK
              </span>
              <span className="text-[18px] md:text-[28px] font-bebas font-normal tracking-[0.1em] md:tracking-[0.2em] text-[#C5A059] leading-none uppercase">
                DIAMOND
              </span>
            </div>
          </div>

          {/* Desktop Links */}
          <nav className="hidden lg:flex items-center space-x-12" aria-label="Menu de navegação">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-label={`Ir para a seção ${item.label.toLowerCase()}`}
                className="text-[14px] uppercase tracking-[0.3em] text-zinc-400 font-bebas hover:text-[#C5A059] transition-all cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {hasBooking ? (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? 'Fechar detalhes do agendamento' : 'Conferir agendamento'}
                className="flex items-center gap-2 px-4 sm:px-6 py-3 md:py-4 border border-[#C5A059]/30 rounded-full text-[11px] sm:text-[13px] md:text-[14px] font-bebas uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[#C5A059] hover:bg-[#C5A059]/10 transition-all duration-300 cursor-pointer group"
              >
                <span className="hidden sm:inline">Conferir Agendamento</span>
                <span className="sm:hidden">Meu Horário</span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <ChevronDown size={16} className="group-hover:text-[#C5A059]" />
                </motion.div>
              </button>
            ) : (
              <button
                onClick={onBookingClick}
                aria-label="Abrir formulário de agendamento online"
                className="px-6 sm:px-12 py-3 md:py-4 border border-[#C5A059]/30 rounded-full text-[12px] sm:text-[14px] md:text-[16px] font-bebas uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white hover:bg-[#C5A059] hover:text-black transition-all duration-500 cursor-pointer"
              >
                Agendar
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Expanded Booking Panel */}
      <AnimatePresence>
        {isExpanded && hasBooking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-[72px] md:top-[80px] left-0 right-0 z-[99] overflow-hidden"
          >
            <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.04]">
              <div className="container mx-auto px-4 sm:px-6 py-4 max-w-[1920px]">
                <div className="max-w-lg mx-auto">
                  {/* Booking content */}
                  <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#111111] via-[#0f0f0f] to-[#0a0a0a] overflow-hidden">
                    {/* Gold accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent" />

                    <div className="p-4 sm:p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#C5A059]/10 flex items-center justify-center">
                            <Scissors size={11} className="text-[#C5A059]" />
                          </div>
                          <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em]">
                            Seu horário
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowConfirmDismiss(true)}
                          className="w-6 h-6 rounded-full border border-white/[0.06] flex items-center justify-center text-zinc-600 hover:text-white hover:border-white/[0.12] transition-all cursor-pointer"
                          aria-label="Ocultar card"
                        >
                          <X size={10} />
                        </button>
                      </div>

                      {/* Date + Time */}
                      <div className="flex items-baseline gap-3 flex-wrap mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-[#C5A059]/60" />
                          <span className="text-[14px] font-bold text-white tracking-wide">
                            {formatDateBR(booking.date)}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-white/[0.08]" />
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-[#C5A059]/60" />
                          <span className="text-[14px] font-black text-[#C5A059] tabular-nums">
                            {booking.time}
                          </span>
                        </div>
                      </div>

                      {/* Service + Price */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.04]">
                        <p className="text-[11px] text-zinc-500 truncate flex-1">
                          {booking.serviceName}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <DollarSign size={10} className="text-[#C5A059]/50" />
                          <span className="text-[12px] font-bold text-white tabular-nums">
                            R${' '}
                            {Number(booking.totalPrice).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>

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
                          onClick={handleCancel}
                          className="h-10 px-4 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            Cancelar
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dismiss Confirmation Modal */}
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
});

export default Navbar;
