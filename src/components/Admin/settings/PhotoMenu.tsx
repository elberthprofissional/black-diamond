import React from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface PhotoMenuProps {
  show: boolean;
  onClose: () => void;
  onRemove: () => void;
  hasPhoto: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const PhotoMenu: React.FC<PhotoMenuProps> = ({
  show,
  onClose,
  onRemove,
  hasPhoto,
  fileInputRef,
}) => {
  if (!show) return null;

  return (
    <>
      {/* Backdrop (desktop) */}
      <div
        className="hidden lg:block lg:fixed lg:inset-0 lg:z-50"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        tabIndex={0}
      />

      {/* Desktop Popover */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -4 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350, mass: 0.6 }}
        onClick={(e) => e.stopPropagation()}
        className="hidden lg:block absolute top-full mt-2 z-50 w-56 bg-[#1C1C1F] border border-white/[0.06] rounded-xl shadow-xl overflow-hidden"
      >
        <div className="py-1">
          <button
            onClick={() => {
              onClose();
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
          >
            <Camera size={15} className="text-zinc-500 shrink-0" />
            <span>Alterar foto</span>
          </button>
          {hasPhoto && (
            <>
              <div className="mx-3 h-px bg-white/[0.08]" />
              <button
                onClick={onRemove}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#ED4956] hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
              >
                <Trash2 size={15} className="text-[#ED4956]/60 shrink-0" />
                <span>Remover foto</span>
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Mobile Bottom Sheet */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="lg:hidden fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        tabIndex={0}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-[#1C1C1F] rounded-t-2xl shadow-2xl overflow-hidden min-h-[30vh]"
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-1 rounded-full bg-white/[0.12]" />
          </div>
          <div className="px-6 pb-8 pt-4 space-y-1">
            <button
              onClick={() => {
                onClose();
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center gap-4 px-4 py-4 text-[15px] font-medium text-white hover:bg-white/[0.06] rounded-xl transition-colors duration-150 cursor-pointer"
            >
              <Camera size={18} className="text-zinc-500 shrink-0" />
              <span>Alterar foto de perfil</span>
            </button>
            <div className="h-px bg-white/[0.08] mx-2" />
            {hasPhoto && (
              <>
                <button
                  onClick={onRemove}
                  className="w-full flex items-center gap-4 px-4 py-4 text-[15px] font-medium text-[#ED4956] hover:bg-white/[0.06] rounded-xl transition-colors duration-150 cursor-pointer"
                >
                  <Trash2 size={18} className="text-[#ED4956]/60 shrink-0" />
                  <span>Remover foto</span>
                </button>
                <div className="h-px bg-white/[0.08] mx-2" />
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default PhotoMenu;
