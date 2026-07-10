import { useState, useEffect, useRef, type FC, type ChangeEvent } from 'react';
import { useBarberSettings } from '../../../contexts/BarberSettingsContext';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { supabase } from '../../../lib/supabase';
import { formatPhone } from '../../../lib/utils';
import { User, Camera, ChevronRight } from 'lucide-react';
import PhotoMenu from './PhotoMenu';
import MobileEditScreen from './MobileEditScreen';

interface SettingsContaProps {
  onBack?: () => void;
}

const SettingsConta: FC<SettingsContaProps> = ({ onBack: _onBack }) => {
  const {
    barberName,
    barberPhone,
    barberPhoto,
    barberBio,
    barberQuote,
    barberInstagram,
    updateBarberName,
    updateBarberPhone,
    updateBarberPhoto,
    updateBarberBio,
    updateBarberQuote,
    updateBarberInstagram,
  } = useBarberSettings();
  const { toast, showSuccess, showError } = useToast();

  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [quoteInput, setQuoteInput] = useState('');
  const [instagramInput, setInstagramInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editingQuote, setEditingQuote] = useState(false);
  const [editingInstagram, setEditingInstagram] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const bioInputRef = useRef<HTMLTextAreaElement>(null);
  const quoteInputRef = useRef<HTMLInputElement>(null);
  const instagramInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameInput(barberName);
    setPhoneInput(barberPhone);
    setBioInput(barberBio);
    setQuoteInput(barberQuote);
    setInstagramInput(barberInstagram);
  }, [barberName, barberPhone, barberBio, barberQuote, barberInstagram]);

  // Auto-focus on edit
  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);
  useEffect(() => {
    if (editingPhone) phoneInputRef.current?.focus();
  }, [editingPhone]);
  useEffect(() => {
    if (editingBio) bioInputRef.current?.focus();
  }, [editingBio]);
  useEffect(() => {
    if (editingQuote) quoteInputRef.current?.focus();
  }, [editingQuote]);
  useEffect(() => {
    if (editingInstagram) instagramInputRef.current?.focus();
  }, [editingInstagram]);

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
            if (blob) {
              uploadPhoto(blob);
            } else {
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed.length > 8) {
      showError('Máximo de 8 caracteres');
      return;
    }
    if (trimmed) {
      const ok = await updateBarberName(trimmed);
      if (ok) {
        showSuccess('Nome alterado!');
        setEditingName(false);
      } else showError('Erro ao alterar nome');
    }
  };

  const handleSavePhone = async () => {
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length >= 10) {
      const ddd = parseInt(digits.slice(0, 2), 10);
      if (ddd < 11 || ddd > 99) {
        showError('DDD inválido.');
        return;
      }
      const ok = await updateBarberPhone(digits);
      if (ok) {
        showSuccess('Telefone alterado!');
        setEditingPhone(false);
        // Forçar refetch para garantir sincronização
        setTimeout(() => {
          setPhoneInput(digits);
        }, 100);
      } else showError('Erro ao alterar telefone');
    }
  };

  const handleSaveBio = async () => {
    const trimmed = bioInput.trim();
    if (trimmed.length > 200) {
      showError('Máximo de 200 caracteres');
      return;
    }
    const ok = await updateBarberBio(trimmed);
    if (ok) {
      showSuccess('Bio alterada!');
      setEditingBio(false);
    } else showError('Erro ao alterar bio');
  };

  const handleSaveQuote = async () => {
    const trimmed = quoteInput.trim();
    if (trimmed.length > 80) {
      showError('Máximo de 80 caracteres');
      return;
    }
    const ok = await updateBarberQuote(trimmed);
    if (ok) {
      showSuccess('Frase alterada!');
      setEditingQuote(false);
    } else showError('Erro ao alterar frase');
  };

  const handleSaveInstagram = async () => {
    const cleaned = instagramInput.replace(/^@/, '').trim();
    if (cleaned.length > 30) {
      showError('Máximo de 30 caracteres');
      return;
    }
    const ok = await updateBarberInstagram(cleaned);
    if (ok) {
      showSuccess('Instagram alterado!');
      setEditingInstagram(false);
    } else showError('Erro ao alterar Instagram');
  };

  return (
    <div className="space-y-6">
      <div className="w-full space-y-4">
        {/* Photo */}
        <div className="relative flex flex-col items-center pt-2 pb-4">
          <button
            onClick={() => setShowPhotoMenu(!showPhotoMenu)}
            disabled={uploading}
            className="relative w-24 h-24 rounded-full group cursor-pointer overflow-hidden border-2 border-white/10 hover:border-[#C5A059]/40 transition-all bg-white/[0.03] flex items-center justify-center"
            aria-label="Alterar foto de perfil"
          >
            {barberPhoto ? (
              <img
                src={barberPhoto}
                alt="Foto do barbeiro"
                className="w-full h-full object-cover"
              />
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

        {/* Name */}
        <div className="hidden lg:block">
          <div className="border border-white/[0.04] rounded-2xl overflow-hidden">
            {editingName ? (
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    Nome
                  </span>
                  <span className="text-[10px] text-zinc-600">{nameInput.length}/8</span>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Seu nome"
                    maxLength={8}
                    autoFocus
                    className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={!nameInput.trim() || nameInput.trim() === barberName}
                    className="px-5 py-3 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    OK
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNameInput(barberName);
                  setEditingName(true);
                }}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
              >
                <div className="text-left">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
                    Nome
                  </span>
                  <span className="text-[13px] text-white">{barberName}</span>
                </div>
                <ChevronRight size={16} className="text-zinc-600 shrink-0" />
              </button>
            )}
          </div>
        </div>
        <div className="lg:hidden border border-white/[0.04] rounded-2xl overflow-hidden">
          <button
            onClick={() => {
              setNameInput(barberName);
              setEditingName(true);
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="text-left">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
                Nome
              </span>
              <span className="text-[13px] text-white">{barberName}</span>
            </div>
            <ChevronRight size={16} className="text-zinc-600 shrink-0" />
          </button>
        </div>

        {/* Phone */}
        <div className="hidden lg:block">
          <div className="border border-white/[0.04] rounded-2xl overflow-hidden">
            {editingPhone ? (
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    WhatsApp
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {phoneInput.replace(/\D/g, '').length}/11
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="31999999999"
                    maxLength={11}
                    autoFocus
                    className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePhone();
                      if (e.key === 'Escape') setEditingPhone(false);
                    }}
                  />
                  <button
                    onClick={handleSavePhone}
                    disabled={
                      phoneInput.replace(/\D/g, '') === barberPhone ||
                      phoneInput.replace(/\D/g, '').length < 10
                    }
                    className="px-5 py-3 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    OK
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setPhoneInput(barberPhone);
                  setEditingPhone(true);
                }}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
              >
                <div className="text-left">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
                    WhatsApp
                  </span>
                  <span className="text-[13px] text-white">
                    {barberPhone ? formatPhone(barberPhone) : 'Não configurado'}
                  </span>
                </div>
                <ChevronRight size={16} className="text-zinc-600 shrink-0" />
              </button>
            )}
          </div>
        </div>
        <div className="lg:hidden border border-white/[0.04] rounded-2xl overflow-hidden">
          <button
            onClick={() => {
              setPhoneInput(barberPhone);
              setEditingPhone(true);
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="text-left">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
                WhatsApp
              </span>
              <span className="text-[13px] text-white">
                {barberPhone ? formatPhone(barberPhone) : 'Não configurado'}
              </span>
            </div>
            <ChevronRight size={16} className="text-zinc-600 shrink-0" />
          </button>
        </div>

        {/* Bio */}
        <div className="hidden lg:block">
          <div className="border border-white/[0.04] rounded-2xl overflow-hidden">
            {editingBio ? (
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    Bio
                  </span>
                  <span className="text-[10px] text-zinc-600">{bioInput.length}/200</span>
                </div>
                <textarea
                  ref={bioInputRef}
                  value={bioInput}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) setBioInput(e.target.value);
                  }}
                  placeholder="Fale um pouco sobre você..."
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) handleSaveBio();
                    if (e.key === 'Escape') setEditingBio(false);
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingBio(false)}
                    className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-[11px] font-medium rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveBio}
                    disabled={bioInput.trim() === barberBio}
                    className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    OK
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setBioInput(barberBio);
                  setEditingBio(true);
                }}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
              >
                <div className="text-left max-w-[85%]">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
                    Bio
                  </span>
                  <span className="text-[13px] text-zinc-400 line-clamp-1">
                    {barberBio || 'Adicione uma bio para o site...'}
                  </span>
                </div>
                <ChevronRight size={16} className="text-zinc-600 shrink-0" />
              </button>
            )}
          </div>
        </div>
        <div className="lg:hidden border border-white/[0.04] rounded-2xl overflow-hidden">
          <button
            onClick={() => {
              setBioInput(barberBio);
              setEditingBio(true);
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="text-left max-w-[85%]">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
                Bio
              </span>
              <span className="text-[13px] text-white line-clamp-1">
                {barberBio || 'Adicione uma bio para o site...'}
              </span>
            </div>
            <ChevronRight size={16} className="text-zinc-600 shrink-0" />
          </button>
        </div>

        {/* Quote */}
        <div className="hidden lg:block">
          <div className="border border-white/[0.04] rounded-2xl overflow-hidden">
            {editingQuote ? (
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    Frase
                  </span>
                  <span className="text-[10px] text-zinc-600">{quoteInput.length}/80</span>
                </div>
                <input
                  ref={quoteInputRef}
                  type="text"
                  value={quoteInput}
                  onChange={(e) => {
                    if (e.target.value.length <= 80) setQuoteInput(e.target.value);
                  }}
                  placeholder="Sua frase de efeito..."
                  maxLength={80}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveQuote();
                    if (e.key === 'Escape') setEditingQuote(false);
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingQuote(false)}
                    className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-[11px] font-medium rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveQuote}
                    disabled={quoteInput.trim() === barberQuote}
                    className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    OK
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setQuoteInput(barberQuote);
                  setEditingQuote(true);
                }}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
              >
                <div className="text-left max-w-[85%]">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
                    Frase
                  </span>
                  <span className="text-[13px] text-zinc-400 line-clamp-1 italic">
                    {barberQuote || '"Não sou o melhor, mas sou o melhor para você."'}
                  </span>
                </div>
                <ChevronRight size={16} className="text-zinc-600 shrink-0" />
              </button>
            )}
          </div>
        </div>
        <div className="lg:hidden border border-white/[0.04] rounded-2xl overflow-hidden">
          <button
            onClick={() => {
              setQuoteInput(barberQuote);
              setEditingQuote(true);
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="text-left max-w-[85%]">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
                Frase
              </span>
              <span className="text-[13px] text-white line-clamp-1 italic">
                {barberQuote || '"Não sou o melhor, mas sou o melhor para você."'}
              </span>
            </div>
            <ChevronRight size={16} className="text-zinc-600 shrink-0" />
          </button>
        </div>

        {/* Instagram */}
        <div className="hidden lg:block">
          <div className="border border-white/[0.04] rounded-2xl overflow-hidden">
            {editingInstagram ? (
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    Instagram
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {instagramInput.replace(/^@/, '').length}/30
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={instagramInputRef}
                    type="text"
                    value={instagramInput}
                    onChange={(e) => {
                      if (e.target.value.replace(/^@/, '').length <= 30) {
                        setInstagramInput(e.target.value);
                      }
                    }}
                    placeholder="@seuusuario"
                    maxLength={31}
                    autoFocus
                    className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveInstagram();
                      if (e.key === 'Escape') setEditingInstagram(false);
                    }}
                  />
                  <button
                    onClick={handleSaveInstagram}
                    disabled={instagramInput.replace(/^@/, '').trim() === barberInstagram}
                    className="px-5 py-3 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    OK
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setInstagramInput(barberInstagram);
                  setEditingInstagram(true);
                }}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
              >
                <div className="text-left">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
                    Instagram
                  </span>
                  <span className="text-[13px] text-zinc-400">
                    {barberInstagram ? `@${barberInstagram}` : '@seuusuario'}
                  </span>
                </div>
                <ChevronRight size={16} className="text-zinc-600 shrink-0" />
              </button>
            )}
          </div>
        </div>
        <div className="lg:hidden border border-white/[0.04] rounded-2xl overflow-hidden">
          <button
            onClick={() => {
              setInstagramInput(barberInstagram);
              setEditingInstagram(true);
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="text-left">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">
                Instagram
              </span>
              <span className="text-[13px] text-[#C5A059]/80">
                {barberInstagram ? `@${barberInstagram}` : '@seuusuario'}
              </span>
            </div>
            <ChevronRight size={16} className="text-zinc-600 shrink-0" />
          </button>
        </div>
      </div>

      {/* Mobile Full-Screen Editors */}
      <MobileEditScreen
        isOpen={editingName}
        onClose={() => setEditingName(false)}
        onSave={handleSaveName}
        title="Nome"
        canSave={!!nameInput.trim() && nameInput.trim() !== barberName}
      >
        <input
          ref={nameInputRef}
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Seu nome"
          maxLength={8}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveName();
          }}
        />
        <p className="text-[11px] text-zinc-600 text-right">{nameInput.length}/8</p>
      </MobileEditScreen>

      <MobileEditScreen
        isOpen={editingPhone}
        onClose={() => setEditingPhone(false)}
        onSave={handleSavePhone}
        title="WhatsApp"
        canSave={
          phoneInput.replace(/\D/g, '') !== barberPhone &&
          phoneInput.replace(/\D/g, '').length >= 10
        }
      >
        <input
          ref={phoneInputRef}
          type="tel"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          placeholder="31999999999"
          maxLength={15}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSavePhone();
          }}
        />
      </MobileEditScreen>

      <MobileEditScreen
        isOpen={editingBio}
        onClose={() => setEditingBio(false)}
        onSave={handleSaveBio}
        title="Bio"
        canSave={bioInput.trim() !== barberBio}
      >
        <textarea
          ref={bioInputRef}
          value={bioInput}
          onChange={(e) => {
            if (e.target.value.length <= 200) setBioInput(e.target.value);
          }}
          placeholder="Fale um pouco sobre você..."
          rows={4}
          maxLength={200}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600 resize-none"
        />
        <p className="text-[11px] text-zinc-600 text-right">{bioInput.length}/200</p>
      </MobileEditScreen>

      <MobileEditScreen
        isOpen={editingQuote}
        onClose={() => setEditingQuote(false)}
        onSave={handleSaveQuote}
        title="Frase"
        canSave={quoteInput.trim() !== barberQuote}
      >
        <input
          ref={quoteInputRef}
          type="text"
          value={quoteInput}
          onChange={(e) => {
            if (e.target.value.length <= 80) setQuoteInput(e.target.value);
          }}
          placeholder="Sua frase de efeito..."
          maxLength={80}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
        />
        <p className="text-[11px] text-zinc-600 text-right">{quoteInput.length}/80</p>
      </MobileEditScreen>

      <MobileEditScreen
        isOpen={editingInstagram}
        onClose={() => setEditingInstagram(false)}
        onSave={handleSaveInstagram}
        title="Instagram"
        canSave={instagramInput.replace(/^@/, '').trim() !== barberInstagram}
      >
        <input
          ref={instagramInputRef}
          type="text"
          value={instagramInput}
          onChange={(e) => {
            if (e.target.value.replace(/^@/, '').length <= 30) setInstagramInput(e.target.value);
          }}
          placeholder="@seuusuario"
          maxLength={31}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
        />
        <p className="text-[11px] text-zinc-600 text-right">
          {instagramInput.replace(/^@/, '').length}/30
        </p>
      </MobileEditScreen>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsConta;
