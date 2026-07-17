import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TIME_OPTIONS } from './types';

/**
 * Seletor de horario estilo bottom sheet (mobile).
 * Mostra uma grade de horarios de 06:00 a 23:30.
 * Usado tanto nos dias da semana quanto no configurador de almoco.
 */
const TimePickerSheet: FC<{
  value: string;
  onChange: (v: string) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-5 py-3 text-[15px] text-white font-semibold cursor-pointer active:scale-95 transition-all min-w-[80px]"
      >
        {value}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-end"
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-[#0f0f0f] rounded-t-3xl border-t border-white/[0.06] p-5 pb-10"
            >
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  {label}
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[#D4AF37] text-[13px] font-semibold cursor-pointer"
                >
                  OK
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto scrollbar-hide">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      onChange(t);
                      setOpen(false);
                    }}
                    className={`py-3 rounded-xl text-[13px] font-bold transition-all cursor-pointer active:scale-95 ${value === t ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30' : 'bg-white/[0.03] text-zinc-400 border border-white/[0.04]'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TimePickerSheet;
