import { type FormEvent, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2 } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  recoveryEmail: string;
  onEmailChange: (email: string) => void;
  onResetPassword: (e: FormEvent) => Promise<void>;
  isSendingReset: boolean;
  isResetSent: boolean;
  dialogRef: RefObject<HTMLDivElement | null>;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  recoveryEmail,
  onEmailChange,
  onResetPassword,
  isSendingReset,
  isResetSent,
  dialogRef,
}: ForgotPasswordModalProps) {
  const inputClass =
    'w-full h-12 bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 rounded-xl px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-all';
  const labelClass = 'block text-xs font-semibold text-zinc-400';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Recuperação de senha"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="bg-black/70 backdrop-blur-xl border border-gold/15 w-full max-w-[400px] relative z-10 overflow-hidden rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.65),0_0_50px_rgba(212,175,55,0.07)] p-6 sm:p-7"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>

            {!isResetSent ? (
              <div className="space-y-4">
                <div className="space-y-1 text-left">
                  <h2 className="text-lg font-bold text-white">Encontre sua conta</h2>
                  <p className="text-xs text-zinc-400">
                    Insira seu email para redefinir sua senha.
                  </p>
                </div>

                <div className="space-y-3.5 pt-2">
                  <div className="space-y-1.5 text-left">
                    <label className={labelClass}>E-mail</label>
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => onEmailChange(e.target.value)}
                      maxLength={120}
                      className={inputClass}
                      placeholder="Insira seu email"
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    onClick={onResetPassword}
                    disabled={isSendingReset || !recoveryEmail.trim()}
                    className="w-full h-14 bg-gradient-to-r from-[#f0d060] via-[#d4af37] to-[#b8923f] hover:brightness-110 text-black font-bold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99] shadow-lg shadow-gold/25"
                  >
                    {isSendingReset ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>Enviar link de recuperação</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-white">E-mail enviado!</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Enviamos um link de recuperação para{' '}
                    <span className="font-semibold text-white">{recoveryEmail}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-11 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
