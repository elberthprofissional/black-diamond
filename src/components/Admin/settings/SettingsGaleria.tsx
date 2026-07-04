import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { supabase } from '../../../lib/supabase';
import { Camera, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryImage {
  id: string;
  image_url: string;
  alt: string;
  position: number;
}

interface SettingsGaleriaProps {
  onBack?: () => void;
}

const MAX_PHOTOS = 8;

const SettingsGaleria: React.FC<SettingsGaleriaProps> = () => {
  const { toast, showSuccess, showError } = useToast();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = async () => {
    const { data } = await supabase
      .from('gallery_images')
      .select('*')
      .order('position', { ascending: true });

    if (data) setImages(data);
  };

  useEffect(() => {
    loadImages();
  }, []);

  const convertToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1200;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error('Failed to convert to WebP'));
          },
          'image/webp',
          0.85
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Envie apenas imagens');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showError('Imagem muito grande (max 2MB)');
      return;
    }

    if (images.length >= MAX_PHOTOS) {
      showError(`Máximo de ${MAX_PHOTOS} fotos`);
      return;
    }

    setUploading(true);
    try {
      const webpBlob = await convertToWebP(file);
      const filePath = `gallery/${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, webpBlob, { contentType: 'image/webp' });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        showError(`Erro: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        const nextPosition = images.length > 0 ? Math.max(...images.map((i) => i.position)) + 1 : 0;

        const { error: insertError } = await supabase.from('gallery_images').insert({
          image_url: imageUrl,
          alt: '',
          position: nextPosition,
        });

        if (insertError) {
          showError('Erro ao salvar no banco');
          return;
        }

        showSuccess('Foto adicionada!');
        loadImages();
      }
    } catch (err) {
      console.error('Upload catch:', err);
      showError('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from('gallery_images').delete().eq('id', id);

      if (error) {
        showError('Erro ao deletar');
        return;
      }

      showSuccess('Foto removida!');
      setImages((prev) => prev.filter((i) => i.id !== id));
    } catch {
      showError('Erro ao deletar');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = images.findIndex((i) => i.id === id);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= images.length) return;

    const newImages = [...images];
    const tempPos = newImages[idx].position;
    newImages[idx].position = newImages[swapIdx].position;
    newImages[swapIdx].position = tempPos;

    // Swap in array
    [newImages[idx], newImages[swapIdx]] = [newImages[swapIdx], newImages[idx]];

    setImages(newImages);

    // Update in database
    await supabase
      .from('gallery_images')
      .update({ position: newImages[idx].position })
      .eq('id', newImages[idx].id);

    await supabase
      .from('gallery_images')
      .update({ position: newImages[swapIdx].position })
      .eq('id', newImages[swapIdx].id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">Galeria</h3>
          <p className="text-zinc-500 text-xs mt-1">
            {images.length}/{MAX_PHOTOS} fotos
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= MAX_PHOTOS}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <Camera size={14} />
          )}
          {uploading ? 'Enviando...' : 'Adicionar'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* Empty State */}
      {images.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/10 rounded-2xl">
          <ImageIcon size={48} className="text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-sm">Nenhuma foto na galeria</p>
          <p className="text-zinc-600 text-xs mt-1">Clique em "Adicionar" para começar</p>
        </div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative group aspect-square bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/[0.04]"
          >
            <img
              src={image.image_url}
              alt={image.alt || `Foto ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex items-center gap-2">
                {/* Move Up */}
                <button
                  onClick={() => handleMove(image.id, 'up')}
                  disabled={index === 0}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Mover para cima"
                >
                  <ArrowUp size={14} className="text-white" />
                </button>

                {/* Move Down */}
                <button
                  onClick={() => handleMove(image.id, 'down')}
                  disabled={index === images.length - 1}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Mover para baixo"
                >
                  <ArrowDown size={14} className="text-white" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => setConfirmDelete(image.id)}
                  disabled={deleting === image.id}
                  className="w-8 h-8 bg-red-500/20 hover:bg-red-500/40 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Deletar foto"
                >
                  {deleting === image.id ? (
                    <div className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={14} className="text-red-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Position Badge */}
            <div className="absolute top-2 left-2 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
              <span className="text-[10px] text-white font-medium">{index + 1}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full border border-white/[0.06]"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-white font-bold text-sm mb-2">Deletar foto?</h4>
              <p className="text-zinc-500 text-xs mb-6">Essa ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-3 bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deleting !== null}
                  className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {deleting ? 'Deletando...' : 'Deletar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsGaleria;
