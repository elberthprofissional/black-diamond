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

      {/* DRAWER REMINDER PREVIEW */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[250] flex justify-end flex-col sm:flex-row">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsOpen(false)} 
              className="absolute inset-0 bg-black/75 backdrop-blur-sm" 
            />
            {/* Drawer Panel */}
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }} 
              transition={{ type: 'spring', damping: 30, stiffness: 300 }} 
              className="relative w-full sm:w-[440px] h-[100dvh] sm:h-full mt-auto sm:mt-0 bg-[#0E0E0E] border-t sm:border-t-0 sm:border-l border-[#C5A059]/20 shadow-2xl overflow-y-auto scrollbar-hide flex flex-col text-white"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-6 py-5 flex items-center justify-between border-b border-white/[0.04] shrink-0">
                <div className="text-left">
                  <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em] block">
                    Ferramenta de Lembrete
                  </span>
                  <p className="text-sm font-semibold text-zinc-100 mt-1">Agendamento de {clientName}</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-grow overflow-y-auto p-6 bg-[#0E0E0E]">
                <div className="w-full space-y-6 text-left">
                  {/* Info Row */}
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Horário:</span>
                      <strong className="text-white">{time}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Valor Total:</span>
                      <strong className="text-[#C5A059] uppercase">
                        R$ {Number(booking.total_price || 0).toFixed(0)}
                      </strong>
                    </div>
                  </div>

                  {/* Templates Accordion */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Escolha um Modelo</span>
                    
                    {templates.map((t) => {
                      const isExpanded = selectedTemplateId === t.id;
                      return (
                        <div 
                          key={t.id}
                          onClick={() => handleTemplateChange(t.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                            isExpanded 
                              ? 'bg-white/[0.04] border-white/20 shadow-lg' 
                              : 'bg-white/[0.01] border-white/[0.04] hover:border-white/10 hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isExpanded ? 'text-[#C5A059]' : 'text-zinc-500'}`}>
                              {t.title}
                            </span>
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                              isExpanded ? 'border-[#C5A059] bg-[#C5A059]' : 'border-zinc-700 bg-transparent'
                            }`}>
                              {isExpanded && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                            </div>
                          </div>

                          <p className={`text-xs text-zinc-400 mt-2.5 leading-relaxed ${isExpanded ? '' : 'line-clamp-1'}`}>
                            {t.text}
                          </p>

                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-4" onClick={(e) => e.stopPropagation()}>
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Editar Mensagem</span>
                                <textarea
                                  rows={4}
                                  value={messageText}
                                  onChange={(e) => setMessageText(e.target.value)}
                                  className="w-full bg-black/40 border border-white/[0.06] rounded-xl p-3.5 text-xs text-zinc-200 outline-none focus:border-[#C5A059]/30 transition-all resize-none leading-relaxed"
                                />
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleCopy}
                                  className="flex-1 py-3 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-zinc-300 font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                  {copied ? 'Copiado!' : 'Copiar Texto'}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSend}
                                  className="flex-1 py-3 bg-[#C5A059] text-black font-bold text-[9px] uppercase tracking-wider rounded-xl hover:bg-[#A68233] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                  Enviar no WhatsApp
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
