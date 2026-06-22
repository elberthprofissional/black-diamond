import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BookingWithClient } from '../../../types';

interface WhatsAppReminderButtonProps {
  booking: BookingWithClient;
  className?: string;
  showLabel?: boolean;
  label?: string;
  iconType?: 'whatsapp' | 'bell';
}

const WhatsAppReminderButton: React.FC<WhatsAppReminderButtonProps> = ({ 
  booking, 
  className = '',
  showLabel = false,
  label = 'WhatsApp',
  iconType = 'whatsapp'
}) => {
  const storageKey = `barber_reminder_sent_${booking.id}`;

  const [isOpen, setIsOpen] = useState(false);
  const [reminderSent, setReminderSent] = useState(() => localStorage.getItem(storageKey) === 'true');
  const [copied, setCopied] = useState(false);

  const clientName = booking.clients?.name || 'Cliente';
  const firstName = clientName.split(' ')[0];
  const time = booking.booking_time?.slice(0, 5) || '00:00';

  // Templates
  const templates = [
    {
      id: 'confirm',
      title: 'Lembrete de Confirmação',
      text: `Fala, ${firstName}! Beleza? Passando para lembrar do seu horário às ${time} hoje no Black Diamond. Confirmado? 💈`
    },
    {
      id: 'delay',
      title: 'Alerta de Atraso',
      text: `Fala, ${firstName}! Beleza? Notei que você está um pouco atrasado para o seu horário das ${time}. Está tudo bem? 💈`
    },
    {
      id: 'thanks',
      title: 'Agradecimento pós-corte',
      text: `Fala, ${firstName}! Obrigado pela preferência hoje no Black Diamond. Espero que tenha gostado do corte! Até a próxima! 💈`
    }
  ];

  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [messageText, setMessageText] = useState(templates[0].text);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      setMessageText(tmpl.text);
    }
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
    // Reinicia o texto para o template atual quando abre
    const tmpl = templates.find(t => t.id === selectedTemplateId);
    if (tmpl) setMessageText(tmpl.text);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!booking.clients?.phone) return;

    let phone = booking.clients.phone.replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) {
      phone = '55' + phone;
    }

    localStorage.setItem(storageKey, 'true');
    setReminderSent(true);
    setIsOpen(false);

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`, '_blank');
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`${className} flex items-center gap-1.5 relative`}
        title="Enviar lembrete de WhatsApp"
      >
        <div className="relative flex items-center justify-center">
          {iconType === 'bell' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="stroke-zinc-400 group-hover:stroke-white mr-0.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          )}
          {reminderSent && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border border-[#0A0A0A] shadow-[0_0_4px_rgba(16,185,129,0.5)]" title="Lembrete enviado" />
          )}
        </div>
        {showLabel && <span>{label}</span>}
      </button>

      {/* MODAL REMINDER PREVIEW */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative z-10 w-full sm:w-[400px] bg-[#161618] border border-white/5 sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em] block">Ferramenta de Lembrete</span>
                  <h3 className="text-sm font-bold text-white mt-1">Enviar para {clientName}</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 text-left">
                {/* Selector */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Modelo de Mensagem</label>
                  <div className="grid grid-cols-3 gap-2">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTemplateChange(t.id)}
                        className={`py-2 px-1 text-[9px] font-black uppercase tracking-wider rounded-lg border text-center transition-all cursor-pointer ${
                          selectedTemplateId === t.id
                            ? 'border-[#C5A059] bg-[#C5A059]/5 text-[#C5A059]'
                            : 'border-white/5 bg-white/[0.02] text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {t.id === 'confirm' ? 'Confirmar' : t.id === 'delay' ? 'Atraso' : 'Obrigado'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Edit Message Area */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Visualização da Mensagem</label>
                  <textarea
                    rows={4}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full bg-[#1e1e21] border border-white/5 rounded-xl p-3 text-xs text-zinc-200 outline-none focus:border-[#C5A059]/30 transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-1 py-3 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-zinc-300 font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {copied ? 'Copiado!' : 'Copiar Texto'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      className="flex-1 py-3 bg-[#C5A059] text-black font-bold text-[9px] uppercase tracking-wider rounded-xl hover:bg-[#A68233] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      Enviar no Whats
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WhatsAppReminderButton;
