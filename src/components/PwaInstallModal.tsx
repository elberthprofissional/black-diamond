import { type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Share2 } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

interface PwaInstallModalProps {
  open: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSamsung: boolean;
  hasDeferredPrompt: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const PwaInstallModal: FC<PwaInstallModalProps> = ({
  open,
  isIOS,
  isAndroid,
  isSamsung,
  hasDeferredPrompt,
  onClose,
  onConfirm,
}) => {
  const { dialogRef } = useModalA11y(open, onClose);

  const renderIOSInstructions = () => (
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
  );

  const renderAndroidInstructions = () => {
    if (isSamsung) {
      return (
        <div className="space-y-3 text-sm text-gray-300">
          <p className="text-gray-400">Siga os passos abaixo para instalar no Samsung Internet:</p>
          {[
            {
              label: 'Toque nos três pontinhos',
              sub: 'no canto inferior direito',
            },
            {
              label: 'Role e toque em',
              sub: '"Instalar aplicativo"',
            },
            {
              label: 'Confirme em "Instalar"',
              sub: '',
            },
          ].map(({ label, sub }, i) => (
            <div key={i} className="flex items-start gap-3 bg-[#222] rounded-lg p-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <div className="text-white font-medium">{label}</div>
                {sub && <div className="text-gray-400 text-xs mt-0.5">{sub}</div>}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-3 text-sm text-gray-300">
        <p className="text-gray-400">Siga os passos abaixo para instalar no Android:</p>
        {[
          {
            label: 'Toque nos três pontinhos',
            sub: 'no canto superior direito do Chrome',
          },
          {
            label: 'Toque em',
            sub: '"Instalar aplicativo" ou "Adicionar à tela inicial"',
          },
          {
            label: 'Confirme em "Instalar"',
            sub: '',
          },
        ].map(({ label, sub }, i) => (
          <div key={i} className="flex items-start gap-3 bg-[#222] rounded-lg p-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div>
              <div className="text-white font-medium">{label}</div>
              {sub && <div className="text-gray-400 text-xs mt-0.5">{sub}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDefaultMessage = () => (
    <div className="space-y-4 text-sm text-gray-300">
      <p>
        Deseja instalar o <strong className="text-white">Black Diamond</strong> no seu dispositivo?
      </p>
      <p className="text-gray-400 text-xs">
        Você poderá acessar rapidamente e receber notificações mesmo com o app fechado.
      </p>
    </div>
  );

  return (
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
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Instalar aplicativo"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] p-6 shadow-xl"
          >
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-400/10">
                {isAndroid && isSamsung ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24">
                    <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5z" />
                  </svg>
                ) : (
                  <Download size={20} className="text-amber-400" />
                )}
              </div>
              <h2 className="text-lg font-bold text-white">Instalar Aplicativo</h2>
            </div>

            {isIOS && renderIOSInstructions()}
            {isAndroid && renderAndroidInstructions()}
            {!isIOS && !isAndroid && renderDefaultMessage()}

            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-[#222] text-gray-300 font-medium text-sm hover:bg-[#2a2a2a] transition-colors"
              >
                {isAndroid && hasDeferredPrompt ? 'Agora não' : 'Entendi'}
              </button>
              {hasDeferredPrompt && !isIOS && (
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
};

export default PwaInstallModal;
