import { type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditClientModalProps {
  isOpen: boolean;
  name: string;
  phone: string;
  saving: boolean;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const EditClientModal: FC<EditClientModalProps> = ({
  isOpen,
  name,
  phone,
  saving,
  onNameChange,
  onPhoneChange,
  onSave,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Editar cliente"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm relative z-10 rounded-2xl shadow-2xl p-5"
          >
            <h3 className="text-sm font-semibold text-white mb-4">Editar Cliente</h3>
            <div className="space-y-3">
              <div>
                <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Nome
                </span>
                <input
                  type="text"
                  id="edit-client-name"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  aria-label="Nome do cliente"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors"
                />
              </div>
              <div>
                <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  WhatsApp
                </span>
                <input
                  type="text"
                  id="edit-client-phone"
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  aria-label="WhatsApp do cliente"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors tabular-nums"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={onCancel}
                className="flex-1 py-3 text-zinc-500 font-semibold text-xs hover:text-white transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={onSave}
                disabled={saving || !name.trim() || !phone.trim()}
                className="flex-1 py-3 bg-[#C5A059] text-black font-semibold text-xs rounded-xl hover:bg-[#A68233] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? '...' : 'Salvar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditClientModal;
