import { type FC, type TouchEvent } from 'react';
import ToastNotification from '../shared/ToastNotification';
import { ImageIcon, Trash2, MoveVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGallery } from '../../../hooks/useGallery';
import GalleryPreview from './gallery/GalleryPreview';
import GalleryDeleteModal from './gallery/GalleryDeleteModal';
import GalleryMoveModal from './gallery/GalleryMoveModal';

const SettingsGaleria: FC = () => {
  const {
    // Data
    images,
    toast,
    MAX_PHOTOS,

    // Upload
    uploading,
    fileInputRef,
    openFilePicker,
    handleUpload,

    // Selection
    selectedImages,
    selectionMode,
    setSelectionMode,
    confirmBulkDelete,
    setConfirmBulkDelete,
    toggleSelect,
    handleBulkDelete,
    deleting,

    // Preview
    previewImage,
    previewIndex,
    setPreviewImage,
    setPreviewIndex,
    goToPrevPreview,
    goToNextPreview,
    touchStart,
    setTouchStart,

    // Delete (single)
    confirmDelete,
    setConfirmDelete,
    handleDelete,

    // Move
    showMoveModal,
    setShowMoveModal,
    moveTarget,
    setMoveTarget,
    handleMoveToPosition,
  } = useGallery();

  const isSelecting = selectionMode || selectedImages.length > 0;

  return (
    <div className="space-y-4 overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {/* Header - Google Photos style */}
      <div className="flex items-center justify-between h-12 px-1">
        <div className="flex items-center gap-3">
          <div>
            {isSelecting ? (
              <p className="text-sm font-medium text-white">
                {selectedImages.length} selecionada{selectedImages.length > 1 ? 's' : ''}
              </p>
            ) : (
              <p className="text-sm text-zinc-400">
                {images.length}/{MAX_PHOTOS} fotos
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isSelecting ? (
            <>
              {selectedImages.length === 1 && (
                <button
                  onClick={() => {
                    setMoveTarget(1);
                    setShowMoveModal(true);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <MoveVertical size={18} className="text-zinc-300" />
                </button>
              )}
              <button
                onClick={() => setConfirmBulkDelete(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-500/15 transition-colors cursor-pointer"
              >
                <Trash2 size={18} className="text-zinc-300" />
              </button>
            </>
          ) : (
            <>
              {images.length > 0 && (
                <button
                  onClick={() => setSelectionMode(true)}
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
                onClick={openFilePicker}
                disabled={uploading}
                className="h-8 px-3 flex items-center gap-1.5 rounded-full text-[11px] font-bold bg-[#D4AF37] hover:bg-[#b8962e] text-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Enviando...' : 'Adicionar'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Uploading progress bar */}
      <AnimatePresence>
        {uploading && (
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
      {images.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
            <ImageIcon size={24} className="text-zinc-700" />
          </div>
          <p className="text-zinc-500 text-sm font-medium mb-1">Nenhuma foto na galeria</p>
          <p className="text-zinc-600 text-xs">Clique em &ldquo;Adicionar&rdquo; para comecar</p>
        </div>
      )}

      {/* Image Grid - Google Photos style */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((image, index) => {
            const isSelected = selectedImages.includes(image.id);
            return (
              <div
                key={image.id}
                className={`relative group aspect-square bg-[#1a1a1a] rounded-lg overflow-hidden transition-all duration-150 ${
                  isSelected ? 'ring-2 ring-[#D4AF37]' : ''
                }`}
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
                    onClick={(e) => toggleSelect(image.id, e)}
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
                    if (isSelecting) {
                      toggleSelect(image.id, e);
                    } else {
                      setPreviewImage(image);
                      setPreviewIndex(index);
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
        previewImage={previewImage}
        previewIndex={previewIndex}
        images={images}
        onClose={() => setPreviewImage(null)}
        onDelete={(id) => {
          setConfirmDelete(id);
        }}
        onMove={() => {
          setMoveTarget((previewImage?.position || 0) + 1);
          setShowMoveModal(true);
        }}
        onPrev={goToPrevPreview}
        onNext={goToNextPreview}
        touchStart={touchStart}
        onTouchStart={(e: TouchEvent) => setTouchStart(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e: TouchEvent) => {
          if (touchStart === null) return;
          const diff = touchStart - (e.changedTouches[0]?.clientX ?? 0);
          if (Math.abs(diff) > 50) {
            if (diff > 0) goToNextPreview();
            else goToPrevPreview();
          }
          setTouchStart(null);
        }}
      />

      {/* Delete Modals */}
      <GalleryDeleteModal
        show={confirmDelete !== null}
        deleting={deleting}
        isBulk={false}
        bulkCount={0}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <GalleryDeleteModal
        show={confirmBulkDelete}
        deleting={deleting}
        isBulk={true}
        bulkCount={selectedImages.length}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      {/* Move Modal */}
      <GalleryMoveModal
        show={showMoveModal}
        moveTarget={moveTarget}
        totalImages={images.length}
        currentPosition={previewImage?.position || 0}
        onTargetChange={setMoveTarget}
        onConfirm={() => handleMoveToPosition(moveTarget)}
        onCancel={() => setShowMoveModal(false)}
      />

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsGaleria;
