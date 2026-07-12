import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Loader2 } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface CouponModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (code: string) => void;
  loading?: boolean;
}

const CouponModal: FC<CouponModalProps> = ({ open, onClose, onApply, loading }) => {
  const [code, setCode] = useState('');
  const { dialogRef } = useModalA11y(open, onClose);

  const handleApply = () => {
    if (code.trim()) {
      onApply(code.trim());
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Adicionar cupom de desconto"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-10 w-full sm:w-[340px] bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden"
          >
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-[#C5A059]" />
                  <h3 className="text-sm font-bold text-white">Cupom de desconto</h3>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  className="text-zinc-500 hover:text-white transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Digite o código do cupom"
                aria-label="Código do cupom de desconto"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                className="w-full bg-transparent border border-white/[0.06] focus:border-[#C5A059] rounded-xl px-4 py-3 text-[13px] text-white outline-none transition-all placeholder:text-zinc-600"
              />
            </div>

            <div className="flex border-t border-white/[0.04]">
              <button
                onClick={onClose}
                className="flex-1 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <div className="w-px bg-white/[0.04]" />
              <button
                onClick={handleApply}
                disabled={loading || !code.trim()}
                className="flex-1 py-3 text-[10px] font-bold text-[#C5A059] uppercase tracking-wider hover:bg-[#C5A059]/10 transition-all cursor-pointer disabled:opacity-30 flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : 'Aplicar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CouponModal;
