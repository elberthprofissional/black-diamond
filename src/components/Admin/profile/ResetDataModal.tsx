import { type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResetDataModalProps {
  open: boolean;
  step: 'confirm' | 'password';
  resetText: string;
  resetPassword: string;
  resetPasswordError: string;
  resetting: boolean;
  onResetTextChange: (text: string) => void;
  onResetPasswordChange: (password: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  onBack: () => void;
}

const ResetDataModal: FC<ResetDataModalProps> = ({
  open,
  step,
  resetText,
  resetPassword,
  resetPasswordError,
  resetting,
  onResetTextChange,
  onResetPasswordChange,
  onConfirm,
  onClose,
  onBack,
}) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
            {step === 'password' ? (
              <>
                <p className="text-[15px] font-semibold text-white text-center">
                  Confirme sua senha
                </p>
                <p className="text-[12px] text-zinc-500 mt-1.5 text-center leading-relaxed">
                  Digite sua senha de administrador para limpar os dados.
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-white">Limpar dados</p>
                <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                  Todos os dados da barbearia vao ser apagados permanentemente.
                </p>
              </>
            )}
          </div>
          <div className="px-6 pb-5">
            {step === 'password' ? (
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => onResetPasswordChange(e.target.value)}
                placeholder="Sua senha"
                aria-label="Senha do administrador"
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-red-500/40 transition-all placeholder:text-zinc-600"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && resetPassword.trim()) onConfirm();
                }}
              />
            ) : (
              <input
                type="text"
                value={resetText}
                onChange={(e) => onResetTextChange(e.target.value.toUpperCase())}
                placeholder="Digite LIMPAR para confirmar"
                aria-label="Digite LIMPAR para confirmar a limpeza dos dados"
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/10 transition-all placeholder:text-zinc-600"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && resetText === 'LIMPAR') onConfirm();
                }}
              />
            )}
            {resetPasswordError && (
              <p className="text-[11px] text-red-400 mt-2">{resetPasswordError}</p>
            )}
          </div>
          <div className="flex border-t border-white/[0.06]">
            <button
              onClick={onBack}
              className="flex-1 py-4 text-[13px] font-medium text-zinc-400 hover:text-white active:bg-white/[0.03] transition-all cursor-pointer"
            >
              {step === 'password' ? 'Voltar' : 'Cancelar'}
            </button>
            <div className="w-px bg-white/[0.06]" />
            <button
              onClick={onConfirm}
              disabled={
                step === 'confirm'
                  ? resetText !== 'LIMPAR' || resetting
                  : !resetPassword.trim() || resetting
              }
              className="flex-1 py-4 text-[13px] font-semibold text-red-500 hover:text-red-400 active:bg-white/[0.03] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
            >
              {resetting ? '...' : step === 'password' ? 'Confirmar' : 'Limpar'}
            </button>
          </div>
          <div className="sm:hidden flex justify-center pb-3 pt-1">
            <div className="w-10 h-1 rounded-full bg-white/10" />
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default ResetDataModal;
