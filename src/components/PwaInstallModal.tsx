import { type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Share2 } from 'lucide-react';

interface PwaInstallModalProps {
  open: boolean;
  isIOS: boolean;
  hasDeferredPrompt: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const PwaInstallModal: FC<PwaInstallModalProps> = ({
  open,
  isIOS,
  hasDeferredPrompt,
  onClose,
  onConfirm,
}) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] p-6 shadow-xl"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-400/10">
              <Download size={20} className="text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Instalar Aplicativo</h2>
          </div>

          {isIOS ? (
            <div className="space-y-3 text-sm text-gray-300">
              <p className="text-gray-400">Siga os passos abaixo para instalar no seu iPhone:</p>
              {[
                {
                  icon: Share2,
                  label: 'Toque no ícone de Compartilhar',
                  sub: 'na barra inferior do Safari',
                },
                {
                  icon: Download,
                  label: 'Role para baixo e toque em',
                  sub: '"Adicionar à Tela de Início"',
                },
                {
                  icon: Smartphone,
                  label: 'Confirme em "Adicionar"',
                  sub: 'no canto superior direito',
                },
              ].map(({ icon: Icon, label, sub }, i) => (
                <div key={i} className="flex items-start gap-3 bg-[#222] rounded-lg p-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 text-white font-medium">
                      <Icon size={14} className="text-amber-400" />
                      {label}
                    </div>
                    <div className="text-gray-400 text-xs mt-0.5">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 text-sm text-gray-300">
              <p>
                Deseja instalar o <strong className="text-white">Black Diamond</strong> no seu
                dispositivo?
              </p>
              <p className="text-gray-400 text-xs">
                Você poderá acessar rapidamente e receber notificações mesmo com o app fechado.
              </p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-[#222] text-gray-300 font-medium text-sm hover:bg-[#2a2a2a] transition-colors"
            >
              {isIOS || (!isIOS && !hasDeferredPrompt) ? 'Entendi' : 'Agora não'}
            </button>
            {!isIOS && hasDeferredPrompt && (
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-lg bg-amber-400 text-black font-bold text-sm hover:bg-amber-500 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Instalar
              </button>
            )}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default PwaInstallModal;
