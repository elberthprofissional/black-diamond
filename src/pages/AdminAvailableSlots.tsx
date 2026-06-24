import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isTimeOccupied, getLocalDateString } from '../lib/utils';
import { useBookings } from '../hooks/useBookings';
import { useSlotBlocking } from '../hooks/useSlotBlocking';
import { useToast } from '../hooks/useToast';
import { getAvailableSlots } from '../lib/api';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import AdminLayout from '../components/Admin/AdminLayout';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';

const AdminAvailableSlots: React.FC = () => {
  const selectedDate = getLocalDateString();
  const { bookings, loading, refetch: loadData } = useBookings(selectedDate);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const { blockingSlot, blockSlot } = useSlotBlocking();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadAvailableSlots = async () => {
      try {
        const slots = await getAvailableSlots(selectedDate);
        setAvailableSlots(slots);
      } catch (error) {
        console.error(error);
        setAvailableSlots(['08:30', '09:30', '10:30', '11:30', '13:30', '14:30', '15:30', '16:30', '17:30', '18:30']);
      }
    };
    loadAvailableSlots();
  }, [selectedDate]);

  const isOccupied = (time: string) => {
    return isTimeOccupied(time, bookings);
  };

  const handleBlockSlot = async (slot: string) => {
    await blockSlot(selectedDate, slot, loadData);
  };

  const freeSlots = availableSlots.filter(slot => !isOccupied(slot));

  return (
    <AdminLayout mainClassName="flex-1 w-full px-5 sm:px-8 lg:px-12 pt-24 lg:pt-8 pb-40">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/admin')} 
            className="text-zinc-500 hover:text-white transition-colors lg:hidden"
            aria-label="Voltar para o painel"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-white uppercase italic">Horários Livres</h1>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              {freeSlots.length} {freeSlots.length === 1 ? 'horário disponível' : 'horários disponíveis'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="animate-spin text-[#C5A059]" size={24} />
          </div>
        ) : freeSlots.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Nenhum horário disponível</p>
          </div>
        ) : (
          /* Grid de slots */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {freeSlots.map((slot) => (
              <motion.div
                key={slot}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3 hover:border-white/10 transition-all group"
              >
                <span className="text-lg font-black text-white tabular-nums">{slot}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/admin/agendar', { state: { date: selectedDate, time: slot } })}
                    disabled={blockingSlot !== null}
                    className="flex-1 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/10 rounded-lg text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    Agendar
                  </button>
                  <button
                    onClick={() => handleBlockSlot(slot)}
                    disabled={blockingSlot !== null}
                    className="flex-1 py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 rounded-lg text-[9px] font-bold uppercase tracking-wider text-red-400/70 hover:text-red-400 transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    {blockingSlot === slot ? <Loader2 size={10} className="animate-spin" /> : null}
                    Bloquear
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminAvailableSlots;
