import React, { useState, useEffect } from 'react';
import { useBarberSettings } from '../../../hooks/useBarberSettings';
import { useToast } from '../../../hooks/useToast';
import ToastNotification from '../shared/ToastNotification';

interface SettingsContaProps {
  onBack?: () => void;
}

const SettingsConta: React.FC<SettingsContaProps> = () => {
  const { barberName, barberPhone, updateBarberName, updateBarberPhone } = useBarberSettings();
  const { toast, showSuccess, showError } = useToast();
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);

  useEffect(() => {
    setNameInput(barberName);
    setPhoneInput(barberPhone);
  }, [barberName, barberPhone]);

  return (
    <div className="space-y-6 flex flex-col items-center">
      <div className="hidden lg:block mb-6 text-center w-full max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-white">Conta</h2>
      </div>
      <div className="w-full max-w-2xl space-y-4">
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
      </div>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default SettingsConta;
