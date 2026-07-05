import React from 'react';
import { X, ArrowLeft, Move, Trash2, ArrowLeft as PrevArrow, ArrowRight as NextArrow } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GalleryImage } from '../../../../hooks/useGallery';

interface GalleryPreviewProps {
  previewImage: GalleryImage | null;
  previewIndex: number;
  images: GalleryImage[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onMove: () => void;
  onPrev: () => void;
  onNext: () => void;
  touchStart: number | null;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

const GalleryPreview: React.FC<GalleryPreviewProps> = ({
  previewImage, previewIndex, images, onClose, onDelete, onMove,
  onPrev, onNext, onTouchStart, onTouchEnd,
}) => {
  return (
    <AnimatePresence>
      {previewImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black flex flex-col"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all cursor-pointer">
                <ArrowLeft size={20} className="text-white sm:hidden" />
                <X size={20} className="text-white hidden sm:block" />
              </button>
              {previewImage.created_at && (
                <div className="flex flex-col">
                  <span className="text-zinc-300 text-xs">
                    {new Date(previewImage.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-zinc-500 text-[10px]">
                    {new Date(previewImage.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
            <div className="px-3 py-1.5 bg-white/10 rounded-full">
              <span className="text-white text-xs font-medium">{previewIndex + 1} / {images.length}</span>
            </div>
          </div>

          {/* Image */}
          <div
            className="flex-1 flex items-center justify-center px-4 overflow-hidden min-h-0 relative"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={previewImage.image_url}
              alt={previewImage.alt || `Foto ${previewIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Bottom Actions - Desktop: Modern Dock */}
          <div className="hidden sm:block shrink-0 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center">
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-full border border-white/[0.1] shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
                style={{ background: 'rgba(25,25,25,0.7)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
              >
                <button onClick={onMove}
                  className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ease-out cursor-pointer hover:bg-white/[0.1] hover:scale-[1.05]"
                  title="Mover foto">
                  <Move size={16} className="text-zinc-500 transition-colors" />
                </button>

                <button onClick={onPrev}
                  className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ease-out cursor-pointer hover:bg-white/[0.1] hover:scale-[1.05]"
                  title="Foto anterior (← ou A)">
                  <PrevArrow size={18} className="text-zinc-500 transition-colors" />
                </button>

                <div className="w-14 h-14 flex items-center justify-center rounded-full bg-white/[0.05] mx-2">
                  <img src="/assets/logo.webp" alt="Black Diamond" className="h-9 w-auto" />
                </div>

                <button onClick={onNext}
                  className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ease-out cursor-pointer hover:bg-white/[0.1] hover:scale-[1.05]"
                  title="Próxima foto (→ ou D)">
                  <NextArrow size={18} className="text-zinc-500 transition-colors" />
                </button>

                <button onClick={() => onDelete(previewImage.id)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ease-out cursor-pointer hover:bg-red-500/15 hover:scale-[1.05] group"
                  title="Excluir foto">
                  <Trash2 size={16} className="text-zinc-500 group-hover:text-red-400 transition-colors" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Actions - Mobile */}
          <div className="sm:hidden shrink-0 border-t border-white/10 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-4">
              <button onClick={onMove} className="p-2 hover:bg-white/10 rounded-full transition-all cursor-pointer">
                <Move size={18} className="text-white" />
              </button>
              <button onClick={() => onDelete(previewImage.id)} className="p-2 hover:bg-white/10 rounded-full transition-all cursor-pointer">
                <Trash2 size={18} className="text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GalleryPreview;
