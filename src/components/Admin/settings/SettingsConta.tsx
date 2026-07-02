import React, { useState, useEffect, useRef } from 'react';
import { useBarberSettings } from '../../../hooks/useBarberSettings';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';
import { supabase } from '../../../lib/supabase';
import { Camera, User } from 'lucide-react';

interface SettingsContaProps {
  onBack?: () => void;
}

const SettingsConta: React.FC<SettingsContaProps> = () => {
  const { barberName, barberPhone, barberPhoto, barberBio, updateBarberName, updateBarberPhone, updateBarberPhoto, updateBarberBio } = useBarberSettings();
  const { toast, showSuccess, showError } = useToast();
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameInput(barberName);
    setPhoneInput(barberPhone);
    setBioInput(barberBio);
  }, [barberName, barberPhone, barberBio]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Envie apenas imagens');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showError('Imagem muito grande (max 2MB)');
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `barber-photo.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        const ok = await updateBarberPhoto(urlData.publicUrl);
        if (ok) showSuccess('Foto alterada!');
        else showError('Erro ao salvar foto');
      }
    } catch {
      showError('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 flex flex-col items-center">
      <div className="hidden lg:block mb-6 text-center w-full max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-white">Conta</h2>
      </div>
      <div className="w-full max-w-2xl space-y-4">
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

        {/* Name */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden">
          {editingName ? (
            <div className="p-5 space-y-3">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">Nome do barbeiro</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Seu nome"
                  maxLength={30}
                  autoFocus
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nameInput.trim()) {
                      updateBarberName(nameInput).then(ok => {
                        if (ok) { showSuccess('Nome alterado!'); setEditingName(false); }
                        else showError('Erro ao alterar nome');
                      });
                    }
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                />
                <button
                  onClick={async () => {
                    if (nameInput.trim()) {
                      const ok = await updateBarberName(nameInput);
                      if (ok) { showSuccess('Nome alterado!'); setEditingName(false); }
                      else showError('Erro ao alterar nome');
                    }
                  }}
                  disabled={!nameInput.trim() || nameInput.trim() === barberName}
                  className="px-5 py-3 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  OK
                </button>
              </div>
              <button
                onClick={() => setEditingName(false)}
                className="lg:hidden text-[11px] text-zinc-600 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
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

        {/* Phone */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden">
          {editingPhone ? (
            <div className="p-5 space-y-3">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">WhatsApp do barbeiro</span>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="31999999999"
                  maxLength={15}
                  autoFocus
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && phoneInput.replace(/\D/g, '').length >= 10) {
                      updateBarberPhone(phoneInput).then(ok => {
                        if (ok) { showSuccess('Telefone alterado!'); setEditingPhone(false); }
                        else showError('Erro ao alterar telefone');
                      });
                    }
                    if (e.key === 'Escape') setEditingPhone(false);
                  }}
                />
                <button
                  onClick={async () => {
                    const digits = phoneInput.replace(/\D/g, '');
                    if (digits.length >= 10) {
                      const ok = await updateBarberPhone(digits);
                      if (ok) { showSuccess('Telefone alterado!'); setEditingPhone(false); }
                      else showError('Erro ao alterar telefone');
                    }
                  }}
                  disabled={phoneInput.replace(/\D/g, '') === barberPhone || phoneInput.replace(/\D/g, '').length < 10}
                  className="px-5 py-3 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  OK
                </button>
              </div>
              <button
                onClick={() => setEditingPhone(false)}
                className="lg:hidden text-[11px] text-zinc-600 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
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

        {/* Bio */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden">
          {editingBio ? (
            <div className="p-5 space-y-3">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">Frase de efeito</span>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Uma frase sobre voce..."
                maxLength={100}
                rows={2}
                autoFocus
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-[#C5A059]/40 transition-all placeholder:text-zinc-600 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    updateBarberBio(bioInput).then(ok => {
                      if (ok) { showSuccess('Frase alterada!'); setEditingBio(false); }
                      else showError('Erro ao alterar frase');
                    });
                  }
                  if (e.key === 'Escape') setEditingBio(false);
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingBio(false)}
                  className="flex-1 py-3 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const ok = await updateBarberBio(bioInput);
                    if (ok) { showSuccess('Frase alterada!'); setEditingBio(false); }
                    else showError('Erro ao alterar frase');
                  }}
                  className="flex-1 py-3 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setBioInput(barberBio); setEditingBio(true); }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
            >
              <div className="text-left">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-1">Frase</span>
                <span className="text-[13px] text-white truncate max-w-[200px] block">{barberBio || 'Adicione uma frase...'}</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          )}
        </div>
      </div>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsConta;
