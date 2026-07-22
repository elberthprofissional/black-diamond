import { type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogoutConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmModal: FC<LogoutConfirmModalProps> = ({ open, onConfirm, onCancel }) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/60"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-[260px] bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden"
        >
          <div className="p-5 text-center">
            <p className="text-[11px] text-zinc-300 font-medium">Sair da conta?</p>
          </div>
          <div className="border-t border-white/[0.06]">
            <button
              onClick={onConfirm}
              className="w-full py-3.5 text-[11px] font-bold text-red-500 active:bg-white/[0.03] transition-colors cursor-pointer"
            >
              Sair
            </button>
          </div>
          <div className="border-t border-white/[0.06]">
            <button
              onClick={onCancel}
              className="w-full py-3.5 text-[11px] font-bold text-zinc-300 active:bg-white/[0.03] transition-colors cursor-pointer"
            >
              Manter
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default LogoutConfirmModal;
