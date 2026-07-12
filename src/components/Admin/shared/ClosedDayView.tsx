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
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
        <Lock size={24} className="text-zinc-600" />
      </div>
      <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">
        Barbearia fechada
      </h2>
      <p className="text-[11px] text-zinc-600 max-w-[220px]">
        Hoje não é dia de expediente. Volte no próximo dia útil.
      </p>
    </motion.div>
  );
};

export default ClosedDayView;
