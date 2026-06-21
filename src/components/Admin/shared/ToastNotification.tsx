import React from 'react';
import { AnimatePresence } from 'framer-motion';

interface ToastNotificationProps {
  toast: { message: string; type: 'success' | 'error' } | null;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toast }) => {
  return (
    <AnimatePresence>
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-3 px-5 py-3.5 bg-[#111111] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-md">
          <div className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#C5A059]'}`} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">{toast.message}</p>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ToastNotification;
