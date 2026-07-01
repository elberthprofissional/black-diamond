import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface NewClientModalProps {
  isOpen: boolean;
  name: string;
  phone: string;
  notes: string;
  saving: boolean;
  error: string;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  name,
  phone,
  notes,
  saving,
  error,
  onNameChange,
  onPhoneChange,
  onNotesChange,
  onSave,
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
            onClick={onCancel}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Criar novo cliente"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-10 w-full max-h-[85vh] sm:w-[340px] sm:max-h-none bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col"
          >
            <div className="px-6 pt-6 pb-5 text-left">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.2em]">Novo cliente</span>
                <button
                  onClick={onCancel}
                  className="text-zinc-600 hover:text-white transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Nome</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-700 text-left"
                    autoFocus
                  />
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">WhatsApp</span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => onPhoneChange(e.target.value)}
                    placeholder="00000000000"
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-700 tabular-nums text-left"
                  />
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}
                <div>
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                    Anotações <span className="text-zinc-500">(opcional)</span>
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder="Ex: Prefere degradê baixo..."
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-600 resize-none h-16 text-left"
                  />
                </div>
              </div>
            </div>
            <div className="flex border-t border-white/[0.04]">
              <button
                onClick={onCancel}
                className="flex-1 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white hover:bg-white/[0.02] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <div className="w-px bg-white/[0.04]" />
              <button
                onClick={onSave}
                disabled={saving || !name.trim() || !phone.trim()}
                className="flex-1 py-3.5 text-[10px] font-bold text-[#C5A059] uppercase tracking-wider hover:bg-[#C5A059]/10 transition-all cursor-pointer disabled:opacity-30"
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

export default NewClientModal;
