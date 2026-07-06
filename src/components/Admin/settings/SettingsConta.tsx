import React, { useState, useEffect, useRef } from 'react';
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

const SettingsConta: React.FC<SettingsContaProps> = ({ onBack: _onBack }) => {
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
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setShowCropModal(true);
      setShowPhotoMenu(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCroppedPhoto = async (blob: Blob) => {
    setShowCropModal(false);
    setUploading(true);
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
      setCropImageSrc(null);
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
                    {phoneInput.replace(/\D/g, '').length}/10
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="31999999999"
                    maxLength={10}
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
              <span className="text-[13px] text-white">{barberPhone || 'Não configurado'}</span>
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

      <ImageCropperModal
        isOpen={showCropModal}
        src={cropImageSrc || ''}
        onCancel={() => {
          setShowCropModal(false);
          setCropImageSrc(null);
        }}
        onSave={handleSaveCroppedPhoto}
      />

      <ToastNotification toast={toast} />
    </div>
  );
};

interface ImageCropperModalProps {
  isOpen: boolean;
  src: string;
  onCancel: () => void;
  onSave: (croppedBlob: Blob) => void;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ isOpen, src, onCancel, onSave }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const containerSize = 220;

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setNaturalSize(null);
    }
  }, [isOpen]);

  const getDimensions = () => {
    if (!naturalSize) return { w: containerSize, h: containerSize, R: 1 };
    const R = naturalSize.width / naturalSize.height;
    let w, h;
    if (R > 1) {
      h = containerSize * zoom;
      w = h * R;
    } else {
      w = containerSize * zoom;
      h = w / R;
    }
    return { w, h, R };
  };

  const { w, h } = getDimensions();
  const limitX = Math.max(0, (w - containerSize) / 2);
  const limitY = Math.max(0, (h - containerSize) / 2);

  const clampedX = Math.min(Math.max(offset.x, -limitX), limitX);
  const clampedY = Math.min(Math.max(offset.y, -limitY), limitY);

  // Keep a mutable ref of state values so touch event listeners always have the latest values without re-binding!
  const stateRef = useRef({ offset, isDragging, dragStart, limitX, limitY });
  useEffect(() => {
    stateRef.current = { offset, isDragging, dragStart, limitX, limitY };
  });

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    const newX = Math.min(Math.max(dx, -limitX), limitX);
    const newY = Math.min(Math.max(dy, -limitY), limitY);
    setOffset({ x: newX, y: newY });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Bind touch events manually with passive: false to prevent mobile screen scrolling!
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const currentOffset = stateRef.current.offset;
      stateRef.current.isDragging = true;
      setIsDragging(true);
      const startX = touch.clientX - currentOffset.x;
      const startY = touch.clientY - currentOffset.y;
      stateRef.current.dragStart = { x: startX, y: startY };
      setDragStart({ x: startX, y: startY });
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault(); // This blocks the screen from dragging/scrolling!
      }
      if (!stateRef.current.isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - stateRef.current.dragStart.x;
      const dy = touch.clientY - stateRef.current.dragStart.y;
      const newX = Math.min(Math.max(dx, -stateRef.current.limitX), stateRef.current.limitX);
      const newY = Math.min(Math.max(dy, -stateRef.current.limitY), stateRef.current.limitY);
      setOffset({ x: newX, y: newY });
    };

    const onTouchEnd = () => {
      stateRef.current.isDragging = false;
      setIsDragging(false);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const handleCrop = () => {
    if (!imgRef.current || !naturalSize) return;
    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    const destSize = 1024; // 1024px para qualidade Retina-ready
    canvas.width = destSize;
    canvas.height = destSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurações de interpolação de alta qualidade para o redimensionamento do canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const naturalWidth = naturalSize.width;
    const scaleRatio = naturalWidth / w;
    const srcX_screen = (w - containerSize) / 2 - clampedX;
    const srcY_screen = (h - containerSize) / 2 - clampedY;

    const srcX = srcX_screen * scaleRatio;
    const srcY = srcY_screen * scaleRatio;
    const srcWidth = containerSize * scaleRatio;
    const srcHeight = containerSize * scaleRatio;

    ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, destSize, destSize);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob);
        }
      },
      'image/webp',
      0.95
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div onClick={onCancel} className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div className="relative z-10 w-full max-w-[340px] bg-[#1A1A1A] border border-white/10 rounded-3xl overflow-hidden p-6 shadow-2xl flex flex-col items-center">
        <h3 className="text-[13px] font-bold text-white mb-6 uppercase tracking-wider">
          Ajustar Foto
        </h3>

        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-full border-2 border-[#C5A059] shadow-inner select-none cursor-grab active:cursor-grabbing bg-zinc-900"
          style={{ width: containerSize, height: containerSize }}
          onMouseDown={(e) => {
            e.preventDefault();
            handleStart(e.clientX, e.clientY);
          }}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
        >
          <img
            ref={imgRef}
            src={src}
            alt="Recortar"
            onLoad={(e) => {
              const image = e.currentTarget;
              setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
            }}
            className="pointer-events-none select-none max-w-none max-h-none"
            style={{
              width: w,
              height: h,
              transform: `translate(${clampedX}px, ${clampedY}px)`,
              position: 'absolute',
              top: '50%',
              left: '50%',
              marginTop: -h / 2,
              marginLeft: -w / 2,
            }}
          />
        </div>

        <p className="text-[10px] text-zinc-500 mt-4">Arraste a foto para posicionar</p>

        <div className="w-full mt-6 space-y-2 px-2">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.02"
            value={zoom}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setZoom(val);
              setOffset((prev) => {
                let tempW, tempH;
                if (!naturalSize) return prev;
                const R = naturalSize.width / naturalSize.height;
                if (R > 1) {
                  tempH = containerSize * val;
                  tempW = tempH * R;
                } else {
                  tempW = containerSize * val;
                  tempH = tempW / R;
                }
                const newLimX = Math.max(0, (tempW - containerSize) / 2);
                const newLimY = Math.max(0, (tempH - containerSize) / 2);
                return {
                  x: Math.min(Math.max(prev.x, -newLimX), newLimX),
                  y: Math.min(Math.max(prev.y, -newLimY), newLimY),
                };
              });
            }}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#C5A059]"
            aria-label="Ajustar zoom"
          />
        </div>

        <div className="w-full flex gap-3 mt-8">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-[12px] font-bold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrop}
            className="flex-1 py-3 text-[12px] font-bold text-[#1A1A1A] bg-[#C5A059] hover:bg-[#A68233] rounded-xl transition-all cursor-pointer shadow-lg shadow-[#C5A059]/10"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsConta;
