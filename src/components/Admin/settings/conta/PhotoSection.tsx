import { useState, useRef, type FC, type ChangeEvent } from 'react';
import { User, Camera } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useBarberSettings } from '../../../../contexts/BarberSettingsContext';
import { useToast } from '../../../../hooks/useToast';
import PhotoMenu from '../PhotoMenu';

/* ─── Seção de foto de perfil ───
 * Upload com redimensionamento automatico para WebP (max 1024px).
 * Remove fotos antigas (webp/jpg/png) ao fazer upload novo.
 * Menu flutuante com opcoes: alterar foto / remover foto. */

const PhotoSection: FC = () => {
  const { barberPhoto, updateBarberPhoto } = useBarberSettings();
  const { showSuccess, showError } = useToast();
  const [uploading, setUploading] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRemovePhoto = async () => {
    setShowPhotoMenu(false);
    if (!barberPhoto) return;
    await supabase.storage
      .from('avatars')
      .remove([
        'profiles/barber-photo.webp',
        'profiles/barber-photo.jpg',
        'profiles/barber-photo.png',
      ]);
    const ok = await updateBarberPhoto('');
    if (ok) showSuccess('Foto removida!');
    else showError('Erro ao remover foto');
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
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

    setShowPhotoMenu(false);
    setUploading(true);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxSize = 1024;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height / width) * maxSize);
            width = maxSize;
          } else {
            width = Math.round((width / height) * maxSize);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          showError('Erro ao processar imagem');
          setUploading(false);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) uploadPhoto(blob);
            else {
              showError('Erro ao processar imagem');
              setUploading(false);
            }
          },
          'image/webp',
          0.95
        );
      };
      img.onerror = () => {
        showError('Erro ao carregar imagem');
        setUploading(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadPhoto = async (blob: Blob) => {
    try {
      for (const old of [
        'profiles/barber-photo.webp',
        'profiles/barber-photo.jpg',
        'profiles/barber-photo.png',
      ]) {
        await supabase.storage.from('avatars').remove([old]);
      }
      const filePath = `profiles/barber-photo-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { contentType: 'image/webp' });
      if (uploadError) {
        showError(`Erro: ${uploadError.message}`);
        return;
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (urlData?.publicUrl) {
        const ok = await updateBarberPhoto(`${urlData.publicUrl}?t=${Date.now()}`);
        if (ok) showSuccess('Foto alterada!');
        else showError('Erro ao salvar foto');
      }
    } catch {
      showError('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center pt-2 pb-4">
      <button
        onClick={() => setShowPhotoMenu(!showPhotoMenu)}
        disabled={uploading}
        className="relative w-24 h-24 rounded-full group cursor-pointer overflow-hidden border-2 border-white/10 hover:border-[#C5A059]/40 transition-all bg-white/[0.03] flex items-center justify-center"
        aria-label="Alterar foto de perfil"
      >
        {barberPhoto ? (
          <img src={barberPhoto} alt="Foto do barbeiro" className="w-full h-full object-cover" />
        ) : (
          <User size={32} className="text-zinc-600" />
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-all group-hover:bg-black/50">
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Camera size={18} className="text-white" />
          )}
        </div>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      <PhotoMenu
        show={showPhotoMenu}
        onClose={() => setShowPhotoMenu(false)}
        onRemove={handleRemovePhoto}
        hasPhoto={!!barberPhoto}
        fileInputRef={fileInputRef}
      />
    </div>
  );
};

export default PhotoSection;
