import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface CalendarModalProps {
  isOpen: boolean;
  calendarUrl: string;
  onAddToCalendar: () => void;
  onSkip: () => void;
}

export default function CalendarModal({ isOpen, calendarUrl, onAddToCalendar, onSkip }: CalendarModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#111] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm text-center"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <Check size={24} className="text-emerald-500" />
        </div>
        <h3 className="text-white font-bold text-base mb-1">Agendamento confirmado!</h3>
        <p className="text-zinc-400 text-sm mb-6">Deseja adicionar no Google Agenda?</p>
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 h-11 rounded-xl bg-white/[0.06] border border-white/[0.06] text-zinc-400 text-sm font-medium hover:bg-white/[0.1] transition-colors cursor-pointer"
          >
            Não
          </button>
          <button
            onClick={() => { window.open(calendarUrl, '_blank'); onAddToCalendar(); }}
            className="flex-1 h-11 rounded-xl bg-[#C5A059] text-black text-sm font-bold hover:bg-[#C5A059]/90 transition-colors cursor-pointer"
          >
            Sim
          </button>
        </div>
      </motion.div>
    </div>
  );
}
