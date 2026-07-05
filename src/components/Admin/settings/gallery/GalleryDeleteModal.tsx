import React from 'react';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryDeleteModalProps {
  show: boolean;
  deleting: string | null;
  isBulk: boolean;
  bulkCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const GalleryDeleteModal: React.FC<GalleryDeleteModalProps> = ({
  show, deleting, isBulk, bulkCount, onConfirm, onCancel,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="w-full sm:max-w-[320px] bg-[#1C1C1E] sm:rounded-2xl rounded-t-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <p className="text-[15px] font-semibold text-white">
                {isBulk ? `Excluir ${bulkCount} foto${bulkCount > 1 ? 's' : ''}?` : 'Deletar foto?'}
              </p>
              <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                Essa ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex flex-col border-t border-white/[0.06]">
              <button
                onClick={onConfirm}
                disabled={deleting !== null}
                className="w-full py-4 text-[13px] font-semibold text-red-500 hover:text-red-400 active:bg-white/[0.03] transition-all cursor-pointer"
              >
                {deleting ? 'Deletando...' : isBulk ? 'Excluir tudo' : 'Deletar'}
              </button>
              <div className="h-px bg-white/[0.06]" />
              <button
                onClick={onCancel}
                className="w-full py-4 text-[13px] font-medium text-zinc-400 hover:text-white active:bg-white/[0.03] transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            <div className="sm:hidden flex justify-center pb-3 pt-1">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GalleryDeleteModal;
