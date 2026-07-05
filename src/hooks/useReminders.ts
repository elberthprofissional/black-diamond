import { useState, useCallback } from 'react';
import { useToast } from './useToast';

const TEMPLATES_KEY = 'barber_reminder_templates_v2';
const SENT_KEY = 'barber_reminders_sent';

const DEFAULT_TEMPLATES = (siteUrl: string) => [
  `E aí! Beleza? 💈 Passando para lembrar de garantir seu horário para essa semana no Black Diamond. Não deixe para a última hora!\n\n${siteUrl}`,
  `Fala! O fim de semana está chegando e a agenda está lotando. 💈 Bora dar aquele trato no visual para o fim de semana? Garanta seu horário!\n\n${siteUrl}`,
  `Olá! Tudo bem? Passando para lembrar de agendar seu horário conosco esta semana no Black Diamond! 💈\n\n${siteUrl}`,
];

export function useReminders() {
  const { showSuccess } = useToast();

  const [remindersSent, setRemindersSent] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(SENT_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [templates, setTemplates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(TEMPLATES_KEY);
      if (saved) return JSON.parse(saved);
      const siteUrl = window.location.origin + '/agendar';
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES(siteUrl)));
      return DEFAULT_TEMPLATES(siteUrl);
    } catch { return []; }
  });

  const markReminderSent = useCallback((clientId: string) => {
    setRemindersSent((prev) => {
      const updated = { ...prev, [clientId]: new Date().toISOString() };
      localStorage.setItem(SENT_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isReminderRecent = useCallback((clientId: string): boolean => {
    const lastSent = remindersSent[clientId];
    if (!lastSent) return false;
    return Date.now() - new Date(lastSent).getTime() < 7 * 24 * 60 * 60 * 1000;
  }, [remindersSent]);

  const sendWithTemplate = useCallback((phone: string, template: string, clientId: string) => {
    if (!phone) return;
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
      formattedPhone = '55' + formattedPhone;
    }
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(template)}`, '_blank');
    markReminderSent(clientId);
  }, [markReminderSent]);

  const handleDeleteTemplate = useCallback((indexToDelete: number) => {
    setTemplates((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToDelete);
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
      return updated;
    });
    showSuccess('Modelo de lembrete excluído!');
  }, [showSuccess]);

  const handleSaveTemplate = useCallback((text: string) => {
    setTemplates((prev) => {
      const updated = [text, ...prev];
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
      return updated;
    });
    showSuccess('Lembrete salvo nos modelos!');
  }, [showSuccess]);

  return {
    remindersSent, templates,
    isReminderRecent, markReminderSent,
    sendWithTemplate, handleDeleteTemplate, handleSaveTemplate,
  };
}
