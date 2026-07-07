import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, DollarSign } from 'lucide-react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import Testimonials from '../components/TestimonialsSlider';
import Gallery from '../components/Gallery';
import Location from '../components/Location';
import Footer from '../components/Footer';
import { useClientBooking } from '../hooks/useClientBooking';
import { formatDateBR } from '../lib/utils';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { booking, isExpired, cancelling, dismissCard, handleCancel } = useClientBooking();
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const handleBooking = () => {
    navigate('/agendar');
  };

  const handleReschedule = () => {
    navigate('/cancelar', { state: { phone: booking?.clientPhone } });
  };

  const confirmCancel = async () => {
    const success = await handleCancel();
    if (!success) dismissCard();
    setShowConfirmCancel(false);
  };

  // If client has active booking, show simplified view
  if (booking && !isExpired) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col">
        {/* Header minimal */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.04]">
          <img src="/assets/logo.webp" alt="Black Diamond" className="h-8" />
          <button
            onClick={handleBooking}
            className="px-4 py-2 border border-[#C5A059]/30 text-[#C5A059] text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-[#C5A059]/10 transition-all cursor-pointer"
          >
            Novo Agendamento
          </button>
        </div>

        {/* Booking Card */}
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-6 space-y-6">
              {/* Logo */}
              <div className="text-center">
                <img
                  src="/assets/logo.webp"
                  alt="Black Diamond"
                  className="w-16 h-16 mx-auto mb-3"
                />
                <h1 className="text-lg font-bold text-white">BLACK DIAMOND</h1>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/[0.06]" />

              {/* Booking Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                    <Calendar size={14} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Data</p>
                    <p className="text-[14px] font-bold text-white capitalize">
                      {formatDateBR(booking.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                    <Clock size={14} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Horário</p>
                    <p className="text-[14px] font-bold text-[#C5A059]">{booking.time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                    <span className="text-[#C5A059] text-[12px] font-bold">✂</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Serviço</p>
                    <p className="text-[14px] font-bold text-white">{booking.serviceName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                    <DollarSign size={14} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</p>
                    <p className="text-[14px] font-bold text-white">
                      R$ {booking.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/[0.06]" />

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={handleReschedule}
                  className="w-full h-11 bg-[#C5A059] text-black font-bold text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#A68233] transition-all cursor-pointer"
                >
                  Reagendar
                </button>
                <button
                  onClick={() => setShowConfirmCancel(true)}
                  disabled={cancelling}
                  className="w-full h-11 border border-white/[0.06] text-zinc-400 font-bold text-[11px] uppercase tracking-[0.2em] rounded-xl hover:text-white hover:border-white/[0.12] transition-all cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? 'Cancelando...' : 'Cancelar Agendamento'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>

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
                  <p className="text-[12px] text-zinc-500 mt-1.5">
                    Essa ação não pode ser desfeita.
                  </p>
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
      </div>
    );
  }

  // Normal landing page
  return (
    <>
      <Navbar onBookingClick={handleBooking} />
      <main id="main-content" className="bg-[#0f0f0f]">
        <Hero onBookingClick={handleBooking} />
        <About />
        <Services onBookingClick={handleBooking} />
        <Testimonials />
        <Gallery />
        <Location />
      </main>
      <Footer />
    </>
  );
};

export default Home;
