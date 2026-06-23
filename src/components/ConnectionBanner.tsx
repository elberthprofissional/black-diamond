import React from 'react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { motion, AnimatePresence } from 'framer-motion';

const ConnectionBanner: React.FC = () => {
  const { status } = useConnectionStatus();

  return (
    <AnimatePresence>
      {status === 'disconnected' && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[999] bg-red-500/90 backdrop-blur-md px-4 py-2.5 flex items-center justify-center gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <p className="text-[10px] font-bold text-white uppercase tracking-wider">
            Sem conexão com o servidor. Verifique sua internet.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConnectionBanner;
