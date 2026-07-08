import React, { useState } from 'react';
import { Check, ArrowLeft, Bell, BellOff, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDateBR } from '../../lib/utils';
import type { Service } from '../../types';

interface SuccessStepProps {
  selectedDate: string;
  selectedTime: string;
  totalPrice: number;
  selectedServices: Service[];
  clientName: string;
  layout: 'desktop' | 'mobile';
  token?: string;
  manageUrl?: string;
}

const SuccessStep: React.FC<SuccessStepProps> = ({
  selectedDate,
  selectedTime,
  totalPrice,
  layout,
  manageUrl = '',
}) => {
  const navigate = useNavigate();
  const formattedDate = formatDateBR(selectedDate);
  const [copied, setCopied] = useState(false);
  const [notifStatus, setNotifStatus] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>(
    () => {
      if (!('Notification' in window)) return 'unsupported';
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      return 'idle';
    }
  );
  const [activating, setActivating] = useState(false);

  const handleCopyLink = async () => {
    if (!manageUrl) return;
    try {
      await navigator.clipboard.writeText(manageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = manageUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    if (!manageUrl) return;
    const msg = `Meu horário na Black Diamond:\n📅 ${formattedDate} às ${selectedTime}\n\nGerenciar agendamento:\n${manageUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const handleActivateNotification = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('unsupported');
      return;
    }

    setActivating(true);
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        setNotifStatus('granted');

        // Update localStorage to mark notification as enabled
        try {
          const raw = localStorage.getItem('client_booking');
          if (raw) {
            const data = JSON.parse(raw);
            data.notificationEnabled = true;
            localStorage.setItem('client_booking', JSON.stringify(data));
          }
        } catch {
          // ignore
        }
      } else {
        setNotifStatus('denied');
      }
    } catch {
      setNotifStatus('denied');
    } finally {
      setActivating(false);
    }
  };

  if (layout === 'desktop') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-[#C5A059]/10 flex items-center justify-center mx-auto mb-8">
          <Check size={36} className="text-[#C5A059]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Agendamento confirmado!</h2>
        <p className="text-base text-zinc-500 mb-8">Seu horário foi reservado com sucesso.</p>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-3 w-full max-w-sm mb-6 text-left">
          <div className="flex justify-between">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Data</span>
            <span className="text-sm font-bold text-white">{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Horário</span>
            <span className="text-sm font-bold text-[#C5A059]">{selectedTime}</span>
          </div>
          <div className="flex justify-between border-t border-white/[0.06] pt-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</span>
            <span className="text-sm font-bold text-white">
              R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Management Link */}
        {manageUrl && (
          <div className="w-full max-w-sm mb-6 space-y-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">
              Salve este link para gerenciar
            </p>
            <div className="bg-[#111] border border-white/[0.06] rounded-xl p-3 flex items-center gap-2">
              <p className="text-[11px] text-zinc-400 truncate flex-1 font-mono">{manageUrl}</p>
              <button
                onClick={handleCopyLink}
                className="shrink-0 w-8 h-8 rounded-lg bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] hover:bg-[#C5A059]/20 transition-all cursor-pointer"
                aria-label="Copiar link"
              >
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={handleShareWhatsApp}
              className="w-full h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ExternalLink size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Enviar no WhatsApp
              </span>
            </button>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          aria-label="Voltar para a página inicial"
          className="h-12 px-10 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all cursor-pointer"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#050505] z-[200] flex flex-col p-6 text-center">
      <div className="flex justify-start">
        <button
          onClick={() => navigate('/')}
          aria-label="Voltar para a página inicial"
          className="text-zinc-500 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full space-y-8">
        <div className="w-20 h-20 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center mx-auto">
          <Check size={32} className="text-[#C5A059]" />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-white">Corte confirmado!</h2>
          <p className="text-sm text-zinc-500">Seu horário foi reservado com sucesso.</p>
        </div>

        <div className="bg-[#111111] border border-white/[0.04] rounded-2xl p-6 space-y-4 text-left w-full">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Data</span>
            <span className="text-sm font-bold text-white">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Horário</span>
            <span className="text-sm font-bold text-[#C5A059]">{selectedTime}</span>
          </div>
          <div className="flex justify-between items-center border-t border-white/[0.04] pt-4">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</span>
            <span className="text-base font-bold text-white">
              R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Management Link - Mobile */}
        {manageUrl && (
          <div className="w-full space-y-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">
              Salve este link para gerenciar
            </p>
            <div className="bg-[#111] border border-white/[0.06] rounded-xl p-3 flex items-center gap-2">
              <p className="text-[10px] text-zinc-400 truncate flex-1 font-mono">{manageUrl}</p>
              <button
                onClick={handleCopyLink}
                className="shrink-0 w-8 h-8 rounded-lg bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059]"
                aria-label="Copiar link"
              >
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={handleShareWhatsApp}
              className="w-full h-11 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center gap-2"
            >
              <ExternalLink size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Enviar no WhatsApp
              </span>
            </button>
          </div>
        )}

        {/* Notification */}
        {notifStatus !== 'unsupported' && (
          <div className="w-full space-y-3">
            {notifStatus === 'granted' ? (
              <div className="flex items-center justify-center gap-2 text-[12px] text-emerald-400">
                <Bell size={14} />
                <span>Você receberá uma notificação 30 min antes!</span>
              </div>
            ) : notifStatus === 'denied' ? (
              <p className="text-[11px] text-zinc-600 text-center">
                Notificações bloqueadas. Ative nas configurações do navegador.
              </p>
            ) : (
              <button
                onClick={handleActivateNotification}
                disabled={activating}
                className="flex items-center gap-2 text-[12px] text-zinc-500 hover:text-[#C5A059] transition-colors cursor-pointer mx-auto disabled:opacity-50"
              >
                <BellOff size={14} />
                <span>{activating ? 'Ativando...' : 'Ativar notificação para ser lembrado'}</span>
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-[11px] text-[#C5A059] hover:text-[#A68233] transition-colors cursor-pointer"
        >
          <ExternalLink size={12} />
          <span>Voltar ao início</span>
        </button>
      </div>
    </div>
  );
};

export default SuccessStep;
