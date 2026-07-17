import { type FC } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryMoveModalProps {
  show: boolean;
  moveTarget: number;
  totalImages: number;
  currentPosition: number;
  onTargetChange: (target: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const GalleryMoveModal: FC<GalleryMoveModalProps> = ({
  show,
  moveTarget,
  totalImages,
  currentPosition,
  onTargetChange,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[310] bg-black/90 flex items-end sm:items-center justify-center"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full sm:max-w-sm bg-[#1a1a1a] rounded-t-3xl sm:rounded-2xl p-6 border-t border-white/[0.06] sm:border sm:border-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag indicator (mobile) */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />

            <div className="text-center mb-6">
              <h4 className="text-white font-bold text-base mb-1">Mover para posição</h4>
              <p className="text-zinc-500 text-xs">Escolha a nova posição da foto</p>
            </div>

            {/* Position selector */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={() => onTargetChange(Math.max(1, moveTarget - 1))}
                className="w-11 h-11 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all cursor-pointer"
              >
                <ArrowUp size={18} className="text-zinc-300" />
              </button>
              <div className="flex items-baseline gap-1">
                <span className="text-white text-4xl font-bold tabular-nums">{moveTarget}</span>
                <span className="text-zinc-500 text-sm">/ {totalImages}</span>
              </div>
              <button
                onClick={() => onTargetChange(Math.min(totalImages, moveTarget + 1))}
                className="w-11 h-11 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all cursor-pointer"
              >
                <ArrowDown size={18} className="text-zinc-300" />
              </button>
            </div>

            {/* Position dots */}
            <div className="flex justify-center gap-1.5 mb-6">
              {Array.from({ length: totalImages }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i + 1 === moveTarget
                      ? 'bg-[#D4AF37] w-5'
                      : i + 1 === currentPosition + 1
                        ? 'bg-zinc-500'
                        : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-sm font-medium rounded-2xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={moveTarget === currentPosition + 1}
                className="flex-1 py-3.5 bg-[#D4AF37] hover:bg-[#b8962e] text-black text-sm font-bold rounded-2xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GalleryMoveModal;
