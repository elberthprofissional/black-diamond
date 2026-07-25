import { type FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, X } from 'lucide-react';

interface CompleteBannerProps {
  expiredCount: number;
  loading: boolean;
  onComplete: () => Promise<void>;
  onDismiss: () => void;
}

const CompleteBanner: FC<CompleteBannerProps> = ({
  expiredCount,
  loading,
  onComplete,
  onDismiss,
}) => {
  const [isCompleting, setIsCompleting] = useState(false);

  if (expiredCount <= 0) return null;

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -12, height: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl p-3 sm:p-4 flex items-center gap-3 relative">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock size={16} className="text-amber-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[12px] sm:text-[13px] font-bold text-white">
              {expiredCount === 1
                ? '1 agendamento atrasado'
                : `${expiredCount} agendamentos atrasados`}
            </p>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5">
              Completar automaticamente os horários que já passaram?
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleComplete}
              disabled={isCompleting || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 rounded-lg transition-all disabled:opacity-50"
            >
              {isCompleting ? (
                <span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              ) : (
                <CheckCircle size={12} />
              )}
              Completar
            </button>
            <button
              onClick={onDismiss}
              className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
              aria-label="Dispensar"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompleteBanner;
