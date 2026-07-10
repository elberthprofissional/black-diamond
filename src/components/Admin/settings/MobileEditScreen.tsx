import { type ReactNode, type FC } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileEditScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  canSave: boolean;
  children: ReactNode;
}

const MobileEditScreen: FC<MobileEditScreenProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  canSave,
  children,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[300] bg-[#0A0A0A] lg:hidden"
        >
          <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Cancelar"
            >
              <X size={24} />
            </button>
            <span className="text-[15px] font-bold text-white">{title}</span>
            <button
              onClick={onSave}
              disabled={!canSave}
              className="text-[#C5A059] font-bold text-[15px] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Salvar"
            >
              <Check size={24} />
            </button>
          </div>
          <div className="p-4 space-y-2">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileEditScreen;
