import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteAllClients } from '../../../lib/api';
import { getErrorMessage } from '../../../lib/utils';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';

interface SettingsDadosProps {
  onBack: () => void;
}

const SettingsDados: React.FC<SettingsDadosProps> = ({ onBack }) => {
  const { toast, showSuccess, showError } = useToast();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleResetData = async () => {
    setResetting(true);
    try {
      await deleteAllClients();
      showSuccess('Dados limpos com sucesso!');
      setShowResetConfirm(false);
      setResetText('');
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Voltar"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">Dados</h1>
      </div>

      {/* Clear data */}
      <div className="bg-[#111111] border border-red-500/10 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-500/[0.03] transition-all cursor-pointer"
        >
          <div className="text-left">
            <span className="text-[13px] text-red-400 block">Limpar todos os dados</span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">Apaga agendamentos e clientes permanentemente</span>
          </div>
        </button>
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowResetConfirm(false); setResetText(''); }}
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
                <p className="text-[15px] font-semibold text-white">Limpar dados</p>
                <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                  Todos os dados da barbearia vão ser apagados permanentemente.
                </p>
              </div>

              <div className="px-6 pb-5">
                <input
                  type="text"
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value.toUpperCase())}
                  placeholder="Digite LIMPAR para confirmar"
                  aria-label="Digite LIMPAR para confirmar"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-red-500/40 transition-all placeholder:text-zinc-600"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && resetText === 'LIMPAR') handleResetData(); }}
                />
              </div>

              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => { setShowResetConfirm(false); setResetText(''); }}
                  className="flex-1 py-4 text-[13px] font-medium text-zinc-400 hover:text-white active:bg-white/[0.03] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  onClick={handleResetData}
                  disabled={resetText !== 'LIMPAR' || resetting}
                  className="flex-1 py-4 text-[13px] font-semibold text-red-500 hover:text-red-400 active:bg-white/[0.03] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  {resetting ? '...' : 'Limpar'}
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
