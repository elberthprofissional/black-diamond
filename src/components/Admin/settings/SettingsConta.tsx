import React, { useState, useEffect, useRef } from 'react';
import { useBarberSettings } from '../../../contexts/BarberSettingsContext';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { supabase } from '../../../lib/supabase';
import { Camera, User, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsContaProps {
  onBack?: () => void;
}

const SettingsConta: React.FC<SettingsContaProps> = () => {
  const { barberName, barberPhone, barberPhoto, updateBarberName, updateBarberPhone, updateBarberPhoto } = useBarberSettings();
  const { toast, showSuccess, showError } = useToast();
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameInput(barberName);
    setPhoneInput(barberPhone);
  }, [barberName, barberPhone]);

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
      const oldFiles = ['profiles/barber-photo.webp', 'profiles/barber-photo.jpg', 'profiles/barber-photo.png'];
      for (const oldFile of oldFiles) {
        await supabase.storage.from('avatars').remove([oldFile]);
      }

      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `profiles/barber-photo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        showError(`Erro: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

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
    if (nameInput.trim()) {
      const ok = await updateBarberName(nameInput);
      if (ok) { showSuccess('Nome alterado!'); setEditingName(false); }
      else showError('Erro ao alterar nome');
    }
  };

  const handleSavePhone = async () => {
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length >= 10) {
      const ok = await updateBarberPhone(digits);
      if (ok) { showSuccess('Telefone alterado!'); setEditingPhone(false); }
      else showError('Erro ao alterar telefone');
    }
  };

  return (
    <div className="space-y-6">
      <div className="w-full space-y-4">
        {/* Photo */}
        <div className="flex justify-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative group cursor-pointer"
            aria-label="Alterar foto de perfil"
          >
            <div className="w-24 h-24 rounded-full border-2 border-white/10 overflow-hidden bg-white/[0.03] flex items-center justify-center group-hover:border-[#C5A059]/40 transition-all">
              {barberPhoto ? (
                <img src={barberPhoto} alt="Foto do barbeiro" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-zinc-600" />
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera size={20} className="text-white" />
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
        </div>

        {/* Name - Desktop Inline Edit */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden hidden lg:block">
          {editingName ? (
            <div className="p-5 space-y-3">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">Nome</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Seu nome"
                  maxLength={10}
                  autoFocus
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                />
                {nameInput.length >= 10 && (
                  <p className="text-[10px] text-amber-500/80">Nome muito longo. Use no máximo 10 caracteres.</p>
                )}
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
              onClick={() => { setNameInput(barberName); setEditingName(true); }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
            >
              <div className="text-left">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">Nome</span>
                <span className="text-[13px] text-white">{barberName}</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          )}
        </div>

        {/* Name - Mobile Simple Button */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden lg:hidden">
          <button
            onClick={() => { setNameInput(barberName); setEditingName(true); }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="text-left">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">Nome</span>
              <span className="text-[13px] text-white">{barberName}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

        {/* Phone - Desktop Inline Edit */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden hidden lg:block">
          {editingPhone ? (
            <div className="p-5 space-y-3">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">WhatsApp</span>
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
                  disabled={phoneInput.replace(/\D/g, '') === barberPhone || phoneInput.replace(/\D/g, '').length < 10}
                  className="px-5 py-3 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  OK
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setPhoneInput(barberPhone); setEditingPhone(true); }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
            >
              <div className="text-left">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">WhatsApp</span>
                <span className="text-[13px] text-white">{barberPhone || 'Não configurado'}</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          )}
        </div>

        {/* Phone - Mobile Simple Button */}
        <div className="border border-white/[0.04] rounded-2xl overflow-hidden lg:hidden">
          <button
            onClick={() => { setPhoneInput(barberPhone); setEditingPhone(true); }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="text-left">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">WhatsApp</span>
              <span className="text-[13px] text-white">{barberPhone || 'Não configurado'}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="m9 18 6-6-6-6"/></svg>
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
            <div className="p-4">
              <input
                ref={nameInputRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Seu nome"
                maxLength={10}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                }}
              />
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
                disabled={phoneInput.replace(/\D/g, '') === barberPhone || phoneInput.replace(/\D/g, '').length < 10}
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

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsConta;
