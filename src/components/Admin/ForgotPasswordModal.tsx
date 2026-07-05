import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  recoveryEmail: string;
  onEmailChange: (email: string) => void;
  onResetPassword: (e: React.FormEvent) => Promise<void>;
  isSendingReset: boolean;
  isResetSent: boolean;
  dialogRef: React.RefObject<HTMLDivElement | null>;
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
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Recuperação de senha"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#111111] border border-white/10 w-full max-w-[400px] relative z-10 overflow-hidden rounded-2xl shadow-2xl"
          >
            {!isResetSent ? (
              <>
                <button
                  onClick={onClose}
                  className="absolute top-4 left-4 z-10 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
                <div className="p-6 sm:p-8 pb-5 sm:pb-6 text-center border-b border-white/5">
                  <h2 className="text-base sm:text-lg font-semibold text-white mb-1">
                    Encontre sua conta
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Insira seu email para redefinir sua senha.
                  </p>
                </div>
                <div className="p-6 sm:p-8 space-y-3 sm:space-y-4">
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => onEmailChange(e.target.value)}
                    className="w-full h-11 sm:h-12 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 text-sm text-white outline-none focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/20 transition-colors placeholder:text-zinc-600"
                    placeholder="Insira seu email"
                  />
                  <button
                    onClick={onResetPassword}
                    disabled={isSendingReset || !recoveryEmail.trim()}
                    className="w-full h-11 bg-[#C5A059] hover:bg-[#b8923f] text-black font-semibold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingReset ? 'Enviando...' : 'Enviar link de recuperação'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="absolute top-4 left-4 z-10 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
                <div className="p-6 sm:p-8 pb-5 sm:pb-6 text-center border-b border-white/5">
                  <div className="w-14 sm:w-16 h-14 sm:h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-white mb-1">
                    Email enviado!
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Enviamos um link de recuperação para{' '}
                    <span className="font-medium text-white">{recoveryEmail}</span>. Verifique sua
                    caixa de entrada.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
