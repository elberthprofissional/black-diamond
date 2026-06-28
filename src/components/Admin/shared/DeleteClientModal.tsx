import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeleteClientModalProps {
  isOpen: boolean;
  clientName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteClientModal: React.FC<DeleteClientModalProps> = ({
  isOpen,
  clientName,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isDeleting && onCancel()}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Excluir cliente"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative z-10 w-full sm:max-w-xs bg-[#111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl p-5 space-y-4"
          >
            <p className="text-xs text-zinc-400 leading-relaxed">
              Excluir <span className="text-white font-semibold">{clientName}</span>? Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                disabled={isDeleting}
                className="flex-1 h-10 bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                Manter
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                {isDeleting ? '...' : 'Excluir'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteClientModal;
