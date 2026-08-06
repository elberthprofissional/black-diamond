import { useState, type FC } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play } from 'lucide-react';

interface PauseModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (startTime: string, endTime: string) => Promise<void>;
}

const HOURS = Array.from({ length: 14 }, (_, i) => String(i + 7).padStart(2, '0') + ':00');

const PauseModal: FC<PauseModalProps> = ({ open, onClose, onConfirm }) => {
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(startTime, endTime);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-[#151515] border border-white/[0.08] rounded-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-white">Pausar Agenda</h3>
              <p className="text-[12px] text-zinc-500">Bloqueie horários por um período</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Início */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                De
              </label>
              <select
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (e.target.value >= endTime) {
                    const idx = HOURS.indexOf(e.target.value);
                    if (idx < HOURS.length - 1) setEndTime(HOURS[idx + 1]!);
                  }
                }}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40 transition-all"
              >
                {HOURS.slice(0, -1).map((h) => (
                  <option key={h} value={h} className="bg-[#151515] text-white">
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Fim */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Até
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40 transition-all"
              >
                {HOURS.filter((h) => h > startTime).map((h) => (
                  <option key={h} value={h} className="bg-[#151515] text-white">
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
              <p className="text-[11px] text-amber-400/80 flex items-center gap-2">
                <Clock size={13} className="shrink-0" />
                Bloquear de <strong>{startTime}</strong> até <strong>{endTime}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-white/[0.06] flex">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 text-[12px] font-bold text-zinc-400 hover:bg-white/[0.03] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <div className="w-px bg-white/[0.06]" />
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-3.5 text-[12px] font-bold text-amber-400 hover:bg-white/[0.03] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play size={13} className="fill-amber-400" />
            )}
            {saving ? 'Pausando...' : 'Pausar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PauseModal;
