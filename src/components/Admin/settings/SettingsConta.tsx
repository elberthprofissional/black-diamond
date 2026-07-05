import React, { useState, useEffect, useRef } from 'react';
import { useBarberSettings } from '../../../contexts/BarberSettingsContext';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { supabase } from '../../../lib/supabase';
import { formatPhone } from '../../../lib/utils';
import { Camera, User, X, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsContaProps {
  onBack?: () => void;
}

const SettingsConta: React.FC<SettingsContaProps> = () => {
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

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [editingName]);

  useEffect(() => {
    if (editingPhone && phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, [editingPhone]);

  useEffect(() => {
    if (editingBio && bioInputRef.current) {
      bioInputRef.current.focus();
    }
  }, [editingBio]);

  useEffect(() => {
    if (editingQuote && quoteInputRef.current) {
      quoteInputRef.current.focus();
    }
  }, [editingQuote]);

  useEffect(() => {
    if (editingInstagram && instagramInputRef.current) {
      instagramInputRef.current.focus();
    }
  }, [editingInstagram]);

  const convertToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800;
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

  const handleRemovePhoto = async () => {
    setShowPhotoMenu(false);
    if (!barberPhoto) return;

    // Deleta o arquivo do storage
    const oldFiles = [
      'profiles/barber-photo.webp',
      'profiles/barber-photo.jpg',
      'profiles/barber-photo.png',
    ];
    await supabase.storage.from('avatars').remove(oldFiles);

    // Limpa a setting
    const ok = await updateBarberPhoto('');
    if (ok) showSuccess('Foto removida!');
    else showError('Erro ao remover foto');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);
    try {
      const oldFiles = [
        'profiles/barber-photo.webp',
        'profiles/barber-photo.jpg',
        'profiles/barber-photo.png',
      ];
      for (const oldFile of oldFiles) {
        await supabase.storage.from('avatars').remove([oldFile]);
      }

      const webpBlob = await convertToWebP(file);
      const filePath = `profiles/barber-photo-${Date.now()}.webp`;

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
        const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        const ok = await updateBarberPhoto(photoUrl);
        if (ok) showSuccess('Foto alterada!');
        else showError('Erro ao salvar foto');
      }
    } catch (err) {
      console.error('Upload catch:', err);
      showError('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        showError('DDD inválido. Use um DDD válido do Brasil.');
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
            className="relative group cursor-pointer"
            aria-label="Alterar foto de perfil"
          >
            <div className="w-24 h-24 rounded-full border-2 border-white/10 overflow-hidden bg-white/[0.03] flex items-center justify-center group-hover:border-[#C5A059]/40 transition-all">
              {barberPhoto ? (
                <img
                  src={barberPhoto}
                  alt="Foto do barbeiro"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={32} className="text-zinc-600" />
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition-all group-hover:bg-black/50">
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

          {/* Photo Menu - Desktop Popover */}
          <AnimatePresence>
            {showPhotoMenu && (
              <>
                {/* Backdrop (desktop só click-outside + esc, sem blur) */}
                <div
                  className="hidden lg:block lg:fixed lg:inset-0 lg:z-50"
                  onClick={() => setShowPhotoMenu(false)}
                  onKeyDown={(e) => e.key === 'Escape' && setShowPhotoMenu(false)}
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
                        setShowPhotoMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
                    >
                      <Camera size={15} className="text-zinc-500 shrink-0" />
                      <span>Alterar foto</span>
                    </button>

                    {barberPhoto && (
                      <>
                        <div className="mx-3 h-px bg-white/[0.08]" />
                        <button
                          onClick={handleRemovePhoto}
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
                  onClick={() => setShowPhotoMenu(false)}
                  onKeyDown={(e) => e.key === 'Escape' && setShowPhotoMenu(false)}
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
                    {/* Drag indicator */}
                    <div className="flex justify-center pt-3 pb-1">
                      <div className="w-9 h-1 rounded-full bg-white/[0.12]" />
                    </div>

                    <div className="px-6 pb-8 pt-4 space-y-1">
                      <button
                        onClick={() => {
                          setShowPhotoMenu(false);
                          fileInputRef.current?.click();
                        }}
                        className="w-full flex items-center gap-4 px-4 py-4 text-[15px] font-medium text-white hover:bg-white/[0.06] rounded-xl transition-colors duration-150 cursor-pointer"
                      >
                        <Camera size={18} className="text-zinc-500 shrink-0" />
                        <span>Alterar foto de perfil</span>
                      </button>

                      <div className="h-px bg-white/[0.08] mx-2" />

                      {barberPhoto && (
                        <>
                          <button
                            onClick={handleRemovePhoto}
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
            )}
          </AnimatePresence>
        </div>

        {/* Name - Desktop Inline Edit */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden hidden lg:block">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-600"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Name - Mobile Simple Button */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden lg:hidden">
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-600"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Phone - Desktop Inline Edit */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden hidden lg:block">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-600"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Phone - Mobile Simple Button */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden lg:hidden">
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-600"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Bio - Desktop Inline Edit */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden hidden lg:block">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-600 shrink-0"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Bio - Mobile Simple Button */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden lg:hidden">
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-600 shrink-0"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Quote - Desktop Inline Edit */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden hidden lg:block">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-600 shrink-0"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Quote - Mobile Simple Button */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden lg:hidden">
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-600 shrink-0"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Instagram - Desktop Inline Edit */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden hidden lg:block">
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
                    if (e.target.value.replace(/^@/, '').length <= 30)
                      setInstagramInput(e.target.value);
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-600"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Instagram - Mobile Simple Button */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden lg:hidden">
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-600 shrink-0"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Name Editor - Instagram Style */}
      <AnimatePresence>
        {editingName && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[300] bg-[#0A0A0A] lg:hidden"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
              <button
                onClick={() => setEditingName(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cancelar"
              >
                <X size={24} />
              </button>
              <span className="text-[15px] font-bold text-white">Nome</span>
              <button
                onClick={handleSaveName}
                disabled={!nameInput.trim() || nameInput.trim() === barberName}
                className="text-[#C5A059] font-bold text-[15px] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Salvar"
              >
                <Check size={24} />
              </button>
            </div>
            <div className="p-4 space-y-2">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Phone Editor - Instagram Style */}
      <AnimatePresence>
        {editingPhone && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[300] bg-[#0A0A0A] lg:hidden"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
              <button
                onClick={() => setEditingPhone(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cancelar"
              >
                <X size={24} />
              </button>
              <span className="text-[15px] font-bold text-white">WhatsApp</span>
              <button
                onClick={handleSavePhone}
                disabled={
                  phoneInput.replace(/\D/g, '') === barberPhone ||
                  phoneInput.replace(/\D/g, '').length < 10
                }
                className="text-[#C5A059] font-bold text-[15px] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Salvar"
              >
                <Check size={24} />
              </button>
            </div>
            <div className="p-4">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bio Editor - Instagram Style */}
      <AnimatePresence>
        {editingBio && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[300] bg-[#0A0A0A] lg:hidden"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
              <button
                onClick={() => setEditingBio(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cancelar"
              >
                <X size={24} />
              </button>
              <span className="text-[15px] font-bold text-white">Bio</span>
              <button
                onClick={handleSaveBio}
                disabled={bioInput.trim() === barberBio}
                className="text-[#C5A059] font-bold text-[15px] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Salvar"
              >
                <Check size={24} />
              </button>
            </div>
            <div className="p-4 space-y-2">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Quote Editor - Instagram Style */}
      <AnimatePresence>
        {editingQuote && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[300] bg-[#0A0A0A] lg:hidden"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
              <button
                onClick={() => setEditingQuote(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cancelar"
              >
                <X size={24} />
              </button>
              <span className="text-[15px] font-bold text-white">Frase</span>
              <button
                onClick={handleSaveQuote}
                disabled={quoteInput.trim() === barberQuote}
                className="text-[#C5A059] font-bold text-[15px] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Salvar"
              >
                <Check size={24} />
              </button>
            </div>
            <div className="p-4 space-y-2">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Instagram Editor - Instagram Style */}
      <AnimatePresence>
        {editingInstagram && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[300] bg-[#0A0A0A] lg:hidden"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
              <button
                onClick={() => setEditingInstagram(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cancelar"
              >
                <X size={24} />
              </button>
              <span className="text-[15px] font-bold text-white">Instagram</span>
              <button
                onClick={handleSaveInstagram}
                disabled={instagramInput.replace(/^@/, '').trim() === barberInstagram}
                className="text-[#C5A059] font-bold text-[15px] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Salvar"
              >
                <Check size={24} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <input
                ref={instagramInputRef}
                type="text"
                value={instagramInput}
                onChange={(e) => {
                  if (e.target.value.replace(/^@/, '').length <= 30)
                    setInstagramInput(e.target.value);
                }}
                placeholder="@seuusuario"
                maxLength={31}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
              />
              <p className="text-[11px] text-zinc-600 text-right">
                {instagramInput.replace(/^@/, '').length}/30
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsConta;
