import { type FC, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingSlidePanelProps {
  isOpen: boolean;
  isDesktop: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Slide panel com animação para detalhes do agendamento.
 * Desktop: desliza da direita com backdrop blur.
 * Mobile: sobe de baixo com backdrop escuro.
 */
const BookingSlidePanel: FC<BookingSlidePanelProps> = ({
  isOpen,
  isDesktop,
  onClose,
  children,
}) => (
  <AnimatePresence>
    {isOpen && (
      <div
        className={`fixed inset-0 z-[200] ${isDesktop ? 'flex justify-end' : 'flex flex-col justify-end'}`}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`absolute inset-0 ${isDesktop ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/90 backdrop-blur-md'}`}
        />

        {/* Panel */}
        <motion.div
          initial={isDesktop ? { x: '100%' } : { y: '100%' }}
          animate={isDesktop ? { x: 0 } : { y: 0 }}
          exit={isDesktop ? { x: '100%' } : { y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={`relative bg-[#0f0f0f] z-10 flex flex-col overflow-hidden ${
            isDesktop
              ? 'w-[400px] h-full bg-[#0E0E0E] border-l border-white/[0.06] shadow-2xl'
              : 'w-full h-[100dvh] text-left'
          }`}
        >
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default BookingSlidePanel;
