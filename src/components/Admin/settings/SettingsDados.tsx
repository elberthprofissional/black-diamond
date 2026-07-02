import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteAllBookings, deleteAllClients } from '../../../lib/api';
import { getErrorMessage } from '../../../lib/utils';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';

interface SettingsDadosProps {
  onBack?: () => void;
}

const SettingsDados: React.FC<SettingsDadosProps> = () => {
  const { toast, showSuccess, showError } = useToast();
  const [activeModal, setActiveModal] = useState<'bookings' | 'clients' | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleDeleteBookings = async () => {
    setProcessing(true);
    try {
      await deleteAllBookings();
      showSuccess('Financeiro resetado com sucesso!');
      setActiveModal(null);
      setConfirmText('');
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteClients = async () => {
    setProcessing(true);
    try {
      await deleteAllClients();
      showSuccess('Clientes deletados com sucesso!');
      setActiveModal(null);
      setConfirmText('');
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col items-center">
      <div className="hidden lg:block mb-6 text-center w-full max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-white">Zona de Segurança</h2>
      </div>

      <div className="w-full max-w-2xl space-y-3">
        {/* Resetar financeiro */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden">
          <button
            onClick={() => { setActiveModal('bookings'); setConfirmText(''); }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="text-left">
              <span className="text-[13px] text-white block">Resetar financeiro</span>
              <span className="text-[11px] text-zinc-500 block mt-0.5">Zera faturamento, atendimentos e cancelados</span>
            </div>
          </button>
        </div>

        {/* Deletar clientes */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden">
          <button
            onClick={() => { setActiveModal('clients'); setConfirmText(''); }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="text-left">
              <span className="text-[13px] text-white block">Deletar clientes</span>
              <span className="text-[11px] text-zinc-500 block mt-0.5">Remove todos os clientes cadastrados</span>
            </div>
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setActiveModal(null); setConfirmText(''); }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative z-10 w-full sm:max-w-[340px] bg-[#1C1C1E] sm:rounded-2xl rounded-t-2xl overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4">
                <p className="text-[15px] font-semibold text-white">
                  {activeModal === 'bookings' ? 'Resetar financeiro' : 'Deletar clientes'}
                </p>
                <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                  {activeModal === 'bookings'
                    ? 'Todos os dados financeiros serão zerados. Os clientes e agendamentos serão mantidos.'
                    : 'Todos os seus clientes serão apagados permanentemente. Esta ação não pode ser desfeita.'}
                </p>
              </div>

              <div className="px-6 pb-5">
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={activeModal === 'bookings' ? 'Digite ZERAR para confirmar' : 'Digite DELETAR para confirmar'}
                  aria-label="Digite para confirmar"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-red-500/40 transition-all placeholder:text-zinc-600"
                  autoFocus
                  onKeyDown={(e) => {
                    const target = activeModal === 'bookings' ? 'ZERAR' : 'DELETAR';
                    if (e.key === 'Enter' && confirmText === target) {
                      if (activeModal === 'bookings') handleDeleteBookings();
                      else handleDeleteClients();
                    }
                  }}
                />
              </div>

              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => { setActiveModal(null); setConfirmText(''); }}
                  className="flex-1 py-4 text-[13px] font-medium text-zinc-400 hover:text-white active:bg-white/[0.03] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  onClick={activeModal === 'bookings' ? handleDeleteBookings : handleDeleteClients}
                  disabled={confirmText !== (activeModal === 'bookings' ? 'ZERAR' : 'DELETAR') || processing}
                  className="flex-1 py-4 text-[13px] font-semibold text-red-500 hover:text-red-400 active:bg-white/[0.03] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  {processing ? '...' : 'Confirmar'}
                </button>
              </div>

              <div className="sm:hidden flex justify-center pb-3 pt-1">
                <div className="w-10 h-1 rounded-full bg-white/10" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsDados;
