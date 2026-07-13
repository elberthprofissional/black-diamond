import { type FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteClientModalProps {
  isOpen: boolean;
  clientName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteClientModal: FC<DeleteClientModalProps> = ({
  isOpen,
  clientName,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const needsConfirmation = confirmText === 'EXCLUIR';

  const handleCancel = () => {
    setConfirmText('');
    onCancel();
  };

  const handleConfirm = () => {
    setConfirmText('');
    onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isDeleting && handleCancel()}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Excluir cliente"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative z-10 w-full sm:max-w-sm bg-[#111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-2 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-bold text-white">Excluir Cliente</h3>
                <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">
                  Tem certeza que deseja excluir{' '}
                  <span className="text-white font-semibold">{clientName}</span>?
                </p>
                <p className="text-[10px] text-red-400/70 mt-2 flex items-center gap-1.5">
                  <X size={10} />
                  Essa ação não pode ser desfeita
                </p>
              </div>
            </div>

            {/* Confirmação extra: digitar EXCLUIR */}
            <div className="px-6 py-3">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                Digite <span className="text-red-400">EXCLUIR</span> para confirmar
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="EXCLUIR"
                maxLength={7}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-red-500/40 transition-colors placeholder:text-zinc-700 text-center uppercase tracking-widest font-bold"
              />
            </div>

            {/* Actions */}
            <div className="flex border-t border-white/[0.04]">
              <button
                onClick={handleCancel}
                disabled={isDeleting}
                className="flex-1 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white hover:bg-white/[0.02] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <div className="w-px bg-white/[0.04]" />
              <button
                onClick={handleConfirm}
                disabled={isDeleting || !needsConfirmation}
                className={`flex-1 py-3.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  needsConfirmation
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-zinc-700 cursor-not-allowed'
                }`}
              >
                {isDeleting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </div>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteClientModal;
