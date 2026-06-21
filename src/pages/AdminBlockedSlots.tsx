import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocalDateString } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useBookings } from '../hooks/useBookings';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import UnblockModal from '../components/Admin/shared/UnblockModal';
import AdminLayout from '../components/Admin/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import type { BookingWithClient } from '../types';

const AdminBlockedSlots: React.FC = () => {
  const todayStr = getLocalDateString();
  const { bookings, loading, refetch: loadData } = useBookings();
  const { toast } = useToast();
  const {
    unblockingBooking,
    setUnblockingBooking,
    unblockSlot
  } = useSlotBlocking();
  const navigate = useNavigate();

  const blockedBookings = (bookings || [])
    .filter((b) => b.clients?.name === 'BLOQUEADO' && b.status !== 'cancelled' && b.booking_date >= todayStr)
    .sort((a, b) => {
      if (a.booking_date !== b.booking_date) {
        return a.booking_date.localeCompare(b.booking_date);
      }
      return a.booking_time.localeCompare(b.booking_time);
    }) as BookingWithClient[];

  const confirmUnblock = async () => {
    if (!unblockingBooking) return;
    await unblockSlot(unblockingBooking.id, loadData);
  };

  const formatDateLong = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long'
    });
  };

  return (
    <AdminLayout mainClassName="flex-1 w-full max-w-5xl mx-auto px-5 sm:px-8 lg:px-12 pt-28 lg:pt-12 pb-40">
      {/* Header */}
      <div className="flex items-center justify-between pb-8 sm:pb-10 mb-10 sm:mb-12 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin')}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
            aria-label="Voltar para a página anterior"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white leading-tight uppercase italic">
            Horários Bloqueados
          </h1>
        </div>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:block">
          Gerenciamento de Bloqueios
        </span>
      </div>

      {/* Blocked Slots List */}
      <div className="space-y-6">
        <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.25em]">Lista de Bloqueios</h2>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Carregando...</span>
          </div>
        ) : blockedBookings.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-white/[0.03] rounded-[30px] bg-white/[0.01]">
            <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-semibold italic">Nenhum horário bloqueado no momento</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {blockedBookings.map((booking) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center bg-red-950/10 border border-red-500/10 rounded-xl overflow-hidden transition-all duration-300 group"
                >
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-4 min-w-0">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-sm font-bold text-red-400 tabular-nums w-10 shrink-0">
                        {booking.booking_time.slice(0, 5)}
                      </span>
                      <div className="w-px h-4 bg-red-500/20" />
                      <h3 className="text-[10px] font-bold text-red-400/80 uppercase tracking-[0.2em] truncate">
                        BLOQUEADO
                      </h3>
                    </div>
                    
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider pl-14 sm:pl-0">
                      {formatDateLong(booking.booking_date)}
                    </span>
                  </div>
                  
                  <div className="pr-4 flex shrink-0">
                    <button
                      onClick={() => setUnblockingBooking(booking)}
                      aria-label={`Desbloquear horário das ${booking.booking_time.slice(0, 5)}`}
                      className="text-[9px] font-bold uppercase tracking-[0.1em] text-red-400/70 hover:text-red-400 transition-colors px-3 py-1.5 cursor-pointer shrink-0"
                    >
                      Desbloquear
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* UNBLOCK MODAL */}
      <UnblockModal
        booking={unblockingBooking}
        onConfirm={confirmUnblock}
        onCancel={() => setUnblockingBooking(null)}
      />

      {/* Toast Notification */}
      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminBlockedSlots;
