import { type FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface DayOffButtonProps {
  isBlocked: boolean;
  freeSlotsCount: number;
  blockedCount: number;
  loading: boolean;
  onBlockDay: () => Promise<void>;
  onUnblockDay: () => Promise<void>;
}

const DayOffButton: FC<DayOffButtonProps> = ({
  isBlocked,
  freeSlotsCount,
  blockedCount,
  loading,
  onBlockDay,
  onUnblockDay,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (action: 'block' | 'unblock') => {
    setActionLoading(true);
    try {
      if (action === 'block') {
        await onBlockDay();
      } else {
        await onUnblockDay();
      }
      setShowConfirm(false);
    } finally {
      setActionLoading(false);
    }
  };

  // Se não há slots livres nem bloqueados, não mostra o botão
  if (!isBlocked && freeSlotsCount === 0) return null;
  if (isBlocked && blockedCount === 0) return null;

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={`group flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-200 cursor-pointer disabled:opacity-40 shrink-0 ${
          isBlocked
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30'
            : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/[0.15] hover:border-red-500/30'
        }`}
      >
        {isBlocked ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Liberar Dia ({blockedCount})
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Tirar Folga ({freeSlotsCount})
          </>
        )}
      </button>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !actionLoading && setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#161618] border border-white/[0.06] rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {isBlocked ? 'Liberar Dia' : 'Tirar Folga'}
                </h3>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={actionLoading}
                  className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-[13px] text-zinc-400 leading-relaxed">
                {isBlocked
                  ? `Tem certeza que deseja liberar todos os ${blockedCount} horários bloqueados de hoje? Clientes poderão agendar normalmente.`
                  : `Tem certeza que deseja tirar folga hoje? Todos os ${freeSlotsCount} horários livres serão bloqueados e nenhum cliente poderá agendar.`}
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={actionLoading}
                  className="flex-1 py-3 text-[11px] font-bold text-zinc-500 hover:text-zinc-300 border border-white/[0.06] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleAction(isBlocked ? 'unblock' : 'block')}
                  disabled={actionLoading}
                  className={`flex-1 py-3 text-[11px] font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isBlocked
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400'
                      : 'bg-red-500/15 hover:bg-red-500/25 text-red-400'
                  }`}
                >
                  {actionLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isBlocked ? (
                    'Liberar'
                  ) : (
                    'Bloquear'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DayOffButton;
