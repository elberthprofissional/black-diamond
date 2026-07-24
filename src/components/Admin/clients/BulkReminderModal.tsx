import { type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import ReminderClientList from '../shared/ReminderClientList';
import type { Client } from '../../../types';

interface BulkReminderModalProps {
  isOpen: boolean;
  clientsNeedingReminder: Client[];
  onSelectClient: (client: Client) => void;
  onClose: () => void;
}

const BulkReminderModal: FC<BulkReminderModalProps> = ({
  isOpen,
  clientsNeedingReminder,
  onSelectClient,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="hidden lg:flex fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-[400px] bg-[#0E0E0E] border border-white/[0.06] rounded-2xl overflow-hidden max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                  <Bell size={14} className="text-[#D4AF37]" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.25em] block">
                    Enviar Lembrete
                  </span>
                  <p className="text-[12px] font-medium text-zinc-400 mt-0.5">
                    Selecione o cliente
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <ReminderClientList
              clients={clientsNeedingReminder}
              onSelect={onSelectClient}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkReminderModal;
