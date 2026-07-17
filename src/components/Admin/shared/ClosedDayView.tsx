import { type FC } from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const ClosedDayView: FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      <Lock size={32} className="text-zinc-600 mb-6" />

      <h2 className="text-[15px] font-bold text-white mb-2">Barbearia fechada</h2>
      <p className="text-[12px] text-zinc-500 max-w-[260px] leading-relaxed">
        Hoje não tem expediente. Aproveita o dia e volte no próximo horário de funcionamento!
      </p>

      {/* Decorative dots */}
      <div className="flex items-center gap-1.5 mt-8">
        <div className="w-1 h-1 rounded-full bg-[#D4AF37]/30" />
        <div className="w-1 h-1 rounded-full bg-[#D4AF37]/20" />
        <div className="w-1 h-1 rounded-full bg-[#D4AF37]/10" />
      </div>
    </motion.div>
  );
};

export default ClosedDayView;
