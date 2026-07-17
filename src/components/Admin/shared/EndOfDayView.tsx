import { type FC } from 'react';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface EndOfDayViewProps {
  completedCount: number;
  dailyRevenue: number;
}

const EndOfDayView: FC<EndOfDayViewProps> = ({ completedCount, dailyRevenue }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-6">
        <CheckCircle size={28} className="text-[#D4AF37]" />
      </div>
      <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
        Parabéns, você concluiu seu dia!
      </h2>
      {completedCount > 0 && (
        <div className="flex items-center gap-3 mt-4">
          <div className="text-center">
            <p className="text-xl font-black text-white">{completedCount}</p>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider mt-0.5">
              {completedCount === 1 ? 'agendamento' : 'agendamentos'}
            </p>
          </div>
          <div className="w-px h-8 bg-white/[0.06]" />
          <div className="text-center">
            <p className="text-xl font-black text-[#D4AF37]">
              R$ {dailyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider mt-0.5">faturados</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EndOfDayView;
