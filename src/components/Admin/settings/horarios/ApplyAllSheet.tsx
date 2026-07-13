import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DAY_NAMES, DAYS_ORDER } from './types';

/**
 * Modal "Aplicar para todos" — permite copiar um mesmo horario
 * para varios dias da semana de uma so vez.
 * Mobile: bottom sheet. Desktop: modal centralizado.
 */
const ApplyAllSheet: FC<{
  open: boolean;
  onClose: () => void;
  onApply: (open: string, close: string, days: string[]) => void;
}> = ({ open, onClose, onApply }) => {
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('18:00');
  const [picked, setPicked] = useState<Record<string, boolean>>({
    '1': true,
    '2': true,
    '3': true,
    '4': true,
    '5': true,
    '6': false,
    '0': false,
  });

  const apply = () => {
    const days = Object.entries(picked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (days.length === 0) return;
    onApply(start, end, days);
    onClose();
  };

  const pickedCount = Object.values(picked).filter(Boolean).length;

  const [startH, startM] = start.split(':');
  const [endH, endM] = end.split(':');

  const applyInputClass =
    'bg-transparent border-b border-white/[0.08] focus:border-[#C5A059]/40 pb-1 text-[18px] lg:text-[20px] text-white font-semibold outline-none transition-all text-center w-10';

  const content = (
    <>
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <span className="text-[14px] lg:text-[17px] text-white font-semibold tracking-tight">
          Aplicar para todos
        </span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white cursor-pointer transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 lg:gap-4 mb-6 lg:mb-8">
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={startH}
            onChange={(e) => {
              const r = e.target.value.replace(/\D/g, '').slice(0, 2);
              setStart(
                `${String(Math.min(parseInt(r || '0', 10), 23)).padStart(2, '0')}:${startM}`
              );
            }}
            className={applyInputClass}
          />
          <span className="text-zinc-500 text-[18px] font-semibold">:</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={startM}
            onChange={(e) => {
              const r = e.target.value.replace(/\D/g, '').slice(0, 2);
              setStart(
                `${startH}:${String(Math.min(parseInt(r || '0', 10), 59)).padStart(2, '0')}`
              );
            }}
            className={applyInputClass}
          />
        </div>
        <span className="text-zinc-500 text-[14px]">às</span>
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={endH}
            onChange={(e) => {
              const r = e.target.value.replace(/\D/g, '').slice(0, 2);
              setEnd(`${String(Math.min(parseInt(r || '0', 10), 23)).padStart(2, '0')}:${endM}`);
            }}
            className={applyInputClass}
          />
          <span className="text-zinc-500 text-[18px] font-semibold">:</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={endM}
            onChange={(e) => {
              const r = e.target.value.replace(/\D/g, '').slice(0, 2);
              setEnd(`${endH}:${String(Math.min(parseInt(r || '0', 10), 59)).padStart(2, '0')}`);
            }}
            className={applyInputClass}
          />
        </div>
      </div>

      <div className="mb-6 lg:mb-8">
        <span className="text-[9px] lg:text-[10px] text-zinc-500 uppercase tracking-wider block mb-3">
          {pickedCount} {pickedCount === 1 ? 'dia selecionado' : 'dias selecionados'}
        </span>
        <div className="flex gap-1.5 lg:gap-2">
          {DAYS_ORDER.map((d) => (
            <button
              key={d}
              onClick={() => setPicked((p) => ({ ...p, [d]: !p[d] }))}
              className={`flex-1 py-2.5 lg:py-3 rounded-lg text-[10px] lg:text-[11px] font-medium transition-all cursor-pointer ${picked[d] ? 'text-[#C5A059]' : 'text-zinc-600'}`}
            >
              {DAY_NAMES[d].slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={apply}
        disabled={pickedCount === 0}
        className="w-full py-3.5 lg:py-4 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[11px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer active:scale-[0.98] disabled:opacity-30 shadow-lg shadow-[#C5A059]/10"
      >
        Aplicar
      </button>
    </>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile: bottom sheet */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] lg:hidden flex items-end"
            onClick={onClose}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-[#0f0f0f] rounded-t-3xl border-t border-white/[0.06] px-5 pt-4 pb-8"
            >
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
              {content}
            </motion.div>
          </motion.div>

          {/* Desktop: centered modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] hidden lg:flex items-center justify-center"
            onClick={onClose}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-gradient-to-b from-[#141414] to-[#0f0f0f] border border-white/[0.06] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden"
            >
              <div className="h-px bg-gradient-to-r from-transparent via-[#C5A059]/30 to-transparent" />
              <div className="p-6">{content}</div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ApplyAllSheet;
