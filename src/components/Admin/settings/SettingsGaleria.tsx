import { type FC, type TouchEvent } from 'react';
import ToastNotification from '../shared/ToastNotification';
import { ImageIcon, Trash2, MoveVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGallery } from '../../../hooks/useGallery';
import GalleryPreview from './gallery/GalleryPreview';
import GalleryDeleteModal from './gallery/GalleryDeleteModal';
import GalleryMoveModal from './gallery/GalleryMoveModal';

const SettingsGaleria: FC = () => {
  const g = useGallery();
  const isSelecting = g.selectionMode || g.selectedImages.length > 0;

  return (
    <div className="space-y-4 overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={g.fileInputRef}
        type="file"
        accept="image/*"
        onChange={g.handleUpload}
        className="hidden"
      />

      {/* Header - Google Photos style */}
      <div className="flex items-center justify-between h-12 px-1">
        <div className="flex items-center gap-3">
          <div>
            {isSelecting ? (
              <p className="text-sm font-medium text-white">
                {g.selectedImages.length} selecionada{g.selectedImages.length > 1 ? 's' : ''}
              </p>
            ) : (
              <p className="text-sm text-zinc-400">
                {g.images.length}/{g.MAX_PHOTOS} fotos
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isSelecting ? (
            <>
              {g.selectedImages.length === 1 && (
                <button
                  onClick={() => {
                    g.setMoveTarget(1);
                    g.setShowMoveModal(true);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <MoveVertical size={18} className="text-zinc-300" />
                </button>
              )}
              <button
                onClick={() => g.setConfirmBulkDelete(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-500/15 transition-colors cursor-pointer"
              >
                <Trash2 size={18} className="text-zinc-300" />
              </button>
            </>
          ) : (
            <>
              {g.images.length > 0 && (
                <button
                  onClick={() => g.setSelectionMode(true)}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-full text-[11px] font-medium bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Selecionar
                </button>
              )}
              <button
                onClick={g.openFilePicker}
                disabled={g.uploading}
                className="h-8 px-3 flex items-center gap-1.5 rounded-full text-[11px] font-bold bg-[#D4AF37] hover:bg-[#b8962e] text-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {g.uploading ? 'Enviando...' : 'Adicionar'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Uploading progress bar */}
      <AnimatePresence>
        {g.uploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#D4AF37]/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-4 h-4 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
                <span className="text-xs text-zinc-400">Enviando a foto...</span>
              </div>
              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#D4AF37] to-[#b8962e] rounded-full"
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
          <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
            <ImageIcon size={24} className="text-zinc-700" />
          </div>
          <p className="text-zinc-500 text-sm font-medium mb-1">Nenhuma foto na galeria</p>
          <p className="text-zinc-600 text-xs">Clique em "Adicionar" para comecar</p>
        </div>
      )}

      {/* Image Grid - Google Photos style */}
      {g.images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {g.images.map((image, index) => {
            const isSelected = g.selectedImages.includes(image.id);
            return (
              <div
                key={image.id}
                className={`relative group aspect-square bg-[#1a1a1a] rounded-lg overflow-hidden transition-all duration-150 ${
                  isSelected ? 'ring-2 ring-[#D4AF37]' : ''
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
                  className={`w-full h-full object-cover transition-all duration-150 ${isSelected ? 'brightness-75' : ''}`}
                  loading="lazy"
                  draggable={false}
                />

                {/* Selection Check - smaller */}
                {isSelecting && (
                  <button
                    onClick={(e) => g.toggleSelect(image.id, e)}
                    className="absolute top-1.5 right-1.5 z-30 w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      background: isSelected ? '#D4AF37' : 'rgba(0,0,0,0.5)',
                      border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.4)',
                    }}
                  >
                    {isSelected && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="black"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Click to preview / toggle select */}
                <button
                  onClick={(e) => {
                    if (g.checkAndClearLongPress()) return;
                    if (isSelecting) {
                      g.toggleSelect(image.id, e);
                    } else {
                      g.setPreviewImage(image);
                      g.setPreviewIndex(index);
                    }
                  }}
                  className="absolute inset-0 z-10 cursor-pointer"
                  aria-label={`Ver foto ${index + 1}`}
                />

                {/* Position Badge - smaller */}
                {!isSelecting && (
                  <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center">
                    <span className="text-[9px] text-white/80 font-medium">{index + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <GalleryPreview
        previewImage={g.previewImage}
        previewIndex={g.previewIndex}
        images={g.images}
        onClose={() => g.setPreviewImage(null)}
        onDelete={(id) => {
          g.setConfirmDelete(id);
        }}
        onMove={() => {
          g.setMoveTarget((g.previewImage?.position || 0) + 1);
          g.setShowMoveModal(true);
        }}
        onPrev={g.goToPrevPreview}
        onNext={g.goToNextPreview}
        touchStart={g.touchStart}
        onTouchStart={(e: TouchEvent) => g.setTouchStart(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e: TouchEvent) => {
          if (g.touchStart === null) return;
          const diff = g.touchStart - (e.changedTouches[0]?.clientX ?? 0);
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
