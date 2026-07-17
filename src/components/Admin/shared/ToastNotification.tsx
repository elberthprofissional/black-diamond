import { type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastNotificationProps {
  toast: { message: string; type: 'success' | 'error' } | null;
}

const ToastNotification: FC<ToastNotificationProps> = ({ toast }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-[600]"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="flex items-center gap-3 px-5 py-3.5 bg-[#111111] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-md"
          >
            <div
              className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#D4AF37]'}`}
            />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
              {toast.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ToastNotification;
