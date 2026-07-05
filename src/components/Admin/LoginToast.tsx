import { motion, AnimatePresence } from 'framer-motion';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

interface LoginToastProps {
  toast: Toast | null;
}

export default function LoginToast({ toast }: LoginToastProps) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[100] px-6 py-4 rounded-2xl lg:rounded-sm border bg-[#0A0A0A] border-white/5 backdrop-blur-3xl shadow-2xl flex items-center gap-4 ${
            toast.type === 'error' ? 'text-red-500' : 'text-[#C5A059]'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#C5A059]'}`}
          />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">{toast.message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
