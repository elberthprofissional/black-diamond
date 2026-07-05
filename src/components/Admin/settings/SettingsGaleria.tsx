import React from 'react';
import ToastNotification from '../shared/ToastNotification';
import { ImageIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGallery } from '../../../hooks/useGallery';
import GalleryPreview from './gallery/GalleryPreview';
import GalleryDeleteModal from './gallery/GalleryDeleteModal';
import GalleryMoveModal from './gallery/GalleryMoveModal';

interface SettingsGaleriaProps {
  onBack?: () => void;
}

const SettingsGaleria: React.FC<SettingsGaleriaProps> = () => {
  const g = useGallery();

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Hidden file input */}
      <input ref={g.fileInputRef} type="file" accept="image/*" onChange={g.handleUpload} className="hidden" />

      {/* Counter + Add Button */}
      <div className="flex items-center justify-between">
        <p className="text-zinc-500 text-xs">{g.images.length}/{g.MAX_PHOTOS} fotos</p>
        <div className="flex items-center gap-2">
          {g.images.length > 0 && (
            <button
              onClick={() => { g.setSelectionMode(!g.selectionMode); if (g.selectionMode) g.clearSelection(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                g.selectionMode
                  ? 'bg-[#C5A059]/20 text-[#C5A059]'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              {g.selectionMode ? 'Sair da seleção' : 'Selecionar'}
            </button>
          )}
          <button
            onClick={g.openFilePicker}
            disabled={g.uploading}
            className="px-3 py-1.5 bg-[#C5A059] hover:bg-[#A68233] text-black text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {g.uploading ? 'Enviando...' : 'Adicionar'}
          </button>
        </div>
      </div>

      {/* Uploading progress bar */}
      <AnimatePresence>
        {g.uploading && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#C5A059]/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-5 h-5 border-2 border-[#C5A059]/30 border-t-[#C5A059] rounded-full animate-spin" />
                <span className="text-xs text-zinc-400">Enviando a foto...</span>
              </div>
              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#C5A059] to-[#A68233] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {g.images.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
            <ImageIcon size={28} className="text-zinc-700" />
          </div>
          <p className="text-zinc-500 text-sm font-medium mb-1">Nenhuma foto na galeria</p>
          <p className="text-zinc-600 text-xs">Clique em "Adicionar" para comecar</p>
        </div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {g.images.map((image, index) => {
          const isSelected = g.selectedImages.includes(image.id);
          return (
            <div
              key={image.id}
              className={`relative group aspect-square bg-[#1a1a1a] rounded-xl overflow-hidden border min-w-0 transition-all duration-200 ${
                isSelected ? 'border-[#C5A059] ring-2 ring-[#C5A059]/30' : 'border-white/[0.04]'
              }`}
              onMouseDown={() => g.handleLongPressStart(image.id)}
              onMouseUp={g.handleLongPressEnd}
              onMouseLeave={g.handleLongPressEnd}
              onMouseMove={g.handleLongPressMove}
              onTouchStart={() => g.handleLongPressStart(image.id)}
              onTouchEnd={g.handleLongPressEnd}
              onTouchMove={g.handleLongPressMove}
            >
              <img
                src={image.image_url}
                alt={image.alt || `Foto ${index + 1}`}
                className={`w-full h-full object-cover transition-all duration-200 ${isSelected ? 'brightness-75' : ''}`}
                loading="lazy"
                draggable={false}
              />

              {/* Selection Check */}
              {(g.selectedImages.length > 0 || g.selectionMode) && (
                <button
                  onClick={(e) => g.toggleSelect(image.id, e)}
                  className="flex absolute top-2 right-2 z-30 w-6 h-6 rounded-full items-center justify-center transition-all cursor-pointer"
                  style={{
                    background: isSelected ? '#C5A059' : 'rgba(0,0,0,0.5)',
                    border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )}

              {/* Click to preview / toggle select */}
              <button
                onClick={(e) => {
                  if (g.checkAndClearLongPress()) return;
                  if (g.selectionMode) { g.toggleSelect(image.id, e); }
                  else if (g.selectedImages.length === 0) {
                    g.setPreviewImage(image);
                    g.setPreviewIndex(index);
                  }
                }}
                className="absolute inset-0 z-10 cursor-pointer"
                aria-label={`Ver foto ${index + 1}`}
              />



              {/* Position Badge */}
              <div className="absolute top-2 left-2 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-medium">{index + 1}</span>
              </div>
            </div>
          );
        })}
      </div>              {/* Bulk Selection Toolbar */}
      <AnimatePresence>
        {(g.selectedImages.length > 0 || g.selectionMode) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]"
          >
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-full border border-white/[0.1] shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
              style={{ background: 'rgba(25,25,25,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
            >
              <span className="text-zinc-400 text-xs font-medium mr-1">
                {g.selectedImages.length > 0
                  ? `${g.selectedImages.length} selecionada${g.selectedImages.length > 1 ? 's' : ''}`
                  : 'Clique nas fotos para selecionar'}
              </span>
              {g.selectedImages.length > 0 && (
                <>
                  <div className="w-px h-5 bg-white/10" />
                  <button onClick={() => { if (g.selectedImages.length === 1) { g.setMoveTarget(1); g.setShowMoveModal(true); } }}
                    disabled={g.selectedImages.length !== 1}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.08] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
                    <span className="text-zinc-300 text-xs">Mover</span>
                  </button>
                  <button onClick={() => g.setConfirmBulkDelete(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-500/15 transition-all cursor-pointer group">
                    <Trash2 size={14} className="text-zinc-400 group-hover:text-red-400 transition-colors" />
                    <span className="text-zinc-300 text-xs group-hover:text-red-400 transition-colors">Excluir</span>
                  </button>
                  <div className="w-px h-5 bg-white/10" />
                </>
              )}
              <button onClick={g.clearSelection}
                className="px-3 py-2 rounded-xl hover:bg-white/[0.08] transition-all cursor-pointer">
                <span className="text-zinc-500 text-xs">{g.selectedImages.length > 0 ? 'Cancelar' : 'Fechar'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <GalleryPreview
        previewImage={g.previewImage}
        previewIndex={g.previewIndex}
        images={g.images}
        onClose={() => g.setPreviewImage(null)}
        onDelete={(id) => { g.setConfirmDelete(id); }}
        onMove={() => { g.setMoveTarget((g.previewImage?.position || 0) + 1); g.setShowMoveModal(true); }}
        onPrev={g.goToPrevPreview}
        onNext={g.goToNextPreview}
        touchStart={g.touchStart}
        onTouchStart={(e: React.TouchEvent) => g.setTouchStart(e.touches[0].clientX)}
        onTouchEnd={(e: React.TouchEvent) => {
          if (g.touchStart === null) return;
          const diff = g.touchStart - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) {
            if (diff > 0) g.goToNextPreview();
            else g.goToPrevPreview();
          }
          g.setTouchStart(null);
        }}
      />

      {/* Delete Modals */}
      <GalleryDeleteModal
        show={g.confirmDelete !== null}
        deleting={g.deleting}
        isBulk={false}
        bulkCount={0}
        onConfirm={() => g.confirmDelete && g.handleDelete(g.confirmDelete)}
        onCancel={() => g.setConfirmDelete(null)}
      />
      <GalleryDeleteModal
        show={g.confirmBulkDelete}
        deleting={g.deleting}
        isBulk={true}
        bulkCount={g.selectedImages.length}
        onConfirm={g.handleBulkDelete}
        onCancel={() => g.setConfirmBulkDelete(false)}
      />

      {/* Move Modal */}
      <GalleryMoveModal
        show={g.showMoveModal}
        moveTarget={g.moveTarget}
        totalImages={g.images.length}
        currentPosition={g.previewImage?.position || 0}
        onTargetChange={g.setMoveTarget}
        onConfirm={() => g.handleMoveToPosition(g.moveTarget)}
        onCancel={() => g.setShowMoveModal(false)}
      />

      <ToastNotification toast={g.toast} />
    </div>
  );
};

export default SettingsGaleria;
